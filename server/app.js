const express = require('express');
const http = require('node:http');
const { Server } = require('socket.io');
const connectDatabase = require('./db');
const Chat = require('./models/Chat');
const Room = require('./models/Room');
const { createRoomSession, verifyRoomSession } = require('./roomSession');
const bcrypt = require('bcrypt');
const cors = require('cors');

const port = Number(process.env.PORT || 3002);
const frontendOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:4173')
    .split(',').map(origin => origin.trim());
const corsOptions = { origin: frontendOrigins, methods: ['GET', 'POST'] };

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });
const roomUsers = new Map();
const roomCleanupTimers = new Map();
const roomOperations = new Map();
const ROOM_GRACE_PERIOD_MS = 60_000;

function roomChannel(room) {
    return 'room:' + room;
}

// Order writes and joins with cleanup for a given room name.
function runInRoom(room, operation) {
    const pending = (roomOperations.get(room) || Promise.resolve()).then(operation);
    const tail = pending.catch(() => {});
    roomOperations.set(room, tail);
    return pending.finally(() => {
        if (roomOperations.get(room) === tail) roomOperations.delete(room);
    });
}

function cancelRoomCleanup(room) {
    clearTimeout(roomCleanupTimers.get(room));
    roomCleanupTimers.delete(room);
}

function scheduleRoomCleanup(room) {
    cancelRoomCleanup(room);
    const timer = setTimeout(() => {
        runInRoom(room, async () => {
            if (roomCleanupTimers.get(room) !== timer) return;
            roomCleanupTimers.delete(room);
            if (roomUsers.get(room)?.size) return;

            await Chat.deleteMany({ room });
            await Room.deleteOne({ name: room });
            roomUsers.delete(room);
            console.log('Cleaned up empty room:', room);
        }).catch(err => {
            console.error('Error cleaning up room:', err);
            if (!roomUsers.get(room)?.size && !roomCleanupTimers.has(room)) {
                scheduleRoomCleanup(room);
            }
        });
    }, ROOM_GRACE_PERIOD_MS);
    roomCleanupTimers.set(room, timer);
}

function broadcastRoomUsers(room) {
    const users = Array.from(roomUsers.get(room) || []);
    const userList = users.map(id => io.sockets.sockets.get(id)?.data.username).filter(Boolean);
    io.to(roomChannel(room)).emit('roomUsers', userList);
}

function systemMessage(room, message) {
    return { username: 'System', message, avatar: '', room, timestamp: new Date() };
}

function validText(value) {
    return typeof value === 'string' && Boolean(value.trim());
}

function validCredentials(name, password, username) {
    return validText(name) && validText(password) && Buffer.byteLength(password) <= 72 &&
        (username === undefined || validText(username));
}

app.post('/api/rooms/create', async (req, res) => {
    const { name, password, username } = req.body || {};
    if (!validCredentials(name, password, username)) {
        return res.status(400).json({ error: 'Enter a room name and a password of at most 72 bytes.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const room = await runInRoom(name, () => Room.create({ name, password: hashedPassword }));
        res.json({ success: true, room: room.name, token: username && createRoomSession(room, username) });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: 'Room already exists.' });
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

app.post('/api/rooms/join', async (req, res) => {
    const { name, password, username } = req.body || {};
    if (!validCredentials(name, password, username)) {
        return res.status(400).json({ error: 'Enter a room name and a password of at most 72 bytes.' });
    }

    try {
        const result = await runInRoom(name, async () => {
            const room = await Room.findOne({ name });
            if (!room) return { status: 404, body: { error: 'Room not found.' } };
            if (!(await bcrypt.compare(password, room.password))) {
                return { status: 401, body: { error: 'Incorrect password.' } };
            }
            return { status: 200, body: { success: true, token: username && createRoomSession(room, username) } };
        });
        res.status(result.status).json(result.body);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

io.on('connection', socket => {
    socket.on('joinRoom', async payload => {
        const { room, token, password, username } = payload || {};
        if (!validText(room) || socket.data.room || socket.data.joining) return;
        socket.data.joining = true;

        try {
            await runInRoom(room, async () => {
                if (!socket.connected) return;
                const foundRoom = await Room.findOne({ name: room });
                if (!foundRoom) return socket.emit('joinError', 'Room not found.');

                let authorizedUser;
                if (typeof token === 'string') {
                    authorizedUser = verifyRoomSession(token, foundRoom);
                    if (!authorizedUser) return socket.emit('joinError', 'Your room session has expired or is invalid. Please join again.');
                } else {
                    if (!validCredentials(room, password, username) || !validText(username) ||
                        !(await bcrypt.compare(password, foundRoom.password))) {
                        return socket.emit('joinError', 'Incorrect password.');
                    }
                    authorizedUser = username;
                }

                const history = await Chat.find({ room }).sort({ timestamp: 1, _id: 1 }).exec();
                if (!socket.connected) return;

                cancelRoomCleanup(room);
                if (!roomUsers.has(room)) roomUsers.set(room, new Set());
                roomUsers.get(room).add(socket.id);
                socket.data.room = room;
                socket.data.username = authorizedUser;
                socket.join(roomChannel(room));

                socket.emit('chat', history);
                socket.to(roomChannel(room)).emit('message', systemMessage(room, authorizedUser + ' has joined the room.'));
                broadcastRoomUsers(room);
            });
        } catch (err) {
            console.error(err);
            socket.emit('joinError', 'Server error.');
        } finally {
            socket.data.joining = false;
        }
    });

    socket.on('newMessage', async msg => {
        const { room, username } = socket.data;
        if (!room || !validText(msg?.message)) return;

        try {
            await runInRoom(room, async () => {
                const message = await Chat.create({
                    username,
                    message: msg.message,
                    avatar: typeof msg.avatar === 'string' ? msg.avatar : '',
                    room,
                });
                io.to(roomChannel(room)).emit('message', message);
            });
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('disconnecting', () => {
        const { room, username } = socket.data;
        const users = roomUsers.get(room);
        if (!users) return;

        users.delete(socket.id);
        if (users.size === 0) scheduleRoomCleanup(room);
        socket.to(roomChannel(room)).emit('message', systemMessage(room, username + ' has left the room.'));
        broadcastRoomUsers(room);
    });
});

async function start() {
    await connectDatabase();
    await Room.init();
    server.listen(port, () => console.log('Web-Chat listening on port', server.address().port));
}

start().catch(err => {
    console.error('Could not start Web-Chat:', err.message);
    process.exit(1);
});

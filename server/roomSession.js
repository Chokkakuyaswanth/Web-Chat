const { createHmac, randomBytes, timingSafeEqual } = require('node:crypto');

const secret = process.env.ROOM_SESSION_SECRET || randomBytes(32);
const lifetimeMs = 60 * 60 * 1000;

function sign(payload) {
    return createHmac('sha256', secret).update(payload).digest();
}

function createRoomSession(room, username) {
    const payload = Buffer.from(JSON.stringify({
        roomId: String(room._id),
        username,
        expiresAt: Date.now() + lifetimeMs,
    })).toString('base64url');
    return payload + '.' + sign(payload).toString('base64url');
}

function verifyRoomSession(token, room) {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

    const [payload, signature] = parts;
    const actual = Buffer.from(signature, 'base64url');
    const expected = sign(payload);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (session.roomId !== String(room._id) || session.expiresAt <= Date.now()) return null;
    return session.username;
}

module.exports = { createRoomSession, verifyRoomSession };

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Store hashed password for security
    createdAt: { type: Date, default: Date.now }
});

const Room = mongoose.model('room', roomSchema);
module.exports = Room;
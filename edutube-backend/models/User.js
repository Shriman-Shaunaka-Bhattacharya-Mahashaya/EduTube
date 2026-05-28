// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['educator', 'student'], required: true },
    subscriptions: [{ type: String, default: [] }], // NEW FIELD
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
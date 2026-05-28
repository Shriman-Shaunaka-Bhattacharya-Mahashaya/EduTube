// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['educator', 'student'], required: true },
    subscriptions: [{ type: String, default: [] }], 
    subscriberCount: { type: Number, default: 0 }, 
    interests: [{ type: String, default: [] }], 
    // NEW FIELD: Storing both ID and Name to prevent expensive lookup queries
    savedMedia: [{ 
        mediaId: { type: String, required: true },
        name: { type: String, required: true }
    }], 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
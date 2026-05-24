// models/Media.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    name: { type: String, required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    authorName: { type: String, required: true },
    authorId: { type: String, required: true },
    upvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: String, default: [] }], // NEW FIELD
    tags: [{ type: String }],
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Media', mediaSchema);
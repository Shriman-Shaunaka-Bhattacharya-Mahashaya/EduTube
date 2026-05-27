// models/Media.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    name: { type: String, required: true },
    fileUrl: { type: String, required: true },  // The Cloudinary CDN URL
    publicId: { type: String, required: true }, // Cloudinary's internal ID (needed if we ever want to delete the file)
    mimetype: { type: String, required: true },
    authorName: { type: String, required: true },
    authorId: { type: String, required: true },
    upvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: String, default: [] }],
    tags: [{ type: String }],
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Media', mediaSchema);
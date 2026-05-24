// routes/media.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Media = require('../models/Media');

// Configure Multer for local storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage });

// 1. Educator: Upload Media
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { name, authorName, authorId, tags } = req.body;
        
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // tags might come as a comma-separated string from form-data
        const tagArray = tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : [];

        const newMedia = new Media({
            name,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            authorName,
            authorId,
            tags: tagArray
        });

        await newMedia.save();
        res.status(201).json(newMedia);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// 2. Student: Search by Tags
router.get('/search', async (req, res) => {
    try {
        const { tag } = req.query;
        let query = {};
        if (tag) {
            query.tags = tag.toLowerCase(); // Exact match as requested
        }
        
        const media = await Media.find(query).sort({ timestamp: -1 });
        res.json(media);
    } catch (err) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// 3. Student: Stream Video
router.get('/stream/:id', async (req, res) => {
    try {
        const media = await Media.findById(req.params.id);
        if (!media) return res.status(404).json({ error: 'Media not found' });

        const videoPath = path.join(__dirname, '../uploads', media.filename);
        if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'File missing on server' });

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': media.mimetype,
            };
            res.writeHead(206, head); // 206 Partial Content
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': media.mimetype,
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (err) {
        res.status(500).json({ error: 'Streaming error' });
    }
});

// 4. Student: Toggle Upvote Media
router.put('/upvote/:id', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID is required' });

        const media = await Media.findById(req.params.id);
        if (!media) return res.status(404).json({ error: 'Media not found' });

        // Defensive check for older media uploaded before we added the array
        const upvotedByArray = media.upvotedBy || [];
        const hasUpvoted = upvotedByArray.includes(userId);

        if (hasUpvoted) {
            // They already upvoted, so remove them (toggle off)
            media.upvotedBy = upvotedByArray.filter(id => id !== userId);
            media.upvotes = Math.max(0, media.upvotes - 1); 
        } else {
            // Add their upvote (toggle on)
            media.upvotedBy.push(userId);
            media.upvotes += 1;
        }

        await media.save();
        res.json(media);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Upvote failed' });
    }
});

// 5. Educator: Get own uploaded media
router.get('/educator/:authorId', async (req, res) => {
    try {
        const { authorId } = req.params;
        // Find media matching the ID and sort newest first
        const media = await Media.find({ authorId }).sort({ timestamp: -1 });
        res.json(media);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch educator media' });
    }
});

module.exports = router;
// routes/media.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Media = require('../models/Media');
const auth = require('../middleware/auth');

// Configure Cloudinary Credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer to push directly to Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'edutube_media', // A folder will be created in your Cloudinary account
        resource_type: 'auto'    // CRITICAL: 'auto' allows videos and PDFs. Default only allows images.
    }
});
// Define the allowed file types
const allowedTypes = ['video/mp4', 'application/pdf', 'image/jpeg', 'image/png', 'text/plain'];

const upload = multer({ 
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB limit
    },
    fileFilter: (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true); // Accept the file
        } else {
            cb(new Error('Invalid file type. Only MP4, PDF, JPEG, PNG, and TXT are allowed.'), false); // Reject the file
        }
    }
});

// 1. Educator: Upload Media to Cloud (Secured)
router.post('/upload', auth, (req, res) => {
    // Execute the multer middleware manually to catch its specific errors
    upload.single('file')(req, res, async (err) => {
        if (err) {
            // Handle Multer limits and custom file type errors
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'File is too large. Maximum size is 50MB.' });
            }
            return res.status(400).json({ error: err.message });
        }

        try {
            const { name, authorName, authorId, tags } = req.body;
            
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

            const tagArray = tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : [];

            const newMedia = new Media({
                name,
                fileUrl: req.file.path,
                publicId: req.file.filename, 
                mimetype: req.file.mimetype,
                authorName,
                authorId,
                tags: tagArray
            });

            await newMedia.save();
            res.status(201).json(newMedia);
        } catch (serverErr) {
            console.error(serverErr);
            res.status(500).json({ error: 'Database or server error during upload' });
        }
    });
});

// 2. Student: Flexible Search (Tag or Author)
router.get('/search', async (req, res) => {
    try {
        const { tag, author } = req.query;
        let query = {};
        
        if (tag) {
            query.tags = tag.toLowerCase(); // Exact match for tags
        }
        
        if (author) {
            // Case-insensitive partial match on either authorName or authorId
            query.$or = [
                { authorName: { $regex: author, $options: 'i' } },
                { authorId: { $regex: author, $options: 'i' } }
            ];
        }
        
        const media = await Media.find(query).sort({ timestamp: -1 });
        res.json(media);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// 3. Student: Stream Video
// router.get('/stream/:id', async (req, res) => {
//     try {
//         const media = await Media.findById(req.params.id);
//         if (!media) return res.status(404).json({ error: 'Media not found' });

//         const videoPath = path.join(__dirname, '../uploads', media.filename);
//         if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'File missing on server' });

//         const stat = fs.statSync(videoPath);
//         const fileSize = stat.size;
//         const range = req.headers.range;

//         if (range) {
//             const parts = range.replace(/bytes=/, "").split("-");
//             const start = parseInt(parts[0], 10);
//             const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
//             const chunksize = (end - start) + 1;
//             const file = fs.createReadStream(videoPath, { start, end });
            
//             const head = {
//                 'Content-Range': `bytes ${start}-${end}/${fileSize}`,
//                 'Accept-Ranges': 'bytes',
//                 'Content-Length': chunksize,
//                 'Content-Type': media.mimetype,
//             };
//             res.writeHead(206, head); // 206 Partial Content
//             file.pipe(res);
//         } else {
//             const head = {
//                 'Content-Length': fileSize,
//                 'Content-Type': media.mimetype,
//             };
//             res.writeHead(200, head);
//             fs.createReadStream(videoPath).pipe(res);
//         }
//     } catch (err) {
//         res.status(500).json({ error: 'Streaming error' });
//     }
// });

// 4. Student: Toggle Upvote Media
router.put('/upvote/:id', auth, async (req, res) => {
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
router.get('/educator/:authorId', auth, async (req, res) => {
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
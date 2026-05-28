// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// 1. Register User
router.post('/register', async (req, res) => {
    const { userId, password, role } = req.body;
    if (!userId || !password || !role) return res.status(400).json({ error: 'All fields required' });

    try {
        let user = await User.findOne({ userId });
        if (user) return res.status(400).json({ error: 'User ID already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ userId, password: hashedPassword, role });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. Login User
router.post('/login', async (req, res) => {
    const { userId, password } = req.body;
    if (!userId || !password) return res.status(400).json({ error: 'All fields required' });

    try {
        const user = await User.findOne({ userId });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        // Create JWT Payload
        const payload = {
            id: user._id,
            userId: user.userId,
            role: user.role
        };

        // Sign Token (expires in 10 hours)
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10h' });

        // Send token and basic user data back to frontend
        res.json({ token, user: { userId: user.userId, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Get Student Subscriptions
router.get('/subscriptions', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user.subscriptions);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 4. Toggle Subscription to Educator (Upgraded for Dual-Write)
router.put('/subscribe', auth, async (req, res) => {
    try {
        const { educatorId } = req.body;
        if (!educatorId) return res.status(400).json({ error: 'Educator ID required' });

        const student = await User.findById(req.user.id);
        
        if (student.role !== 'student') {
            return res.status(403).json({ error: 'Only students can subscribe' });
        }

        // Verify the educator actually exists
        const educator = await User.findOne({ userId: educatorId, role: 'educator' });
        if (!educator) return res.status(404).json({ error: 'Educator not found' });

        const index = student.subscriptions.indexOf(educatorId);
        
        if (index === -1) {
            // Subscribe: Add to student's array, Increment educator's count
            student.subscriptions.push(educatorId);
            educator.subscriberCount += 1;
        } else {
            // Unsubscribe: Remove from student's array, Decrement educator's count
            student.subscriptions.splice(index, 1);
            educator.subscriberCount = Math.max(0, educator.subscriberCount - 1); // Prevent negative numbers
        }

        // Save both documents
        await student.save();
        await educator.save();

        res.json(student.subscriptions); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Subscription failed' });
    }
});

// 5. Get Current User Profile (Used by Educator Dashboard)
router.get('/me', auth, async (req, res) => {
    try {
        // Find user and exclude the password hash from the response
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 6. Get Student Interests
router.get('/interests', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user.interests || []);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 7. Toggle Interest (Saved Topic)
router.put('/interest', auth, async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) return res.status(400).json({ error: 'Topic required' });

        const user = await User.findById(req.user.id);
        
        if (user.role !== 'student') {
            return res.status(403).json({ error: 'Only students can save interests' });
        }

        const normalizedTopic = topic.trim().toLowerCase();
        const index = user.interests.indexOf(normalizedTopic);
        
        if (index === -1) {
            user.interests.push(normalizedTopic); // Save it
        } else {
            user.interests.splice(index, 1); // Remove it
        }

        await user.save();
        res.json(user.interests); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to toggle interest' });
    }
});

// 8. Get Saved Media
router.get('/saved-media', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user.savedMedia || []);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 9. Toggle Saved Media (Bookmark)
router.put('/saved-media', auth, async (req, res) => {
    try {
        const { mediaId, name } = req.body;
        if (!mediaId || !name) return res.status(400).json({ error: 'Media ID and Name required' });

        const user = await User.findById(req.user.id);
        
        if (user.role !== 'student') {
            return res.status(403).json({ error: 'Only students can save media' });
        }

        // Check if the mediaId already exists in the array
        const index = user.savedMedia.findIndex(m => m.mediaId === mediaId);
        
        if (index === -1) {
            user.savedMedia.push({ mediaId, name }); // Save it
        } else {
            user.savedMedia.splice(index, 1); // Remove it
        }

        await user.save();
        res.json(user.savedMedia); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to toggle saved media' });
    }
});

module.exports = router;
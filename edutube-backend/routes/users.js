// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login or Create User
router.post('/login', async (req, res) => {
    const { userId, role } = req.body;
    
    if (!userId || !role) {
        return res.status(400).json({ error: 'User ID and role are required' });
    }

    try {
        let user = await User.findOne({ userId });
        
        if (!user) {
            // Create new profile if it doesn't exist
            user = new User({ userId, role });
            await user.save();
        } else if (user.role !== role) {
            return res.status(403).json({ error: 'Role mismatch. This ID is registered under a different role.' });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
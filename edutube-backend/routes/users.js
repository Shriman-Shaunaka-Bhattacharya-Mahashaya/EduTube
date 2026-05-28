// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = router;
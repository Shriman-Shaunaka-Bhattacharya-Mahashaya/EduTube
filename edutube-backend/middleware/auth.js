// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Look for the token in the headers: "Authorization: Bearer "
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'No token, authorization denied' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Malformed token' });

    try {
        // Verify the token using your secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach the decoded payload (id, role, etc.) to the request object
        next(); // Pass control to the next function
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};
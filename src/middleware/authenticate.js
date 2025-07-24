// middleware/authenticate.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET; // Make sure this is defined in your .env file

module.exports = function authenticate(req, res, next) {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, result: 'Missing or malformed Authorization header' });
    }

    const token = header.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, role, etc. }
        next();
    } catch (err) {
        console.error('JWT auth error:', err);
        return res.status(401).json({ success: false, result: 'Invalid or expired token' });
    }
};

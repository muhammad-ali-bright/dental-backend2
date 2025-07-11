const express = require('express');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken'); // Import the middleware
const router = express.Router();

router.get('/dashboard', verifyFirebaseToken, (req, res) => {
  const userRole = req.user.role; // Access the role from the decoded token

  if (userRole === 'professor') {
    return res.json({ message: 'Welcome, Professor!' });
  }

  if (userRole === 'student') {
    return res.json({ message: 'Welcome, Student!' });
  }

  return res.status(403).json({ error: 'Access denied' });
});

module.exports = router;

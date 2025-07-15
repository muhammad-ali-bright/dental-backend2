const express = require('express');
const authenticate = require('../middleware/authenticate');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// POST /register
router.post('/register', authenticate, authController.register);

module.exports = router;

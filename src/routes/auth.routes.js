const express = require('express');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// POST /register
router.post('/register', authController.register);
router.post("/login", authController.login);

module.exports = router;

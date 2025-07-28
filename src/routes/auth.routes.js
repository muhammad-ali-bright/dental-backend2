const express = require('express');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// POST /register
router.post('/register', authController.register);
router.post("/login", authController.login);
router.post("/google-login", authController.googleLogin);
router.post("/complete-google-registration", authController.completeGoogleRegistration);

module.exports = router;

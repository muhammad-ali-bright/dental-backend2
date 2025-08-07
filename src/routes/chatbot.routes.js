const express = require('express');
const chatbotController = require('../controllers/chatbot.controller');

const router = express.Router();

// POST /register
router.post("/", chatbotController.generateMessage);

module.exports = router;

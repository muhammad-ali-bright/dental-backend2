// controllers/auth.controller.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const prisma = require('../prisma/client')

exports.login = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email }  // ✅ Correct usage
    });

    if (!user) {
      return res.status(200).json({ success: false, result: 'Incorrect email or password. Please try again.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    // Password check logic goes here if you are storing password hashes
    return res.status(200).json({ success: true, result: { token, user } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, result: 'Internal server error' });
  }
};


exports.register = async (req, res) => {
  const { role, name, email } = req.body;

  try {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(201).json({ success: false, result: 'User already exists' });
    }

    // 2. Create user
    const newUser = await prisma.user.create({
      data: { email, role, name }
    });

    res.status(201).json({ success: true, result: newUser });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, result: 'interval server error' });
  }
};

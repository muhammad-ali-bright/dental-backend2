// controllers/auth.controller.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const admin = require("../utils/firebaseAdmin");
const prisma = require("../prisma/client");

const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

// 🎯 Issue JWT
function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
}

// 🔐 Google Login – Check if user exists
exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { email } = decoded;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // User exists in Firebase, but not in DB
      return res.status(200).json({
        success: true,
        alreadyExists: false,
        message: "User not found in DB",
      });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    return res.status(200).json({
      success: true,
      alreadyExists: true,
      result: { token, user },
    });

  } catch (error) {
    console.error("Google login error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid Firebase token",
    });
  }
};

// ✅ Google Registration – Create new user after Google login
exports.completeGoogleRegistration = async (req, res) => {
  const { idToken, role } = req.body;

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { email, name } = decoded;

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ success: false, result: "User already exists" });
    }

    const newUser = await prisma.user.create({
      data: { email, name, role },
    });

    const token = generateToken(newUser);
    return res.status(201).json({ success: true, result: { token, user: newUser } });
  } catch (error) {
    console.error("Complete Google registration error:", error);
    return res.status(500).json({ success: false, result: "Internal server error" });
  }
};

// 🧾 Register – Manual form registration
exports.register = async (req, res) => {
  const { role, name, email, password } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, result: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        role,
        password: hashedPassword,
      },
    });

    return res.status(201).json({ success: true, result: newUser });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ success: false, result: "Internal server error" });
  }
};

// 🔐 Email/password Login – if you still need it
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return res.status(201).json({ success: false, result: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(201).json({ success: false, result: "Invalid email or password" });
    }

    const token = generateToken(user);
    return res.status(200).json({ success: true, result: { token, user } });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, result: "Internal server error" });
  }
};

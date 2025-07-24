// src/routes/users.routes.js
const express = require('express')
const prisma = require('../prisma/client')
const authenticate = require('../middleware/authenticate')

const router = express.Router()

// GET /api/users/me
router.get('/me', authenticate ,async (req, res) => {
    try {
        const userId = req.user.id
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                name: true
            }
        })

        if (!user) {
            return res.status(401).json({ success: false, result: 'User not found' });
        }

        return res.status(201).json({success: true, result: user});
    } catch (err) {
        console.error('GET /users/me error:', err)
        return res.status(401).json({ success: false, result: 'Internal server error' });
    }
})

module.exports = router

// src/routes/users.routes.js
const express = require('express')
const prisma = require('../prisma/client')
const authenticate = require('../middleware/authenticate')

const router = express.Router()

// GET /api/users/me
router.get('/me', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid
        console.log("**********************************************")
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                // firstName: true,   // ← include firstName
                // lastName: true     // ← include lastName
            }
        })
        console.log("8888888888888888888888888888888888888888888")


        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        res.json(user)
    } catch (err) {
        console.error('GET /users/me error:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

module.exports = router

// controllers/auth.controller.js
const prisma = require('../prisma/client')
const admin = require('../../firebase/firebase')

exports.register = async (req, res) => {
  const { role, firstName, lastName } = req.body
  const { uid, email } = req.user || {}
  console.log('11111111111111111', { uid, email, role, firstName, lastName })

  if (!email || !uid) {
    return res.status(400).json({ error: 'Invalid user token' })
  }

  try {
    console.log('2222222222222222', uid, role)
    await admin.auth().setCustomUserClaims(uid, { role })
    console.log('3333333333333333', uid, role)

    const user = await prisma.user.create({
      data: { id: uid, email, role, firstName, lastName } // Password is not stored, as per the schema
    })

    console.log('4444444444444444', user)

    res.status(201).json({ message: 'User registered successfully!', user })
  } catch (err) {
    console.error('Registration error:', err)
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'User already exists' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
}

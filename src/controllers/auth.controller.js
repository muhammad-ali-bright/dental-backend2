// controllers/auth.controller.js
const prisma = require('../prisma/client')
const admin = require('../../firebase/firebase')

exports.register = async (req, res) => {
  const { role, firstName, lastName } = req.body
  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.split(' ')[1]

  try {
    const decoded = await admin.auth().verifyIdToken(idToken)
    const uid = decoded.uid

    // attach role claim
    await admin.auth().setCustomUserClaims(uid, { role })

    console.log(await prisma.user.findMany({
    }))

    // create the user record in your DB
    const user = await prisma.user.create({
      data: {
        id: uid,
        email: decoded.email,
        role,
        firstName,
        lastName
      }
    })

    res.status(201).json({ message: 'User registered successfully!', user })
  } catch (err) {
    console.error('Registration error:', err)
    res.status(500).json({ error: err.message })
  }
}

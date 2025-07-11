const prisma = require('../prisma/client');
const admin = require('../../firebase/firebase');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
    const { token } = req.body;

    try {
        // Step 1: Verify Firebase Token (async)
        const verifyTokenPromise = admin.auth().verifyIdToken(token);

        // Step 2: Query the user from DB (async)
        const userQueryPromise = verifyTokenPromise.then(decoded => {
            return prisma.user.findUnique({
                where: { id: decoded.uid },
                select: { id: true, email: true, role: true },
            });
        });

        // Step 3: Await both promises to resolve
        const [decoded, user] = await Promise.all([verifyTokenPromise, userQueryPromise]);

        if (!user) {
            return res.status(404).json({ error: 'User not found in DB' });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error('Error during token verification or DB query:', err);
        res.status(401).json({ error: 'Invalid token or user not found' });
    }
}

exports.register = async (req, res) => {
    const { email, password, role } = req.body;
  
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
      });
  
      // Wait for Firebase to propagate the user record (1-second delay)
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Set custom claims (role)
      await admin.auth().setCustomUserClaims(userRecord.uid, { role });
  
      // Save user data to Prisma DB
      await prisma.user.create({
        data: {
          id: userRecord.uid,
          email,
          password: hashedPassword,
          role,
        },
      });
  
      return res.status(200).json({ message: 'User registered successfully!' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  };
  
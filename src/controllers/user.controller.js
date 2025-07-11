const prisma = require('../prisma/client');

exports.getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
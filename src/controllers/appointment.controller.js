const prisma = require('../prisma/client');

exports.createAppointment = async (req, res) => {
  try {
    const { title, description, appointmentDate, patientId, status } = req.body;
    const studentId = req.user.user_id;

    const appointment = await prisma.appointment.create({
      data: {
        title,
        appointmentDate: new Date(appointmentDate),
        time: appointmentDate,
        description,
        status,
        patientId,
        studentId,
      },
    });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
    });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAppointmentsByStudentId = async (req, res) => {
  try {
    const { startIdx = 0, endIdx = 10, searchTerm, sort = 'asc' } = req.query;
    const studentId = req.user?.uid;

    const totalCount = await prisma.appointment.count({
      where: { studentId }
    });

    const where = {
      studentId,
      ...(searchTerm && {
        OR: [
          {
            title: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        ]
      })
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: {
        appointmentDate: sort.toLowerCase() === 'desc' ? 'desc' : 'asc'
      },
      skip: Number(startIdx),
      take: Number(endIdx) - Number(startIdx)
    });

    return res.status(200).json({ appointments, totalCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAppointment = async (req, res) => {
  // 1) Destructure out any fields you don’t want to write back
  const {
    id,                // drop this (we use req.params.id)
    appointmentDate,   // raw string from client, e.g. "2025-07-20"
    time,              // raw string from client, e.g. "14:30"
    ...rest            // everything else (title, description, status, patientId, studentId…)
  } = req.body;

  // 2) Build your data payload
  const data = {
    ...rest,
    // convert appointmentDate `"YYYY-MM-DD"` → JS Date
    appointmentDate: new Date(appointmentDate),
    // ensure time stays a string (e.g. "14:30")
    time: time,
  };

  try {
    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


exports.deleteAppointment = async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

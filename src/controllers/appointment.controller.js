const prisma = require('../prisma/client');

exports.createAppointment = async (req, res) => {
  try {
    const { title, date, time, notes, patientId, studentId } = req.body;
    const appointment = await prisma.appointment.create({
      data: {
        title,
        date: new Date(date),
        time,
        notes,
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
    const studentId = req.query.student_id;
    const appointments = await prisma.appointment.findMany({
      where: { studentId },
      include: { patient: true },
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err) {
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

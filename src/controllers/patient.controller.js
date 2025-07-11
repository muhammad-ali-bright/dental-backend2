const prisma = require('../prisma/client');

exports.createPatient = async (req, res) => {
  try {
    const { name, notes, email, contact } = req.body;

    const patient = await prisma.patient.create({
      data: { name, notes, email, contact },
    });

    // console.log(patient);
    return res.status(200).json(patient);
  } catch (err) {
    console.error('Error creating patient:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getPatients = async (req, res) => {
  try {
    const patients = await prisma.patient.findMany();
    return res.status(200).json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const updatePatient = await prisma.patient.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.status(200).json(updatePatient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    const response = await prisma.patient.delete({ where: { id: req.params.id } });
    return res.status(200).json({ deletePatient: response.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

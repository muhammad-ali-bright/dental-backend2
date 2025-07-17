const prisma = require('../prisma/client');

/**
 * Create a new patient for the authenticated student
 */
exports.createPatient = async (req, res) => {
  try {
    const studentId = req.user?.uid;
    const { name, notes, email, contact } = req.body;

    if (!name || !email || !contact) {
      return res.status(400).json({ error: 'Name, email, and contact are required.' });
    }

    const newPatient = await prisma.patient.create({
      data: {
        name,
        notes,
        email,
        contact,
        studentId,
      },
    });

    console.log('[Patient Created]', newPatient.id);
    return res.status(201).json(newPatient);
  } catch (error) {
    console.error('[Create Patient Error]', error);
    return res.status(500).json({ error: 'Failed to create patient.' });
  }
};

/**
 * Retrieve paginated and optionally filtered patients for the authenticated student
 */
exports.getPatients = async (req, res) => {
  try {
    const { startIdx = 0, endIdx = 10, searchTerm, sort = 'asc' } = req.query;
    const studentId = req.user?.uid;

    const whereClause = {
      studentId,
      ...(searchTerm && {
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      }),
    };

    const [patients, totalCount] = await Promise.all([
      prisma.patient.findMany({
        where: whereClause,
        orderBy: {
          name: sort.toLowerCase() === 'desc' ? 'desc' : 'asc',
        },
        skip: Number(startIdx),
        take: Number(endIdx) - Number(startIdx),
      }),
      prisma.patient.count({ where: { studentId } }),
    ]);

    return res.status(200).json({ patients, totalCount });
  } catch (error) {
    console.error('[Get Patients Error]', error);
    return res.status(500).json({ error: 'Failed to retrieve patients.' });
  }
};

/**
 * Fetch patient IDs and names for dropdowns/lists
 */
exports.getPatientNames = async (req, res) => {
  try {
    const studentId = req.user?.uid;

    const patientNames = await prisma.patient.findMany({
      where: { studentId },
      select: {
        id: true,
        name: true,
      },
    });

    return res.status(200).json(patientNames);
  } catch (error) {
    console.error('[Get Patient Names Error]', error);
    return res.status(500).json({ error: 'Failed to retrieve patient names.' });
  }
};

/**
 * Update an existing patient record by ID
 */
exports.updatePatient = async (req, res) => {
  try {
    const patientId = req.params.id;
    const updates = req.body;

    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: updates,
    });

    return res.status(200).json(updatedPatient);
  } catch (error) {
    console.error('[Update Patient Error]', error);
    return res.status(500).json({ error: 'Failed to update patient.' });
  }
};

/**
 * Delete a patient and their associated appointments
 */
exports.deletePatient = async (req, res) => {
  try {
    const studentId = req.user?.uid;
    const patientId = req.params.id;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.studentId !== studentId) {
      return res.status(403).json({ error: 'Unauthorized or patient not found.' });
    }

    const result = await prisma.$transaction([
      prisma.appointment.deleteMany({ where: { patientId } }),
      prisma.patient.delete({ where: { id: patientId } }),
    ]);

    return res.status(200).json({ message: 'Patient and appointments deleted successfully', result });
  } catch (error) {
    console.error('[Delete Patient Error]', error);
    return res.status(500).json({ error: 'Failed to delete patient.' });
  }
};

const prisma = require('../prisma/client');

// POST /patients
exports.createPatient = async (req, res) => {
  try {
    const {
      name,
      dob,
      email,
      contact,
      emergencyContact = null,
      healthInfo = '',
      address = ''
    } = req.body;

    // Validate required fields
    if (!name || !dob || !email || !contact) {
      return res.status(400).json({ error: 'Missing required fields: name, dob, email, or contact.' });
    }

    const payload = {
      name: name.trim(),
      dob: new Date(dob),
      email: email.trim().toLowerCase(),
      contact: contact.trim(),
      emergencyContact: emergencyContact?.trim() || null,
      healthInfo: healthInfo.trim(),
      address: address.trim(),
      userId: req.user.id,
    };

    const patient = await prisma.patient.create({ data: payload });

    return res.status(201).json(patient);
  } catch (err) {
    console.error('[createPatient]', err);
    return res.status(500).json({ error: 'Internal server error while creating patient.' });
  }
};

/**
 * Retrieve paginated and optionally filtered patients for the authenticated student
 */
exports.getPatients = async (req, res) => {
  try {
    const { startIdx = 0, endIdx = 10, searchTerm, sort } = req.query;
    const role = req.user?.role;
    const studentId = req.user?.uid;
    let sortField = null;
    switch (sort) {
      case "date":
        sortField = "createdAt";
        break;
      case "name":
        sortField = "name";
      default:
        break;
    }

    let whereClause = {};

    if (role === "Student") {
      whereClause = {
        studentId,
        ...(searchTerm && {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { contact: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ]
        }),
      };
    } else {
      whereClause = {
        ...(searchTerm && {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { contact: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ]
        }),
      };
    }

    const [patients, totalCount] = await Promise.all([
      prisma.patient.findMany({
        where: whereClause,
        orderBy: {
          [sortField]: 'asc',
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
    const role = req.user?.role;
    const studentId = req.user?.uid;

    let patientNames;
    if (role == "Student") {
      patientNames = await prisma.patient.findMany({
        where: { studentId },
        select: {
          id: true,
          name: true,
        },
      });
    } else {
      patientNames = await prisma.patient.findMany({
        select: {
          id: true,
          name: true,
        },
      });
    }

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

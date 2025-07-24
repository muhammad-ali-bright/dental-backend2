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
      studentId: req.user.id,
    };

    const patient = await prisma.patient.create({ data: payload });

    return res.status(201).json(patient);
  } catch (err) {
    console.error('[createPatient]', err);
    return res.status(500).json({ error: 'Internal server error while creating patient.' });
  }
};

// GET /patients
exports.getPatients = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || 'Student';
    // Parse and sanitize query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.trim() || '';
    const sort = ['name', 'createdAt'].includes(req.query.sort) ? req.query.sort : 'name';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';

    // Construct filter
    const where = {
      ...(userRole === 'Student' && { studentId: userId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { contact: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const skip = (page - 1) * limit;

    const [patients, totalCount] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { [sort]: order },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where }),
    ]);

    return res.status(200).json({ patients, totalCount });
  } catch (err) {
    console.error("Failed to fetch patients:", err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
};

/**
 * Fetch patient IDs and names for dropdowns/lists
 */
exports.getPatientNames = async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    const where = role === 'Student' ? { studentId: userId } : {};

    const patients = await prisma.patient.findMany({
      where,
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json(patients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patient names' });
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

// DELETE /patients/:id
exports.deletePatient = async (req, res) => {
  try {
    const patientId = req.params.id;
    const currentUserId = req.user?.id;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, studentId: true }, // Avoid fetching unnecessary data
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    if (patient.studentId !== currentUserId) {
      return res.status(403).json({ error: 'You are not authorized to delete this patient.' });
    }

    const result = await prisma.$transaction([
      prisma.Incident.deleteMany({ where: { patientId } }),
      prisma.patient.delete({ where: { id: patientId } }),
    ]);

    return res.status(200).json({
      message: 'Patient and appointments deleted successfully',
      result,
    });
  } catch (error) {
    console.error('[Delete Patient Error]', error);
    return res.status(500).json({ error: 'Failed to delete patient.' });
  }
};


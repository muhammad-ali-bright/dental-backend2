const prisma = require('../prisma/client');

// ⏰ Date parsing helper
function parseLocalDateTime(dateStr, timeStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const datetime = new Date(`${dateStr}T${timeStr}`);
  return isNaN(datetime.getTime()) ? null : datetime;
}

// Utility: fetch dropdown-friendly patient names
const fetchPatientNames = async (user) => {
  const { id: userId, role } = user;
  const where = role === 'Student' ? { studentId: userId } : {};
  return await prisma.patient.findMany({
    where,
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
};

// GET /patients
exports.getPatients = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || 'Student';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.trim() || '';
    const sort = ['name', 'createdAt'].includes(req.query.sort) ? req.query.sort : 'name';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';
    const skip = (page - 1) * limit;

    let baseWhere = {};
    if (userRole === 'Student') {
      baseWhere.studentId = userId;
    }

    if (search) {
      baseWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
      ];
    }

    const today = new Date();
    const age18 = new Date(today);
    age18.setFullYear(age18.getFullYear() - 18);
    const age65 = new Date(today);
    age65.setFullYear(age65.getFullYear() - 65);

    const [patients, totalCount, childrenCount, adultCount, seniorCount] = await Promise.all([
      prisma.patient.findMany({
        where: baseWhere,
        orderBy: { [sort]: order },
        skip,
        take: limit,
        ...(userRole !== "Student" && {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        }),
      }),
      prisma.patient.count({ where: baseWhere }),
      prisma.patient.count({ where: { ...baseWhere, dob: { gte: age18 } } }),
      prisma.patient.count({ where: { ...baseWhere, dob: { lt: age18, gte: age65 } } }),
      prisma.patient.count({ where: { ...baseWhere, dob: { lt: age65 } } }),
    ]);

    return res.status(200).json({
      patients,
      totalCount,
      childrenCount,
      adultCount,
      seniorCount,
    });
  } catch (err) {
    console.error("Failed to fetch patients:", err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
};

// GET /patients/:id
exports.getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid patient ID' });
    }

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    return res.status(200).json(patient);
  } catch (error) {
    console.error('Error fetching patient by ID:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /patients/names
exports.getPatientNames = async (req, res) => {
  try {
    const patients = await fetchPatientNames(req.user);
    res.status(200).json(patients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patient names' });
  }
};

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

    if (!name || !dob || !email || !contact) {
      return res.status(400).json({ error: 'Missing required fields: name, dob, email, or contact.' });
    }

    const parsedDob = parseLocalDateTime(dob, '00:00');
    if (!parsedDob) {
      return res.status(400).json({ error: 'Invalid date of birth format.' });
    }

    const payload = {
      name: name.trim(),
      dob: parsedDob,
      email: email.trim().toLowerCase(),
      contact: contact.trim(),
      emergencyContact: emergencyContact?.trim() || null,
      healthInfo: healthInfo.trim(),
      address: address.trim(),
      studentId: req.user.id,
    };

    await prisma.patient.create({ data: payload });

    const patientNames = await fetchPatientNames(req.user);
    return res.status(201).json(patientNames);
  } catch (err) {
    console.error('[createPatient]', err);
    return res.status(500).json({ error: 'Internal server error while creating patient.' });
  }
};

// PUT /patients/:id
exports.updatePatient = async (req, res) => {
  try {
    const patientId = req.params.id;

    // Parse dob only if provided
    let parsedDob;
    if ('dob' in req.body) {
      parsedDob = parseLocalDateTime(req.body.dob, '00:00');
      if (!parsedDob) {
        return res.status(400).json({ error: 'Invalid date of birth format.' });
      }
    }

    // Build update payload
    const updates = {
      ...req.body,
      ...(parsedDob && { dob: parsedDob }),
    };

    await prisma.patient.update({
      where: { id: patientId },
      data: updates,
    });

    const patientNames = await fetchPatientNames(req.user);
    return res.status(201).json(patientNames);
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
      select: { id: true, studentId: true },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    if (patient.studentId !== currentUserId) {
      return res.status(403).json({ error: 'You are not authorized to delete this patient.' });
    }

    await prisma.$transaction([
      prisma.Incident.deleteMany({ where: { patientId } }),
      prisma.patient.delete({ where: { id: patientId } }),
    ]);

    const patientNames = await fetchPatientNames(req.user);
    return res.status(201).json(patientNames);
  } catch (error) {
    console.error('[Delete Patient Error]', error);
    return res.status(500).json({ error: 'Failed to delete patient.' });
  }
};

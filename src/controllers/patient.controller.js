const prisma = require('../prisma/client');

// ⏰ Helper: Parse date & time into Date object
const parseLocalDateTime = (dateStr, timeStr = '00:00') => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const datetime = new Date(`${dateStr}T${timeStr}`);
  return isNaN(datetime.getTime()) ? null : datetime;
};

// 🧾 Helper: Fetch dropdown-friendly patient names
const fetchPatientNames = async (user) => {
  const where = user.role === 'Student' ? { studentId: user.id } : {};
  return prisma.patient.findMany({
    where,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
};

// GET /patients
exports.getPatients = async (req, res) => {
  try {
    const { id: userId, role = 'Student' } = req.user || {};
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search?.trim() || '';
    const sort = ['name', 'createdAt'].includes(req.query.sort) ? req.query.sort : 'name';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';
    const skip = (page - 1) * limit;

    const baseWhere = role === 'Student' ? { studentId: userId } : {};
    if (search) {
      baseWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Age-based filters
    const today = new Date();
    const age18 = new Date(today.setFullYear(today.getFullYear() - 18));
    const age65 = new Date(today.setFullYear(today.getFullYear() - 65));

    const [patients, totalCount, childrenCount, adultCount, seniorCount] = await Promise.all([
      prisma.patient.findMany({
        where: baseWhere,
        orderBy: { [sort]: order },
        skip,
        take: limit,
        ...(role !== 'Student' && {
          include: { user: { select: { name: true, email: true } } },
        }),
      }),
      prisma.patient.count({ where: baseWhere }),
      prisma.patient.count({ where: { ...baseWhere, dob: { gte: age18 } } }),
      prisma.patient.count({ where: { ...baseWhere, dob: { lt: age18, gte: age65 } } }),
      prisma.patient.count({ where: { ...baseWhere, dob: { lt: age65 } } }),
    ]);

    res.status(200).json({ patients, totalCount, childrenCount, adultCount, seniorCount });
  } catch (err) {
    console.error('[getPatients]', err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
};

// GET /patients/:id
exports.getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Invalid patient ID' });

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    res.status(200).json(patient);
  } catch (error) {
    console.error('[getPatientById]', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /patients/names
exports.getPatientNames = async (req, res) => {
  try {
    const patients = await fetchPatientNames(req.user);
    res.status(200).json(patients);
  } catch (err) {
    console.error('[getPatientNames]', err);
    res.status(500).json({ error: 'Failed to fetch patient names' });
  }
};

// POST /patients
exports.createPatient = async (req, res) => {
  try {
    const { name, dob, email, contact, emergencyContact = null, healthInfo = '', address = '' } = req.body;
    if (!name || !dob || !email || !contact) {
      return res.status(400).json({ error: 'Missing required fields: name, dob, email, or contact.' });
    }

    const parsedDob = parseLocalDateTime(dob);
    if (!parsedDob) return res.status(400).json({ error: 'Invalid date of birth format.' });

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

    res.status(201).json(patientNames);
  } catch (err) {
    console.error('[createPatient]', err);
    res.status(500).json({ error: 'Internal server error while creating patient.' });
  }
};

// PUT /patients/:id
exports.updatePatient = async (req, res) => {
  try {
    const { id } = req.params;

    let parsedDob;
    if (req.body.dob) {
      parsedDob = parseLocalDateTime(req.body.dob);
      if (!parsedDob) return res.status(400).json({ error: 'Invalid date of birth format.' });
    }

    await prisma.patient.update({
      where: { id },
      data: { ...req.body, ...(parsedDob && { dob: parsedDob }) },
    });

    const patientNames = await fetchPatientNames(req.user);
    res.status(201).json(patientNames);
  } catch (error) {
    console.error('[updatePatient]', error);
    res.status(500).json({ error: 'Failed to update patient.' });
  }
};

// DELETE /patients/:id
exports.deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const patient = await prisma.patient.findUnique({
      where: { id },
      select: { id: true, studentId: true },
    });

    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    if (patient.studentId !== currentUserId) {
      return res.status(403).json({ error: 'You are not authorized to delete this patient.' });
    }

    await prisma.$transaction([
      prisma.incident.deleteMany({ where: { patientId: id } }),
      prisma.patient.delete({ where: { id } }),
    ]);

    const patientNames = await fetchPatientNames(req.user);
    res.status(201).json(patientNames);
  } catch (error) {
    console.error('[deletePatient]', error);
    res.status(500).json({ error: 'Failed to delete patient.' });
  }
};

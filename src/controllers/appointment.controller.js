const prisma = require('../prisma/client');

// CREATE
exports.createAppointment = async (req, res) => {
  try {
    const {
      title,
      description,
      date,         // "2025-07-21"
      startTime,    // "14:00"
      endTime,      // "15:00"
      patientId,
      status = 'Scheduled',
      color = "blue"
    } = req.body;

    // parse "YYYY‑MM‑DD" into year, monthIndex, day
    const [Y, M, D] = date.split("-").map(Number);
    // monthIndex is zero‑based!<
    const localMidnight = new Date(Y, M - 1, D);

    const studentId = req.user?.uid;

    const appointment = await prisma.appointment.create({
      data: {
        title,
        description,
        date: localMidnight, // Stores only the date
        startTime,
        endTime,
        status,
        patientId,
        studentId,
        color
      },
    });

    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET BY ID
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

exports.getAppointments = async (req, res) => {
  try {
    const {
      startIdx = 0,
      endIdx = 10,
      searchTerm = '',
      sort = 'desc', // frontend uses 'desc' as default
      statusFilter = 'All',
    } = req.query;

    const studentId = req.user?.uid;
    const role = req.user?.role;

    // Build query filters
    const filters = [];

    // Restrict to student appointments
    if (role === 'Student') {
      filters.push({ studentId });
    }

    // Optional search filter
    if (searchTerm) {
      filters.push({
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    // Optional status filter
    if (statusFilter !== 'All') {
      filters.push({ status: statusFilter });
    }

    const where = filters.length > 0 ? { AND: filters } : {};

    const [appointments, totalCount] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: [
          { date: sort === 'asc' ? 'asc' : 'desc' },
          { startTime: 'asc' },
        ],
        skip: Number(startIdx),
        take: Number(endIdx) - Number(startIdx),
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
          color: true,
          patientId: true,
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    res.status(200).json({ appointments, totalCount });
  } catch (err) {
    console.error('[Get Appointments Error]', err);
    res.status(500).json({ error: 'Failed to retrieve appointments.' });
  }
};


// GET BY DATE RANGE (CALENDAR USE)
exports.getAppointmentsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const studentId = req.user?.uid;
    const role = req.user?.role;

    let appointments = null;
    if (role == "Student") {
      appointments = await prisma.appointment.findMany({
        where: {
          studentId,
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        orderBy: {
          date: 'asc',
        },
      });
    } else {
      appointments = await prisma.appointment.findMany({
        where: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        orderBy: {
          date: 'asc',
        },
      });
    }
    res.status(200).json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.updateAppointment = async (req, res) => {
  try {
    const {
      date,       // "2025-07-21"
      startTime,  // "13:00"
      endTime,    // "14:00"
      ...rest     // title, description, patientId, status
    } = req.body;

    const data = {
      ...rest,
      date: new Date(date),
      startTime,
      endTime,
    };

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

// DELETE
exports.deleteAppointment = async (req, res) => {
  try {
    await prisma.appointment.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

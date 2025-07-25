const prisma = require('../prisma/client');

exports.getIncidents = async (req, res) => {
  const { page = 1, pageSize = 10, status, date, search } = req.query;
  const offset = (page - 1) * pageSize;

  const baseWhere = {
    studentId: req.user.id, // 👈 restrict to current student
  };

  const where = { ...baseWhere };

  if (status && status !== 'all') {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      {
        patient: {
          name: { contains: search, mode: 'insensitive' }
        }
      }
    ];
  }

  if (date && date !== 'all') {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    if (date === 'today') {
      where.appointmentDate = {
        gte: new Date(today.setHours(0, 0, 0, 0)),
        lt: new Date(today.setHours(23, 59, 59, 999)),
      };
    } else if (date === 'tomorrow') {
      where.appointmentDate = {
        gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
        lt: new Date(tomorrow.setHours(23, 59, 59, 999)),
      };
    } else if (date === 'week') {
      where.appointmentDate = {
        gte: today,
        lt: nextWeek,
      };
    } else if (date === 'overdue') {
      where.appointmentDate = { lt: new Date() };
      where.status = 'Scheduled';
    }
  }

  const [
    incidents,
    totalCount,
    completedCount,
    todayIncidents,
    overdueCount,
    upcomingIncidents
  ] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: { patient: true },
      skip: offset,
      take: parseInt(pageSize),
      orderBy: { appointmentDate: 'asc' }
    }),
    prisma.incident.count({ where: baseWhere }),
    prisma.incident.count({ where: { ...baseWhere, status: 'Completed' } }),
    prisma.incident.findMany({
      where: {
        ...baseWhere,
        appointmentDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }
    }),
    prisma.incident.count({
      where: {
        ...baseWhere,
        appointmentDate: { lt: new Date() },
        status: 'Scheduled'
      }
    }),
    prisma.incident.findMany({
      where: {
        ...baseWhere,
        appointmentDate: { gt: new Date() },
      },
      include: { patient: true },
      orderBy: { appointmentDate: 'asc' },
      take: 5,
    }),
  ]);

  res.json({ incidents, totalCount, completedCount, todayIncidents, overdueCount, upcomingIncidents });
};

exports.getPatientIncidents = async (req, res) => {
  try {
    const patientId = req.params.patientId;

    const today = new Date();

    // 1. Count incidents per patient (fix: use 'by: ['patientId']' instead of 'by: patientId')
    const incidentsCount = await prisma.incident.groupBy({
      by: ['patientId'],
      where: {
        studentId: req.user.id,
        patientId,
      },
      _count: {
        _all: true,
      },
    });

    // 2. First upcoming incident (for this patient only)
    const upcomingIncident = await prisma.incident.findFirst({
      where: {
        studentId: req.user.id,
        patientId,
        appointmentDate: { gte: today },
        status: 'Scheduled',
      },
      orderBy: {
        appointmentDate: 'asc',
      },
      select: {
        appointmentDate: true,
      },
    });

    return res.status(200).json({
      totalIncidents: incidentsCount[0]?._count._all || 0,
      nextScheduledAppointment: upcomingIncident?.appointmentDate || null,
    });
  } catch (error) {
    console.error('[getPatientIncidents]', error);
    return res.status(500).json({ error: 'Internal server error while fetching patient incidents.' });
  }
};

exports.createIncident = async (req, res) => {
  try {
    const studentId = req.user.id;
    const {
      patientId,
      title,
      description,
      comments,
      appointmentDate,
      cost,
      treatment,
      status,
    } = req.body;

    const incident = await prisma.incident.create({
      data: {
        studentId,
        patientId,
        title,
        description,
        comments,
        appointmentDate: new Date(appointmentDate),
        cost: Number(cost),
        treatment,
        status,
      },
    });

    res.status(201).json({ success: true, incident });
  } catch (error) {
    console.error('[Create Incident Error]', error);
    res.status(500).json({ success: false, message: 'Failed to create incident' });
  }
};

exports.updateIncident = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id } = req.params;
    const {
      patientId,
      title,
      description,
      comments,
      appointmentDate,
      cost,
      treatment,
      status,
    } = req.body;

    // Ensure incident belongs to user
    const existing = await prisma.incident.findUnique({ where: { id } });
    if (!existing || existing.studentId !== studentId) {
      return res.status(403).json({ success: false, message: 'Unauthorized or not found' });
    }

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        patientId,
        title,
        description,
        comments,
        appointmentDate: new Date(appointmentDate),
        cost: Number(cost),
        treatment,
        status,
      },
    });

    res.status(200).json({ success: true, incident: updatedIncident });
  } catch (error) {
    console.error('[Update Incident Error]', error);
    res.status(500).json({ success: false, message: 'Failed to update incident' });
  }
};

exports.updateIncidentStatus = async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  try {
    const updated = await prisma.incident.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
    res.json({ success: true, incident: updated });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
}

exports.deleteIncident = async (req, res) => {
  const id = req.params.id;
  try {
    await prisma.incident.delete({
      where: { id },
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete incident' });
  }
}


// // GET BY ID
// exports.getAppointmentById = async (req, res) => {
//   try {
//     const appointment = await prisma.appointment.findUnique({
//       where: { id: req.params.id },
//     });
//     res.json(appointment);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.getAppointments = async (req, res) => {
//   try {
//     const {
//       startIdx = 0,
//       endIdx = 10,
//       searchTerm = '',
//       sort = 'desc', // frontend uses 'desc' as default
//       statusFilter = 'All',
//     } = req.query;

//     const studentId = req.user?.uid;
//     const role = req.user?.role;

//     // Build query filters
//     const filters = [];

//     // Restrict to student appointments
//     if (role === 'Student') {
//       filters.push({ studentId });
//     }

//     // Optional search filter
//     if (searchTerm) {
//       filters.push({
//         OR: [
//           { title: { contains: searchTerm, mode: 'insensitive' } },
//           { description: { contains: searchTerm, mode: 'insensitive' } },
//         ],
//       });
//     }

//     // Optional status filter
//     if (statusFilter !== 'All') {
//       filters.push({ status: statusFilter });
//     }

//     const where = filters.length > 0 ? { AND: filters } : {};

//     const [appointments, totalCount] = await Promise.all([
//       prisma.appointment.findMany({
//         where,
//         orderBy: [
//           { date: sort === 'asc' ? 'asc' : 'desc' },
//           { startTime: 'asc' },
//         ],
//         skip: Number(startIdx),
//         take: Number(endIdx) - Number(startIdx),
//         select: {
//           id: true,
//           title: true,
//           description: true,
//           date: true,
//           startTime: true,
//           endTime: true,
//           status: true,
//           color: true,
//           patientId: true,
//         },
//       }),
//       prisma.appointment.count({ where }),
//     ]);

//     res.status(200).json({ appointments, totalCount });
//   } catch (err) {
//     console.error('[Get Appointments Error]', err);
//     res.status(500).json({ error: 'Failed to retrieve appointments.' });
//   }
// };


// // GET BY DATE RANGE (CALENDAR USE)
// exports.getAppointmentsByDateRange = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
//     const studentId = req.user?.uid;
//     const role = req.user?.role;

//     let appointments = null;
//     if (role == "Student") {
//       appointments = await prisma.appointment.findMany({
//         where: {
//           studentId,
//           date: {
//             gte: new Date(startDate),
//             lte: new Date(endDate),
//           },
//         },
//         orderBy: {
//           date: 'asc',
//         },
//       });
//     } else {
//       appointments = await prisma.appointment.findMany({
//         where: {
//           date: {
//             gte: new Date(startDate),
//             lte: new Date(endDate),
//           },
//         },
//         orderBy: {
//           date: 'asc',
//         },
//       });
//     }
//     res.status(200).json(appointments);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // UPDATE
// exports.updateAppointment = async (req, res) => {
//   try {
//     const {
//       date,       // "2025-07-21"
//       startTime,  // "13:00"
//       endTime,    // "14:00"
//       ...rest     // title, description, patientId, status
//     } = req.body;

//     const data = {
//       ...rest,
//       date: new Date(date),
//       startTime,
//       endTime,
//     };

//     const updated = await prisma.appointment.update({
//       where: { id: req.params.id },
//       data,
//     });

//     res.json(updated);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };

// // DELETE
// exports.deleteAppointment = async (req, res) => {
//   try {
//     await prisma.appointment.delete({
//       where: { id: req.params.id },
//     });
//     res.json({ message: 'Deleted successfully' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

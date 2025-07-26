const prisma = require('../prisma/client');

exports.getIncidents = async (req, res) => {
  const userRole = req.user?.role || 'Student';
  const userId = req.user?.id;
  const { page = 1, pageSize = 10, status, date, search } = req.query;
  const offset = (page - 1) * pageSize;

  let baseWhere = {};

  if (userRole === 'Student') {
    baseWhere.studentId = userId;
  }

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
      include: { patient: true, user: true },
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
      include: { patient: true, user: true },
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
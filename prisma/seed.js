const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  // Create a student user
  const student = await prisma.user.create({
    data: {
      id: 'mock-student-id-123',
      name: 'Student One',
      email: 'student@example.com',
      role: 'student',
    },
  });

  // Create a professor user
  await prisma.user.create({
    data: {
      name: 'Professor One',
      email: 'prof@example.com',
      role: 'professor',
    },
  });

  // Create patients
  const john = await prisma.patient.create({
    data: {
      name: 'John Smith',
      dateOfBirth: new Date('2000-04-20'),
      notes: 'Has fillings',
      studentId: student.id,
    },
  });

  const jane = await prisma.patient.create({
    data: {
      name: 'Jane Doe',
      dateOfBirth: new Date('2001-06-10'),
      notes: 'Needs x-ray',
      studentId: student.id,
    },
  });

  // Create appointments
  await prisma.appointment.createMany({
    data: [
      {
        title: 'Exam',
        date: new Date().toISOString(), // today
        time: '09:00',
        notes: 'Routine check',
        patientId: john.id,
        studentId: student.id,
      },
      {
        title: 'Cleaning',
        date: new Date().toISOString(),
        time: '10:00',
        notes: 'Teeth cleaning',
        patientId: jane.id,
        studentId: student.id,
      },
      {
        title: 'Filling',
        date: '2023-10-17T00:00:00.000Z',
        time: '14:00',
        notes: 'Cavity filling',
        patientId: john.id,
        studentId: student.id,
      },
    ],
  });

  console.log('🌱 Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

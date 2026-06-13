import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const clinic = await prisma.clinic.upsert({
    where: { id: "sync-chiro-001" },
    update: {},
    create: {
      id: "sync-chiro-001",
      name: "Synchrony Chiropractic",
      address: "123 Main Street",
      city: "Ocala",
      state: "FL",
      zipCode: "34471",
      phone: "(352) 555-0100",
      email: "hello@synchronychiro.com",
      timezone: "America/New_York",
      schedulingMode: "HYBRID",
      defaultAppointmentDuration: 30,
    },
  });

  const passwordHash = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { clinicId_email: { clinicId: clinic.id, email: "admin@synchronychiro.com" } },
    update: {},
    create: {
      clinicId: clinic.id,
      email: "admin@synchronychiro.com",
      passwordHash,
      firstName: "Philip",
      lastName: "Rodger",
      role: "SUPER_ADMIN",
      phone: "(352) 555-0100",
    },
  });

  const provider = await prisma.user.upsert({
    where: { clinicId_email: { clinicId: clinic.id, email: "provider@synchronychiro.com" } },
    update: {},
    create: {
      clinicId: clinic.id,
      email: "provider@synchronychiro.com",
      passwordHash,
      firstName: "Dr. Philip",
      lastName: "Rodger",
      role: "PROVIDER",
    },
  });

  const client = await prisma.client.create({
    data: {
      clinicId: clinic.id,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phone: "(352) 555-0200",
      address: "456 Oak Avenue",
      city: "Ocala",
      state: "FL",
      zipCode: "34471",
    },
  });

  const patient = await prisma.patient.create({
    data: {
      clinicId: clinic.id,
      clientId: client.id,
      name: "Max",
      species: "CANINE",
      breed: "German Shepherd",
      sex: "MALE_INTACT",
      color: "Black and Tan",
      currentWeight: 85,
      chiefComplaint: "Hindquarter weakness and difficulty jumping",
      treatmentGoals: "Restore mobility and strength in hindquarters",
      estimatedTotalVisits: 8,
    },
  });

  const adjustmentService = await prisma.service.create({
    data: {
      clinicId: clinic.id,
      name: "Chiropractic Adjustment",
      description: "Full body chiropractic adjustment",
      price: 7500,
      duration: 30,
    },
  });

  const laserService = await prisma.service.create({
    data: {
      clinicId: clinic.id,
      name: "Laser Therapy",
      description: "Cold laser therapy session",
      price: 5000,
      duration: 15,
    },
  });

  const evalService = await prisma.service.create({
    data: {
      clinicId: clinic.id,
      name: "Initial Evaluation",
      description: "Comprehensive initial evaluation and assessment",
      price: 12500,
      duration: 60,
    },
  });

  console.log("Seed data created:");
  console.log(`  Clinic: ${clinic.name} (${clinic.id})`);
  console.log(`  Admin: ${admin.email}`);
  console.log(`  Provider: ${provider.email}`);
  console.log(`  Client: ${client.firstName} ${client.lastName}`);
  console.log(`  Patient: ${patient.name} (${patient.species})`);
  console.log(`  Services: ${adjustmentService.name}, ${laserService.name}, ${evalService.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

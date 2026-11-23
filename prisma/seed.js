const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.entryVersion.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.indicator.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const cse = await prisma.department.create({
    data: {
      name: "Computer Science",
      description: "CSE department"
    }
  });

  const ece = await prisma.department.create({
    data: {
      name: "Electronics",
      description: "ECE department"
    }
  });

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@inst.edu",
      passwordHash: "hashed-admin123",
      role: "ADMIN",
      departmentId: cse.id
    }
  });

  const faculty = await prisma.user.create({
    data: {
      name: "Dr. Mehta",
      email: "faculty@inst.edu",
      passwordHash: "hashed-faculty123",
      role: "FACULTY",
      departmentId: cse.id
    }
  });

  const student = await prisma.user.create({
    data: {
      name: "Aarav Singh",
      email: "student@inst.edu",
      passwordHash: "hashed-student123",
      role: "STUDENT",
      departmentId: ece.id
    }
  });

  const patents = await prisma.indicator.create({
    data: {
      name: "Patents Filed",
      description: "Number of patents filed in the academic year",
      category: "IP",
      unit: "count",
      isActive: true,
      departmentId: cse.id
    }
  });

  const papers = await prisma.indicator.create({
    data: {
      name: "Research Papers",
      description: "Scopus-indexed papers published",
      category: "Research",
      unit: "count",
      isActive: true,
      departmentId: cse.id
    }
  });

  const grants = await prisma.indicator.create({
    data: {
      name: "DST Grants",
      description: "Funding received from DST",
      category: "Funding",
      unit: "amount",
      isActive: true,
      departmentId: ece.id
    }
  });

  const entry = await prisma.entry.create({
    data: {
      title: "Low-power IoT patent",
      description: "Provisional patent filed for a campus energy sensor",
      status: "SUBMITTED",
      indicatorId: patents.id,
      createdById: faculty.id
    }
  });

  await prisma.entryVersion.create({
    data: {
      entryId: entry.id,
      version: 1,
      createdById: faculty.id,
      data: {
        title: "IoT patent draft",
        description: "Initial draft before filing",
        status: "DRAFT",
        indicatorId: patents.id
      }
    }
  });

  await prisma.entryVersion.create({
    data: {
      entryId: entry.id,
      version: 2,
      createdById: faculty.id,
      data: {
        title: entry.title,
        description: entry.description,
        status: entry.status,
        indicatorId: entry.indicatorId
      }
    }
  });

  const paperEntry = await prisma.entry.create({
    data: {
      title: "NAAC analytics paper",
      description: "Paper accepted at a national conference",
      status: "APPROVED",
      indicatorId: papers.id,
      createdById: faculty.id
    }
  });

  await prisma.entryVersion.create({
    data: {
      entryId: paperEntry.id,
      version: 1,
      createdById: faculty.id,
      data: {
        title: paperEntry.title,
        description: paperEntry.description,
        status: "SUBMITTED",
        indicatorId: papers.id
      }
    }
  });

  await prisma.entryVersion.create({
    data: {
      entryId: paperEntry.id,
      version: 2,
      createdById: admin.id,
      data: {
        title: paperEntry.title,
        description: paperEntry.description,
        status: "APPROVED",
        indicatorId: papers.id
      }
    }
  });

  const grantEntry = await prisma.entry.create({
    data: {
      title: "DST sensor grant",
      description: "12 lakh grant for sensor lab",
      status: "DRAFT",
      indicatorId: grants.id,
      createdById: student.id
    }
  });

  await prisma.entryVersion.create({
    data: {
      entryId: grantEntry.id,
      version: 1,
      createdById: student.id,
      data: {
        title: grantEntry.title,
        description: grantEntry.description,
        status: "DRAFT",
        indicatorId: grants.id
      }
    }
  });

  await prisma.feedback.create({
    data: {
      comment: "Add the filing number before this can be approved.",
      entryId: entry.id,
      createdById: admin.id
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "CREATE",
      entity: "ENTRY",
      entityId: entry.id,
      userId: faculty.id,
      metadata: { version: 1, title: "IoT patent draft" }
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "UPDATE",
      entity: "ENTRY",
      entityId: entry.id,
      userId: faculty.id,
      metadata: { version: 2, status: "SUBMITTED" }
    }
  });

  console.log("Seeded departments, users, indicators, entries, versions, feedback, and audit logs.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

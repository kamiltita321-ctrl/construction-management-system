import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth-utils";

async function main() {
  console.log("Starting database seeding...");

  // 1. Clean existing records in correct dependency order
  console.log("Cleaning old records...");
  await prisma.reportMaterialUsage.deleteMany({});
  await prisma.reportPhoto.deleteMany({});
  await prisma.dailyReport.deleteMany({});
  await prisma.summaryReport.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.changeOrder.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.materialAllocation.deleteMany({});
  await prisma.materialLog.deleteMany({});
  await prisma.material.deleteMany({});
  
  // New master data tables
  await prisma.machine.deleteMany({});
  await prisma.equipmentType.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.jobTitle.deleteMany({});
  await prisma.idleReason.deleteMany({});
  await prisma.downReason.deleteMany({});
  await prisma.personnel.deleteMany({});
  
  // We need to detach relationships before deleting users/projects
  // Prisma Cascade handles some, but we do clean deletes
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Database cleaned.");

  // 2. Create Users with different roles
  console.log("Creating seed users...");
  const adminPass = await hashPassword("admin123");
  const gmPass = await hashPassword("gm123");
  const dgmPass = await hashPassword("dgm123");
  const vpPass = await hashPassword("vp123");
  const pmPass = await hashPassword("pm123");
  const sePass = await hashPassword("se123");

  const systemAdmin = await prisma.user.create({
    data: {
      email: "admin@cms.com",
      passwordHash: adminPass,
      firstName: "Alex",
      lastName: "Admin",
      role: "SYSTEM_ADMIN",
      phone: "+15550100",
    },
  });

  const generalManager = await prisma.user.create({
    data: {
      email: "gm@cms.com",
      passwordHash: gmPass,
      firstName: "George",
      lastName: "Manager",
      role: "GENERAL_MANAGER",
      phone: "+15550200",
    },
  });

  const deputyGM = await prisma.user.create({
    data: {
      email: "dgm@cms.com",
      passwordHash: dgmPass,
      firstName: "David",
      lastName: "Deputy",
      role: "DEPUTY_GENERAL_MANAGER",
      phone: "+15550300",
    },
  });

  const vpConstruction = await prisma.user.create({
    data: {
      email: "vp@cms.com",
      passwordHash: vpPass,
      firstName: "Victoria",
      lastName: "Patel",
      role: "VP_OF_CONSTRUCTION",
      phone: "+15550400",
    },
  });

  const projectManager = await prisma.user.create({
    data: {
      email: "pm@cms.com",
      passwordHash: pmPass,
      firstName: "Peter",
      lastName: "Miller",
      role: "PROJECT_MANAGER",
      phone: "+15550500",
    },
  });

  const siteEngineer = await prisma.user.create({
    data: {
      email: "se@cms.com",
      passwordHash: sePass,
      firstName: "Sarah",
      lastName: "Engineer",
      role: "SITE_ENGINEER",
      phone: "+15550600",
    },
  });

  console.log("Users created successfully:");
  console.log(`- System Admin: ${systemAdmin.email}`);
  console.log(`- General Manager: ${generalManager.email}`);
  console.log(`- Deputy GM: ${deputyGM.email}`);
  console.log(`- VP of Construction: ${vpConstruction.email}`);
  console.log(`- Project Manager: ${projectManager.email}`);
  console.log(`- Site Engineer: ${siteEngineer.email}`);

  // 3. Create active project
  console.log("Creating seed project...");
  const project = await prisma.project.create({
    data: {
      name: "Golden Gate Rehabilitation Project",
      code: "GG-REHAB-2026",
      description: "Structural deck reinforcement, suspension cable maintenance, and safety painting updates.",
      location: "San Francisco, CA",
      startDate: new Date("2026-06-01"),
      status: "ACTIVE",
      budget: 12500000.0,
      managerId: projectManager.id,
      engineers: {
        connect: [{ id: siteEngineer.id }],
      },
    },
  });
  console.log(`Project created: ${project.name} (Code: ${project.code})`);

  // 4. Create milestones
  console.log("Creating milestones...");
  await prisma.milestone.createMany({
    data: [
      {
        title: "Site Mobilization & Safety Enclosure Setup",
        description: "Install containment nets and safety barriers, mobilize staging equipment.",
        dueDate: new Date("2026-06-30"),
        isCompleted: false,
        projectId: project.id,
      },
      {
        title: "Suspension Cable Scanning & Diagnostics",
        description: "Complete ultrasonic scanning of north-side cables for fatigue mapping.",
        dueDate: new Date("2026-08-15"),
        isCompleted: false,
        projectId: project.id,
      },
      {
        title: "South Tower Paint & Zinc Coating Application",
        description: "Blasting old layers and recoating rust prone segments.",
        dueDate: new Date("2026-10-30"),
        isCompleted: false,
        projectId: project.id,
      },
    ],
  });

  // 5. Create tasks (Work Orders)
  console.log("Creating initial work order tasks...");
  await prisma.task.create({
    data: {
      title: "Install Cable Containment Netting (Span 3)",
      description: "Safety netting check and setup to secure working environment below deck level.",
      dueDate: new Date("2026-06-15"),
      status: "IN_PROGRESS",
      type: "WORK_ORDER",
      progress: 35,
      projectId: project.id,
      assigneeId: siteEngineer.id,
      creatorId: projectManager.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Anchor Bolt Tightening - Main Span",
      description: "Inspect and torque anchor bolts along structural nodes of main deck truss.",
      dueDate: new Date("2026-06-25"),
      status: "APPROVED",
      type: "WORK_ORDER",
      progress: 0,
      projectId: project.id,
      assigneeId: siteEngineer.id,
      creatorId: projectManager.id,
    },
  });

  // 6. Create materials & allocate to project
  console.log("Creating materials inventory...");
  const structuralSteel = await prisma.material.create({
    data: {
      name: "Structural Steel Channels (H-Beam)",
      unit: "tons",
      stockCount: 45.0,
      minStock: 10.0,
    },
  });

  const industrialPaint = await prisma.material.create({
    data: {
      name: "Safety International Orange Primer (Rust-oleum)",
      unit: "gallons",
      stockCount: 500.0,
      minStock: 100.0,
    },
  });

  const highTorqueBolts = await prisma.material.create({
    data: {
      name: "ASTM A325 Heavy Hex Anchor Bolts",
      unit: "pieces",
      stockCount: 2500.0,
      minStock: 500.0,
    },
  });

  // Material allocation for project
  console.log("Allocating materials to the rehabilitation project...");
  await prisma.materialAllocation.create({
    data: {
      projectId: project.id,
      materialId: structuralSteel.id,
      allocatedQty: 15.0,
      consumedQty: 0.0,
    },
  });

  await prisma.materialAllocation.create({
    data: {
      projectId: project.id,
      materialId: industrialPaint.id,
      allocatedQty: 200.0,
      consumedQty: 0.0,
    },
  });

  await prisma.materialAllocation.create({
    data: {
      projectId: project.id,
      materialId: highTorqueBolts.id,
      allocatedQty: 1000.0,
      consumedQty: 0.0,
    },
  });

  // 7. Seed Master Data for Daily reports
  console.log("Seeding daily report master data...");
  const activities = ["Earthworks", "Crushing", "Concreting", "Drainage", "Paving"];
  for (const act of activities) {
    await prisma.activity.create({ data: { name: act } });
  }

  const units = ["m³", "m²", "m", "ton", "hr", "no."];
  for (const un of units) {
    await prisma.unit.create({ data: { name: un } });
  }

  const jobTitles = ["Foreman", "Operator", "Mason", "Carpenter", "Helper", "Laborer"];
  for (const title of jobTitles) {
    await prisma.jobTitle.create({ data: { name: title } });
  }

  const idleReasons = ["Waiting for Material", "Weather Delay", "Waiting for Instructions", "Equipment Reassignment", "Other"];
  for (const reason of idleReasons) {
    await prisma.idleReason.create({ data: { name: reason } });
  }

  const downReasons = ["Mechanical Breakdown", "Scheduled Maintenance", "Electrical Failure", "Tire/Track Issue", "Other"];
  for (const reason of downReasons) {
    await prisma.downReason.create({ data: { name: reason } });
  }

  const personnel = [
    { name: "John Doe", role: "QC Leader" },
    { name: "Jane Smith", role: "Foreman" },
    { name: "Bob Johnson", role: "Superintendent" },
    { name: "Sarah Engineer", role: "Site Engineer" }
  ];
  for (const p of personnel) {
    await prisma.personnel.create({ data: p });
  }

  const equipmentTypes = [
    { name: "Truck", machines: ["TR-001", "TR-002", "TR-003"] },
    { name: "Loader", machines: ["LD-001", "LD-002"] },
    { name: "Mixer", machines: ["MX-001"] },
    { name: "Excavator", machines: ["EX-001", "EX-002"] }
  ];
  for (const eq of equipmentTypes) {
    const createdType = await prisma.equipmentType.create({
      data: { name: eq.name }
    });
    for (const code of eq.machines) {
      await prisma.machine.create({
        data: {
          code,
          equipmentTypeId: createdType.id
        }
      });
    }
  }

  console.log("Seeding complete! Ready for database testing.");
}

main()
  .catch((e) => {
    console.error("Error running seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

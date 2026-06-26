import { prisma } from "../src/lib/db";

async function checkConnection() {
  console.log("=========================================");
  console.log("Checking database connection credentials...");
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ":****@")}`); // Hide password
  console.log("=========================================");

  try {
    // Attempt simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log("\n[SUCCESS] Connection to MySQL database successful!");
    console.log("Prisma can read and write to the database.");
    console.log("Next steps:\n");
    console.log("1. Run database structure setup:\n   npx prisma db push");
    console.log("2. Seed default system users & projects:\n   npx prisma db seed\n");
  } catch (error: any) {
    console.log("\n[ERROR] Connection failed!");
    console.log("Please check the following troubleshoot checklist:");
    console.log("-------------------------------------------------");
    console.log("1. Is your MySQL Server running?");
    console.log("   Check that the MySQL service is active.");
    console.log("2. Do database credentials in your .env file match your MySQL setup?");
    console.log("   Open and edit .env to update:");
    console.log("   mysql://USER:PASSWORD@HOST:PORT/DATABASE");
    console.log("3. If the database name 'construction_management' does not exist,");
    console.log("   Prisma should create it, but ensure your MySQL user has");
    console.log("   CREATE DATABASE permissions.\n");
    console.error("System Error details:\n", error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkConnection();

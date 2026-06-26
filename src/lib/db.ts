import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

// In Prisma 7, direct connections are managed via Driver Adapters.
// Since we are using MySQL, we initialize it using the @prisma/adapter-mariadb adapter.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in the environment variables. Please check your .env file.");
}

// Convert mysql:// protocol to mariadb:// protocol for @prisma/adapter-mariadb
const mariadbUrl = databaseUrl.replace(/^mysql:/, "mariadb:");

const adapter = new PrismaMariaDb(mariadbUrl);

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter });
} else {
  // Prevent multiple client instances from being created during local dev hot-reloads
  const globalWithPrisma = global as typeof globalThis & {
    prisma?: PrismaClient;
  };
  
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient({ adapter });
  }
  
  prisma = globalWithPrisma.prisma;
}

export { prisma };

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set in the environment variables. " +
      "For local dev, add it to .env. For Vercel, add it to your project's Environment Variables."
  );
}

// Parse credentials from the connection URL
const dbUrl = new URL(databaseUrl);

/**
 * Pass the config object directly to PrismaMariaDb (the factory).
 *
 * DO NOT pre-create a pool with mariadb.createPool and pass it here.
 * PrismaMariaDb always calls mariadb.createPool() internally on connect().
 * If you pass an existing pool object, the adapter spreads it into a plain
 * config object, losing all host/user/password/ssl settings and falling back
 * to localhost defaults.
 *
 * connectTimeout: 10000 is required because the default 1000ms is too short
 * for the TLS handshake latency to TiDB Cloud Serverless.
 *
 * NOTE: Do NOT import "dotenv/config" here. Next.js (and Vercel) handle
 * environment variable injection natively. dotenv is only needed for standalone
 * scripts like prisma/seed.ts that run outside of Next.js.
 */
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 4000,
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ""),
  ssl: {
    rejectUnauthorized: true, // Enforce TLS — required by TiDB Cloud
  },
  // connectTimeout: per-socket TLS handshake deadline (ms)
  // acquireTimeout: total time the pool waits for a usable connection (ms)
  // Both must be generous for Vercel → TiDB Cloud cold-start latency.
  connectTimeout: 20000,
  acquireTimeout: 30000,
  connectionLimit: 5, // Keep low for serverless — avoids connection exhaustion
});

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter });
} else {
  // Prevent multiple instances during Next.js hot-reloads in development
  const globalWithPrisma = global as typeof globalThis & {
    prisma?: PrismaClient;
  };

  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient({ adapter });
  }

  prisma = globalWithPrisma.prisma;
}

export { prisma };
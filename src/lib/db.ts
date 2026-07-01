import { connect } from "@tidbcloud/serverless";
import { PrismaTiDBCloud } from "@tidbcloud/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables."
  );
}

/**
 * Use TiDB Cloud's official HTTP-based serverless driver instead of the
 * mariadb TCP driver. The mariadb driver uses persistent TCP connections
 * which are fundamentally incompatible with Vercel's Lambda-style serverless
 * functions — they cannot maintain open TCP sockets between invocations.
 *
 * @tidbcloud/serverless communicates over HTTPS (port 443), making it:
 * - Stateless and serverless-friendly
 * - Not blocked by any firewall or IP allowlist
 * - The officially recommended approach by TiDB Cloud for Vercel
 *
 * NOTE: The DATABASE_URL format must use 'mysql://' (not 'mariadb://').
 * Update the URL on Vercel env vars accordingly.
 */
const connection = connect({ url: databaseUrl });
const adapter = new PrismaTiDBCloud(connection);

const globalForPrisma = global as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
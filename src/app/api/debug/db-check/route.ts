import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint — reveals the actual DB connection error on Vercel.
 * Visit: /api/debug/db-check
 * REMOVE THIS FILE before going to production.
 */
export async function GET() {
  const checks: Record<string, unknown> = {};

  // 1. Check environment variables
  checks.DATABASE_URL_set = !!process.env.DATABASE_URL;
  checks.SESSION_SECRET_set = !!process.env.SESSION_SECRET;
  checks.NODE_ENV = process.env.NODE_ENV;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      status: "FAIL",
      reason: "DATABASE_URL is not set on this Vercel deployment",
      checks,
    }, { status: 500 });
  }

  // 2. Parse the URL
  let urlParsed: Record<string, unknown> = {};
  try {
    const u = new URL(process.env.DATABASE_URL);
    urlParsed = {
      hostname: u.hostname,
      port: u.port,
      username: u.username ? "(set)" : "(MISSING)",
      password: u.password ? "(set)" : "(MISSING)",
      database: u.pathname,
      ssl_param: u.searchParams.get("ssl"),
    };
  } catch (e: any) {
    urlParsed = { parseError: e.message };
  }
  checks.DATABASE_URL_parsed = urlParsed;

  // 3. Try a real DB query
  try {
    const { prisma } = await import("@/lib/db");
    const result = await prisma.$queryRaw`SELECT 1 AS connected`;
    checks.db_query = "SUCCESS";
    checks.db_result = String(result);
    return NextResponse.json({ status: "OK", checks });
  } catch (e: any) {
    checks.db_query = "FAIL";
    checks.db_error = e?.message ?? String(e);
    checks.db_error_cause = e?.cause?.message ?? e?.cause ?? null;
    checks.db_error_code = e?.cause?.originalCode ?? e?.code ?? null;
    return NextResponse.json({ status: "FAIL", checks }, { status: 500 });
  }
}

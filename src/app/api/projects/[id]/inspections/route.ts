import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// GET /api/projects/[id]/inspections - Fetch inspection records for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;

    const inspections = await prisma.inspectionRecord.findMany({
      where: { projectId: id },
      include: {
        conductedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { inspectionDate: "desc" },
    });

    return NextResponse.json({ inspections });
  } catch (error: any) {
    console.error("GET /api/projects/[id]/inspections error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/inspections - Log a new inspection (SE write, others read)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const { userId, role } = auth.session;

    // Site Engineer has write access to Inspections
    const isSE = role === Role.SITE_ENGINEER;
    const isExec =
      role === Role.SYSTEM_ADMIN ||
      role === Role.GENERAL_MANAGER ||
      role === Role.DEPUTY_GENERAL_MANAGER ||
      role === Role.VP_OF_CONSTRUCTION;

    if (!isSE && !isExec) {
      return NextResponse.json(
        { error: "Access denied. Only Site Engineers can record site inspections." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { inspectionType, inspectorName, inspectionDate, area, outcome, followUpDate, findings } = body;

    if (!inspectionType || !inspectorName || !inspectionDate || !area || !outcome) {
      return NextResponse.json(
        { error: "Missing required fields: inspectionType, inspectorName, inspectionDate, area, outcome" },
        { status: 400 }
      );
    }

    const inspection = await prisma.inspectionRecord.create({
      data: {
        inspectionType,
        inspectorName,
        inspectionDate: new Date(inspectionDate),
        area,
        outcome,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        findings,
        projectId: id,
        conductedById: userId,
      },
      include: {
        conductedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ inspection }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects/[id]/inspections error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

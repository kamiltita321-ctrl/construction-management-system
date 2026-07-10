import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// GET /api/projects/[id]/inspections
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

// POST /api/projects/[id]/inspections - Create inspection request (CE / PM / Exec)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const { userId, role } = auth.session;

    // Spec §2: Head Construction Engineer (CONSTRUCTION_ENGINEER) initiates inspection
    const canCreate =
      role === Role.CONSTRUCTION_ENGINEER ||
      role === Role.PROJECT_MANAGER ||
      role === Role.SYSTEM_ADMIN ||
      role === Role.GENERAL_MANAGER ||
      role === Role.DEPUTY_GENERAL_MANAGER ||
      role === Role.VP_OF_CONSTRUCTION;

    if (!canCreate) {
      return NextResponse.json(
        { error: "Access denied. Only Construction Engineers or above can initiate inspections." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { inspectionType, inspectorName, inspectionDate, area, followUpDate, findings } = body;

    if (!inspectionType || !inspectorName || !inspectionDate || !area) {
      return NextResponse.json(
        { error: "Missing required fields: inspectionType, inspectorName, inspectionDate, area" },
        { status: 400 }
      );
    }

    const inspection = await prisma.inspectionRecord.create({
      data: {
        inspectionType,
        inspectorName,
        inspectionDate: new Date(inspectionDate),
        area,
        outcome: "PENDING",
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        findings,
        workflowStage: "REQUESTED",
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

// PUT /api/projects/[id]/inspections/[inspId] handled via separate route
// PATCH /api/projects/[id]/inspections - Advance workflow stage or encode result
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role } = auth.session;
    const body = await req.json();
    const { inspectionId, action, outcome, findings } = body;

    if (!inspectionId || !action) {
      return NextResponse.json({ error: "Missing inspectionId or action" }, { status: 400 });
    }

    const inspection = await prisma.inspectionRecord.findUnique({ where: { id: inspectionId } });
    if (!inspection) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    let updateData: any = {};

    if (action === "PM_APPROVE") {
      if (role !== Role.PROJECT_MANAGER && !["SYSTEM_ADMIN","GENERAL_MANAGER","DEPUTY_GENERAL_MANAGER","VP_OF_CONSTRUCTION"].includes(role)) {
        return NextResponse.json({ error: "Only Project Managers can approve inspections." }, { status: 403 });
      }
      updateData = { workflowStage: "PM_APPROVED" };
    } else if (action === "START_INSPECTION") {
      // External consultant starts
      updateData = { workflowStage: "UNDER_INSPECTION" };
    } else if (action === "ENCODE_RESULT") {
      // Office Engineer encodes final result (spec §2)
      const canEncode =
        role === Role.OFFICE_ENGINEER ||
        role === Role.PROJECT_MANAGER ||
        role === Role.SYSTEM_ADMIN ||
        role === Role.GENERAL_MANAGER ||
        role === Role.DEPUTY_GENERAL_MANAGER ||
        role === Role.VP_OF_CONSTRUCTION;

      if (!canEncode) {
        return NextResponse.json(
          { error: "Only Office Engineers can encode final inspection results." },
          { status: 403 }
        );
      }
      if (!outcome) {
        return NextResponse.json({ error: "outcome is required for result encoding" }, { status: 400 });
      }
      updateData = { workflowStage: "COMPLETED", outcome, findings: findings || inspection.findings };
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const updated = await prisma.inspectionRecord.update({
      where: { id: inspectionId },
      data: updateData,
      include: { conductedBy: { select: { firstName: true, lastName: true } } },
    });

    return NextResponse.json({ inspection: updated });
  } catch (error: any) {
    console.error("PATCH /api/projects/[id]/inspections error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

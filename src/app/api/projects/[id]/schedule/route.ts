import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// Roles allowed to access the Master Schedule
const SCHEDULE_ROLES: Role[] = [
  Role.SYSTEM_ADMIN,
  Role.GENERAL_MANAGER,
  Role.DEPUTY_GENERAL_MANAGER,
  Role.VP_OF_CONSTRUCTION,
  Role.PROJECT_MANAGER,
];

// GET /api/projects/[id]/schedule - Retrieve master schedule
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth(SCHEDULE_ROLES);
    if (!auth.authorized) return auth.response;
    const { id } = await params;

    const schedule = await prisma.masterSchedule.findUnique({
      where: { projectId: id },
    });

    return NextResponse.json({ schedule });
  } catch (error: any) {
    console.error("GET /api/projects/[id]/schedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/schedule - Upload/update master schedule (upsert)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth(SCHEDULE_ROLES);
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const { firstName, lastName } = auth.session;

    const body = await req.json();
    const { fileName, fileUrl, parsedWbs, parsedResources, parsedBudget } = body;

    if (!fileName || !parsedWbs || !parsedResources || !parsedBudget) {
      return NextResponse.json(
        { error: "Missing required fields: fileName, parsedWbs, parsedResources, parsedBudget" },
        { status: 400 }
      );
    }

    // Upsert — always replaces any existing schedule for this project
    const schedule = await prisma.masterSchedule.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        fileName,
        fileUrl: fileUrl || "",
        parsedWbs,
        parsedResources,
        parsedBudget,
        uploadedBy: `${firstName} ${lastName}`,
      },
      update: {
        fileName,
        fileUrl: fileUrl || "",
        parsedWbs,
        parsedResources,
        parsedBudget,
        uploadedBy: `${firstName} ${lastName}`,
      },
    });

    return NextResponse.json({ schedule }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/projects/[id]/schedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

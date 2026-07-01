import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// GET /api/projects/[id]/visitors - Fetch visitors logged for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;

    const visitors = await prisma.visitorLog.findMany({
      where: { projectId: id },
      include: {
        escortedBy: { select: { firstName: true, lastName: true } },
        loggedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { visitDatetime: "desc" },
    });

    return NextResponse.json({ visitors });
  } catch (error: any) {
    console.error("GET /api/projects/[id]/visitors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/visitors - Log a new visitor (PM write, others read)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const { userId, role } = auth.session;

    // PM is allowed to log visitors
    const isPM = role === Role.PROJECT_MANAGER;
    const isExec =
      role === Role.SYSTEM_ADMIN ||
      role === Role.GENERAL_MANAGER ||
      role === Role.DEPUTY_GENERAL_MANAGER ||
      role === Role.VP_OF_CONSTRUCTION;

    if (!isPM && !isExec) {
      return NextResponse.json(
        { error: "Access denied. Only Project Managers can log new visitors." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { visitorName, organization, purpose, visitDatetime, badgeNumber, remarks, escortedById } = body;

    if (!visitorName || !purpose || !visitDatetime) {
      return NextResponse.json(
        { error: "Missing required fields: visitorName, purpose, visitDatetime" },
        { status: 400 }
      );
    }

    const visitor = await prisma.visitorLog.create({
      data: {
        visitorName,
        organization,
        purpose,
        visitDatetime: new Date(visitDatetime),
        badgeNumber,
        remarks,
        escortedById: escortedById || null,
        projectId: id,
        loggedById: userId,
      },
      include: {
        escortedBy: { select: { firstName: true, lastName: true } },
        loggedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ visitor }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects/[id]/visitors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

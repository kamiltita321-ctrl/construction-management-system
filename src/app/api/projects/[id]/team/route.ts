import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

const EXEC_ROLES: Role[] = [
  Role.SYSTEM_ADMIN,
  Role.GENERAL_MANAGER,
  Role.DEPUTY_GENERAL_MANAGER,
  Role.VP_OF_CONSTRUCTION,
];

// POST /api/projects/[id]/team - Add an engineer to the project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth(EXEC_ROLES);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { userId: memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // Verify user exists and is a field role
    const user = await prisma.user.findUnique({ where: { id: memberId } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Add to engineers relation
    const updated = await prisma.project.update({
      where: { id },
      data: {
        engineers: { connect: { id: memberId } },
      },
      include: {
        engineers: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json({ engineers: updated.engineers });
  } catch (error: any) {
    console.error("POST /api/projects/[id]/team error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/team - Remove an engineer from the project
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth(EXEC_ROLES);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { userId: memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        engineers: { disconnect: { id: memberId } },
      },
      include: {
        engineers: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json({ engineers: updated.engineers });
  } catch (error: any) {
    console.error("DELETE /api/projects/[id]/team error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/projects/[id]/team - List all non-manager users available to assign
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    // Return all field-role users that can be assigned
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: [
            Role.CONSTRUCTION_ENGINEER,
            Role.SITE_ENGINEER,
            Role.OFFICE_ENGINEER,
            Role.PROJECT_MANAGER,
          ],
        },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
      orderBy: { firstName: "asc" },
    });

    // Also get current engineers on the project
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        engineers: { select: { id: true } },
      },
    });

    const assignedIds = new Set(project?.engineers.map((e) => e.id) ?? []);

    return NextResponse.json({
      users: users.map((u) => ({ ...u, isAssigned: assignedIds.has(u.id) })),
    });
  } catch (error: any) {
    console.error("GET /api/projects/[id]/team error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

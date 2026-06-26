import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// GET /api/projects - List projects
export async function GET() {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    let projects;

    // Filter projects based on user roles
    if (role === Role.SITE_ENGINEER) {
      projects = await prisma.project.findMany({
        where: {
          engineers: {
            some: { id: userId },
          },
        },
        include: {
          manager: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      });
    } else if (role === Role.PROJECT_MANAGER) {
      projects = await prisma.project.findMany({
        where: { managerId: userId },
        include: {
          manager: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      });
    } else {
      // Admins, GMs, DGMs, VPs can see all projects
      projects = await prisma.project.findMany({
        include: {
          manager: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      });
    }

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects - Create project
export async function POST(req: NextRequest) {
  try {
    const allowedRoles: Role[] = [
      Role.SYSTEM_ADMIN,
      Role.GENERAL_MANAGER,
      Role.DEPUTY_GENERAL_MANAGER,
      Role.VP_OF_CONSTRUCTION,
    ];
    
    const auth = await verifyApiAuth(allowedRoles);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { name, code, description, location, startDate, endDate, budget, managerId } = body;

    if (!name || !code || !location || !startDate || !managerId) {
      return NextResponse.json(
        { error: "Missing required fields: name, code, location, startDate, managerId" },
        { status: 400 }
      );
    }

    // Verify manager exists and has correct role
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!manager || manager.role !== Role.PROJECT_MANAGER) {
      return NextResponse.json(
        { error: "Invalid manager selected. Assigned user must be a Project Manager." },
        { status: 400 }
      );
    }

    const newProject = await prisma.project.create({
      data: {
        name,
        code,
        description,
        location,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        budget: parseFloat(budget) || 0.0,
        managerId,
      },
    });

    return NextResponse.json({ project: newProject }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Project code must be unique." }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

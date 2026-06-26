import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// Helper to check if a user has access to a project
async function checkProjectAccess(userId: string, role: Role, projectId: string) {
  if (role === Role.SYSTEM_ADMIN || 
      role === Role.GENERAL_MANAGER || 
      role === Role.DEPUTY_GENERAL_MANAGER || 
      role === Role.VP_OF_CONSTRUCTION) {
    return true;
  }
  
  if (role === Role.PROJECT_MANAGER) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, managerId: userId }
    });
    return !!project;
  }

  if (role === Role.SITE_ENGINEER) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        engineers: {
          some: { id: userId }
        }
      }
    });
    return !!project;
  }

  return false;
}

// GET /api/projects/[id] - Get details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;

    const hasAccess = await checkProjectAccess(userId, role as Role, id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        engineers: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        milestones: {
          orderBy: { dueDate: "asc" }
        },
        tasks: {
          orderBy: { dueDate: "asc" }
        },
        materials: {
          include: {
            material: true
          }
        },
        documents: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/projects/[id] - Update project
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    
    // Only Admin, GM, DGM, VP, or the assigned PM can update projects
    const isOwnerPM = await prisma.project.findFirst({
      where: { id, managerId: userId }
    });

    const isAuthorized = 
      role === Role.SYSTEM_ADMIN ||
      role === Role.GENERAL_MANAGER ||
      role === Role.DEPUTY_GENERAL_MANAGER ||
      role === Role.VP_OF_CONSTRUCTION ||
      !!isOwnerPM;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied to update this project" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, location, startDate, endDate, status, budget, managerId } = body;

    // PM cannot transfer project managership
    let finalManagerId = managerId;
    if (role === Role.PROJECT_MANAGER) {
      finalManagerId = undefined; // Ignore attempts by PM to reassign
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        location,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate === null ? null : endDate ? new Date(endDate) : undefined,
        status,
        budget: budget !== undefined ? parseFloat(budget) : undefined,
        managerId: finalManagerId,
      },
    });

    return NextResponse.json({ project: updatedProject });
  } catch (error: any) {
    console.error("PUT /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const allowedRoles: Role[] = [Role.SYSTEM_ADMIN, Role.GENERAL_MANAGER];
    const auth = await verifyApiAuth(allowedRoles);
    if (!auth.authorized) return auth.response;

    await prisma.project.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Project deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

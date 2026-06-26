import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// Helper to check access for a milestone
async function checkMilestoneAccess(userId: string, role: Role, milestoneId: string) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true }
  });

  if (!milestone) return { exists: false };

  const isAuthorized = 
    role === Role.SYSTEM_ADMIN ||
    role === Role.GENERAL_MANAGER ||
    role === Role.DEPUTY_GENERAL_MANAGER ||
    role === Role.VP_OF_CONSTRUCTION ||
    (role === Role.PROJECT_MANAGER && milestone.project.managerId === userId);

  return { exists: true, isAuthorized, milestone };
}

// PUT /api/milestones/[id] - Update milestone
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    const access = await checkMilestoneAccess(userId, role as Role, id);

    if (!access.exists) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    if (!access.isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, dueDate, isCompleted } = body;

    const updatedMilestone = await prisma.milestone.update({
      where: { id },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        isCompleted,
      }
    });

    return NextResponse.json({ milestone: updatedMilestone });
  } catch (error: any) {
    console.error("PUT /api/milestones/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/milestones/[id] - Delete milestone
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    const access = await checkMilestoneAccess(userId, role as Role, id);

    if (!access.exists) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    if (!access.isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.milestone.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Milestone deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/milestones/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

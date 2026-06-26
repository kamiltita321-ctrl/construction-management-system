import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role, OrderStatus } from "@prisma/client";

// Helper to verify task permissions
async function getTaskAndCheckPermission(userId: string, role: Role, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          engineers: true
        }
      }
    }
  });

  if (!task) return { exists: false };

  const isExecutive =
    role === Role.SYSTEM_ADMIN ||
    role === Role.GENERAL_MANAGER ||
    role === Role.DEPUTY_GENERAL_MANAGER ||
    role === Role.VP_OF_CONSTRUCTION;

  const isProjectPM = role === Role.PROJECT_MANAGER && task.project.managerId === userId;
  const isAssignee = role === Role.SITE_ENGINEER && task.project.engineers.some((e: any) => e.id === userId);

  return {
    exists: true,
    isExecutive,
    isProjectPM,
    isAssignee,
    task
  };
}

// PUT /api/tasks/[id] - Update task details, progress or status
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    const check = await getTaskAndCheckPermission(userId, role as Role, id);

    if (!check.exists) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const canEdit = check.isExecutive || check.isProjectPM || check.isAssignee;
    if (!canEdit) {
      return NextResponse.json({ error: "Access denied to update task" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, dueDate, status, progress, assigneeId } = body;

    // Build update payload based on role limitations
    let updateData: any = {};

    if (check.isExecutive || check.isProjectPM) {
      // PMs and leadership can edit everything
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
      if (status !== undefined) updateData.status = status as OrderStatus;
      if (progress !== undefined) updateData.progress = parseInt(progress) || 0;
      if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    } else if (check.isAssignee) {
      // Site Engineers can only update progress and transition status
      if (progress !== undefined) updateData.progress = Math.min(Math.max(parseInt(progress) || 0, 0), 100);
      
      if (status !== undefined) {
        const allowedStates = [OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED] as string[];
        if (allowedStates.includes(status)) {
          updateData.status = status as OrderStatus;
        } else {
          return NextResponse.json({ error: "Site Engineers can only set status to IN_PROGRESS or COMPLETED" }, { status: 400 });
        }
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error: any) {
    console.error("PUT /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    const check = await getTaskAndCheckPermission(userId, role as Role, id);

    if (!check.exists) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const canDelete = check.isExecutive || check.isProjectPM;
    if (!canDelete) {
      return NextResponse.json({ error: "Access denied. Only project managers or leadership can delete tasks" }, { status: 403 });
    }

    await prisma.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

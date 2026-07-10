import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role, OrderStatus } from "@prisma/client";

// GET /api/tasks - List tasks
export async function GET() {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    let tasks;

    // Filter tasks based on role
    if (role === Role.OFFICE_ENGINEER) {
      tasks = await prisma.task.findMany({
        where: {
          project: {
            engineers: { some: { id: userId } }
          }
        },
        include: {
          project: { select: { name: true, code: true } },
          assignee: { select: { firstName: true, lastName: true } },
        },
        orderBy: { dueDate: "asc" },
      });
    } else if (role === Role.PROJECT_MANAGER) {
      tasks = await prisma.task.findMany({
        where: {
          project: { managerId: userId }
        },
        include: {
          project: { select: { name: true, code: true } },
          assignee: { select: { firstName: true, lastName: true } },
        },
        orderBy: { dueDate: "asc" },
      });
    } else {
      // Executives see all tasks
      tasks = await prisma.task.findMany({
        include: {
          project: { select: { name: true, code: true } },
          assignee: { select: { firstName: true, lastName: true } },
        },
        orderBy: { dueDate: "asc" },
      });
    }

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tasks - Create task
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    
    // Only PMs, GM, DGM, VP, and Admins can create tasks
    const canCreate =
      role === Role.SYSTEM_ADMIN ||
      role === Role.GENERAL_MANAGER ||
      role === Role.DEPUTY_GENERAL_MANAGER ||
      role === Role.VP_OF_CONSTRUCTION ||
      role === Role.PROJECT_MANAGER;

    if (!canCreate) {
      return NextResponse.json({ error: "Unauthorized to create work orders" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, dueDate, projectId, assigneeId, type } = body;

    if (!title || !dueDate || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields: title, dueDate, projectId" },
        { status: 400 }
      );
    }

    // If PM, verify they manage the project
    if (role === Role.PROJECT_MANAGER) {
      const isManager = await prisma.project.findFirst({
        where: { id: projectId, managerId: userId }
      });
      if (!isManager) {
        return NextResponse.json({ error: "Unauthorized. You do not manage this project." }, { status: 403 });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        projectId,
        assigneeId: assigneeId || null,
        creatorId: userId,
        status: OrderStatus.DRAFT,
        type: type || "WORK_ORDER",
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

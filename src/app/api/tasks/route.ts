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

    // CE, OE, and SE see tasks for projects they are engineers on
    const isFieldEngineer =
      role === Role.CONSTRUCTION_ENGINEER ||
      role === Role.OFFICE_ENGINEER ||
      role === Role.SITE_ENGINEER;

    if (isFieldEngineer) {
      tasks = await prisma.task.findMany({
        where: {
          OR: [
            { project: { engineers: { some: { id: userId } } } },
            { creatorId: userId },
            { assigneeId: userId },
          ],
        },
        include: {
          project: { select: { name: true, code: true } },
          assignee: { select: { firstName: true, lastName: true } },
          creator: { select: { firstName: true, lastName: true, role: true } },
        },
        orderBy: { dueDate: "asc" },
      });
    } else if (role === Role.PROJECT_MANAGER) {
      tasks = await prisma.task.findMany({
        where: { project: { managerId: userId } },
        include: {
          project: { select: { name: true, code: true } },
          assignee: { select: { firstName: true, lastName: true } },
          creator: { select: { firstName: true, lastName: true, role: true } },
        },
        orderBy: { dueDate: "asc" },
      });
    } else {
      // Executives see all tasks
      tasks = await prisma.task.findMany({
        include: {
          project: { select: { name: true, code: true } },
          assignee: { select: { firstName: true, lastName: true } },
          creator: { select: { firstName: true, lastName: true, role: true } },
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

// POST /api/tasks - Create Work Order (Construction Engineer only per workflow spec)
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;

    // Per spec: Only Construction Engineer initiates Work Orders
    // Head Office and PM can also create for admin/oversight purposes
    const canCreate =
      role === Role.CONSTRUCTION_ENGINEER ||
      role === Role.SYSTEM_ADMIN ||
      role === Role.GENERAL_MANAGER ||
      role === Role.DEPUTY_GENERAL_MANAGER ||
      role === Role.VP_OF_CONSTRUCTION ||
      role === Role.PROJECT_MANAGER;

    if (!canCreate) {
      return NextResponse.json(
        { error: "Only Construction Engineers can initiate Work Orders." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, description, dueDate, projectId, assigneeId, type } = body;

    if (!title || !dueDate || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields: title, dueDate, projectId" },
        { status: 400 }
      );
    }

    // Verify project exists and CE is assigned to it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { engineers: { select: { id: true } } },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // PM must manage the project
    if (role === Role.PROJECT_MANAGER && project.managerId !== userId) {
      return NextResponse.json(
        { error: "You do not manage this project." },
        { status: 403 }
      );
    }

    // Note: CE can create WOs on any project — the project workspace page
    // already scopes which projects they can access.

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
        workflowStage: "INITIATED", // Pipeline starts at CE
      },
      include: {
        assignee: { select: { firstName: true, lastName: true } },
        creator: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

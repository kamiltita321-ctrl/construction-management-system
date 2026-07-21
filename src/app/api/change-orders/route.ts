import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role, OrderStatus } from "@prisma/client";

// GET /api/change-orders - List change orders (role-scoped)
export async function GET() {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    let changeOrders;

    const isFieldEngineer =
      role === Role.CONSTRUCTION_ENGINEER ||
      role === Role.OFFICE_ENGINEER ||
      role === Role.SITE_ENGINEER;

    if (isFieldEngineer) {
      changeOrders = await prisma.changeOrder.findMany({
        where: {
          OR: [
            { project: { engineers: { some: { id: userId } } } },
            { requesterId: userId },
          ],
        },
        include: {
          project: { select: { name: true, code: true, budget: true } },
          requester: { select: { firstName: true, lastName: true, role: true } },
          approver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (role === Role.PROJECT_MANAGER) {
      changeOrders = await prisma.changeOrder.findMany({
        where: {
          OR: [{ requesterId: userId }, { project: { managerId: userId } }],
        },
        include: {
          project: { select: { name: true, code: true, budget: true } },
          requester: { select: { firstName: true, lastName: true, role: true } },
          approver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      changeOrders = await prisma.changeOrder.findMany({
        include: {
          project: { select: { name: true, code: true, budget: true } },
          requester: { select: { firstName: true, lastName: true, role: true } },
          approver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ changeOrders });
  } catch (error: any) {
    console.error("GET /api/change-orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/change-orders - Create Change Order (CE initiates per workflow spec)
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;

    // Per spec: Construction Engineer initiates. PM and Head Office may also create.
    const canCreate =
      role === Role.CONSTRUCTION_ENGINEER ||
      role === Role.SYSTEM_ADMIN ||
      role === Role.GENERAL_MANAGER ||
      role === Role.DEPUTY_GENERAL_MANAGER ||
      role === Role.VP_OF_CONSTRUCTION ||
      role === Role.PROJECT_MANAGER;

    if (!canCreate) {
      return NextResponse.json(
        { error: "Only Construction Engineers can initiate Change Orders." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, description, estimatedCost, projectId, requestLetterUrl } = body;

    if (!title || !description || estimatedCost === undefined || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, estimatedCost, projectId" },
        { status: 400 }
      );
    }

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
        { error: "Access denied. You do not manage this project." },
        { status: 403 }
      );
    }

    // Note: CE can create COs on any project — the project workspace already
    // scopes which projects they can access.

    // ── 25% BUDGET HARD GATE ──
    const cost = parseFloat(estimatedCost) || 0;
    if (project.budget > 0) {
      const existingCOs = await prisma.changeOrder.aggregate({
        where: {
          projectId,
          status: { in: [OrderStatus.APPROVED, OrderStatus.PENDING_APPROVAL] },
        },
        _sum: { estimatedCost: true },
      });
      const existingTotal = existingCOs._sum.estimatedCost || 0;
      const newTotal = existingTotal + cost;
      const threshold = project.budget * 0.25;

      if (newTotal > threshold) {
        return NextResponse.json(
          {
            error: `Change Order denied. Total change amount ($${newTotal.toLocaleString()}) exceeds 25% of the baseline project budget ($${threshold.toLocaleString()}). Seek executive authorization.`,
            code: "BUDGET_GATE_EXCEEDED",
            threshold,
            existing: existingTotal,
            requested: cost,
            total: newTotal,
          },
          { status: 422 }
        );
      }
    }

    const changeOrder = await prisma.changeOrder.create({
      data: {
        title,
        description,
        estimatedCost: cost,
        // Starts as DRAFT in the pipeline — not yet PENDING_APPROVAL
        status: OrderStatus.DRAFT,
        workflowStage: "INITIATED",
        projectId,
        requesterId: userId,
        requestLetterUrl: requestLetterUrl || null,
      },
      include: {
        requester: { select: { firstName: true, lastName: true, role: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ changeOrder }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/change-orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

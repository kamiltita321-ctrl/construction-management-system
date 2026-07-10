import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role, OrderStatus } from "@prisma/client";

// GET /api/change-orders - List change orders
export async function GET() {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    let changeOrders;

    if (role === Role.OFFICE_ENGINEER || role === Role.CONSTRUCTION_ENGINEER) {
      changeOrders = await prisma.changeOrder.findMany({
        where: { project: { engineers: { some: { id: userId } } } },
        include: {
          project: { select: { name: true, code: true, budget: true } },
          requester: { select: { firstName: true, lastName: true } },
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
          requester: { select: { firstName: true, lastName: true } },
          approver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      changeOrders = await prisma.changeOrder.findMany({
        include: {
          project: { select: { name: true, code: true, budget: true } },
          requester: { select: { firstName: true, lastName: true } },
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

// POST /api/change-orders - Create change order with 25% budget gate
export async function POST(req: NextRequest) {
  try {
    const allowedRoles: Role[] = [
      Role.SYSTEM_ADMIN,
      Role.GENERAL_MANAGER,
      Role.DEPUTY_GENERAL_MANAGER,
      Role.VP_OF_CONSTRUCTION,
      Role.PROJECT_MANAGER,
    ];
    const auth = await verifyApiAuth(allowedRoles);
    if (!auth.authorized) return auth.response;

    const { userId } = auth.session;
    const body = await req.json();
    const { title, description, estimatedCost, projectId, requestLetterUrl } = body;

    if (!title || !description || estimatedCost === undefined || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, estimatedCost, projectId" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { role } = auth.session;
    if (role === Role.PROJECT_MANAGER && project.managerId !== userId) {
      return NextResponse.json(
        { error: "Access denied. Project Managers can only request change orders for their projects." },
        { status: 403 }
      );
    }

    // ── 25% BUDGET HARD GATE ──
    const cost = parseFloat(estimatedCost) || 0;
    if (project.budget > 0) {
      // Sum all existing approved + pending COs
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
            error: `Change Order denied. Total change amount ($${newTotal.toLocaleString()}) exceeds 25% of the baseline project budget ($${threshold.toLocaleString()}). Please seek executive authorization.`,
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
        status: OrderStatus.PENDING_APPROVAL,
        projectId,
        requesterId: userId,
        requestLetterUrl: requestLetterUrl || null,
      },
      include: {
        requester: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ changeOrder }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/change-orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

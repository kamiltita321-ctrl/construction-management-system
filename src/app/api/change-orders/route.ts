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

    if (role === Role.SITE_ENGINEER) {
      // Engineers only see change orders on projects they work on
      changeOrders = await prisma.changeOrder.findMany({
        where: {
          project: {
            engineers: { some: { id: userId } }
          }
        },
        include: {
          project: { select: { name: true, code: true } },
          requester: { select: { firstName: true, lastName: true } },
          approver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (role === Role.PROJECT_MANAGER) {
      // PMs see change orders they requested or for projects they manage
      changeOrders = await prisma.changeOrder.findMany({
        where: {
          OR: [
            { requesterId: userId },
            { project: { managerId: userId } },
          ]
        },
        include: {
          project: { select: { name: true, code: true } },
          requester: { select: { firstName: true, lastName: true } },
          approver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Leadership/Admin sees all change orders
      changeOrders = await prisma.changeOrder.findMany({
        include: {
          project: { select: { name: true, code: true } },
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

// POST /api/change-orders - PM/VP requests a change order
export async function POST(req: NextRequest) {
  try {
    const allowedRoles: Role[] = [
      Role.SYSTEM_ADMIN,
      Role.VP_OF_CONSTRUCTION,
      Role.PROJECT_MANAGER,
    ];
    const auth = await verifyApiAuth(allowedRoles);
    if (!auth.authorized) return auth.response;

    const { userId } = auth.session;
    const body = await req.json();
    const { title, description, estimatedCost, projectId } = body;

    if (!title || !description || estimatedCost === undefined || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, estimatedCost, projectId" },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { role } = auth.session;
    // Project Managers can only create change orders for projects they manage
    if (role === Role.PROJECT_MANAGER && project.managerId !== userId) {
      return NextResponse.json({ error: "Access denied. Project Managers can only request change orders for projects they manage." }, { status: 403 });
    }

    const changeOrder = await prisma.changeOrder.create({
      data: {
        title,
        description,
        estimatedCost: parseFloat(estimatedCost) || 0.0,
        status: OrderStatus.PENDING_APPROVAL,
        projectId,
        requesterId: userId,
      }
    });

    return NextResponse.json({ changeOrder }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/change-orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

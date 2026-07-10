import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role, OrderStatus } from "@prisma/client";

// GET /api/notifications - Get system-wide notification alerts (polling/dynamic alerts)
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    const alerts: Array<{ id: string; type: string; title: string; message: string; date: string }> = [];

    // 1. Check for Project low stock alerts (All Roles except Site Engineer)
    if (role !== Role.OFFICE_ENGINEER) {
      const lowStockMaterials = await prisma.material.findMany({
        where: {
          stockCount: {
            lte: prisma.material.fields.minStock
          }
        },
        select: { name: true, stockCount: true, unit: true }
      });

      lowStockMaterials.forEach((m, idx) => {
        alerts.push({
          id: `low-stock-${idx}`,
          type: "INVENTORY_ALERT",
          title: "Low Stock Alert",
          message: `Material "${m.name}" is below safety threshold levels. Current: ${m.stockCount} ${m.unit}`,
          date: new Date().toISOString()
        });
      });
    }

    // 2. Check for pending Change Orders (Admin, GM, VP, or PM of the project)
    let pendingCOQuery = undefined;
    if (role === Role.PROJECT_MANAGER) {
      pendingCOQuery = { project: { managerId: userId }, status: OrderStatus.PENDING_APPROVAL };
    } else if (role !== Role.OFFICE_ENGINEER) {
      pendingCOQuery = { status: OrderStatus.PENDING_APPROVAL };
    }

    if (pendingCOQuery) {
      const pendingCOs = await prisma.changeOrder.findMany({
        where: pendingCOQuery,
        select: { id: true, title: true, estimatedCost: true, project: { select: { name: true } } },
        orderBy: { createdAt: "desc" }
      });

      pendingCOs.forEach(co => {
        alerts.push({
          id: `co-pending-${co.id}`,
          type: "APPROVAL_REQUIRED",
          title: "Change Order Approval Needed",
          message: `Change Order "${co.title}" for project "${co.project.name}" requires review ($${co.estimatedCost}).`,
          date: new Date().toISOString()
        });
      });
    }

    // 3. Check for pending tasks due within 3 days (Assignee or Creator)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    let pendingTasksQuery = undefined;
    if (role === Role.OFFICE_ENGINEER) {
      pendingTasksQuery = {
        assigneeId: userId,
        status: { not: OrderStatus.COMPLETED },
        dueDate: { lte: threeDaysFromNow }
      };
    } else if (role === Role.PROJECT_MANAGER) {
      pendingTasksQuery = {
        project: { managerId: userId },
        status: { not: OrderStatus.COMPLETED },
        dueDate: { lte: threeDaysFromNow }
      };
    } else {
      pendingTasksQuery = {
        status: { not: OrderStatus.COMPLETED },
        dueDate: { lte: threeDaysFromNow }
      };
    }

    const urgentTasks = await prisma.task.findMany({
      where: pendingTasksQuery,
      select: { id: true, title: true, dueDate: true },
      orderBy: { dueDate: "asc" }
    });

    urgentTasks.forEach(task => {
      alerts.push({
        id: `task-urgent-${task.id}`,
        type: "URGENT_TASK",
        title: "Upcoming Deadline",
        message: `Task "${task.title}" is due soon (${new Date(task.dueDate).toLocaleDateString()}).`,
        date: new Date().toISOString()
      });
    });

    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role, OrderStatus } from "@prisma/client";

// PUT /api/change-orders/[id] - Approve or reject Change Order
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Only System Admin, General Manager, or Deputy General Manager can approve/reject change orders
    const allowedRoles: Role[] = [
      Role.SYSTEM_ADMIN,
      Role.GENERAL_MANAGER,
      Role.DEPUTY_GENERAL_MANAGER,
    ];
    
    const auth = await verifyApiAuth(allowedRoles);
    if (!auth.authorized) return auth.response;

    const { userId } = auth.session;
    const body = await req.json();
    const { status, rejectionReason } = body;

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status update. Only APPROVED or REJECTED statuses are accepted." },
        { status: 400 }
      );
    }

    const changeOrder = await prisma.changeOrder.findUnique({
      where: { id }
    });

    if (!changeOrder) {
      return NextResponse.json({ error: "Change order not found" }, { status: 404 });
    }

    if (changeOrder.status !== OrderStatus.PENDING_APPROVAL) {
      return NextResponse.json(
        { error: "This change order has already been resolved." },
        { status: 400 }
      );
    }

    const updatedChangeOrder = await prisma.changeOrder.update({
      where: { id },
      data: {
        status: status as OrderStatus,
        rejectionReason: status === "REJECTED" ? rejectionReason || null : null,
        approverId: userId,
      },
    });

    return NextResponse.json({ changeOrder: updatedChangeOrder });
  } catch (error: any) {
    console.error("PUT /api/change-orders/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

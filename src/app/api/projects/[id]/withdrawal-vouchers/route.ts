import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// GET /api/projects/[id]/withdrawal-vouchers
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;

    const vouchers = await prisma.withdrawalVoucher.findMany({
      where: { projectId: id },
      include: {
        material: { select: { id: true, name: true, unit: true } },
        requestedBy: { select: { firstName: true, lastName: true, role: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ vouchers });
  } catch (error: any) {
    console.error("GET /api/projects/[id]/withdrawal-vouchers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/withdrawal-vouchers - OE submits withdrawal request
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const { userId, role } = auth.session;

    // Only Office Engineers can submit withdrawal vouchers
    if (role !== Role.OFFICE_ENGINEER) {
      return NextResponse.json(
        { error: "Only Office Engineers can submit material withdrawal vouchers." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { materialId, quantity, purpose } = body;

    if (!materialId || !quantity) {
      return NextResponse.json({ error: "Missing required fields: materialId, quantity" }, { status: 400 });
    }

    // Verify material is allocated to this project
    const allocation = await prisma.materialAllocation.findFirst({
      where: { projectId: id, materialId },
    });
    if (!allocation) {
      return NextResponse.json({ error: "Material not allocated to this project." }, { status: 400 });
    }

    const voucher = await prisma.withdrawalVoucher.create({
      data: {
        projectId: id,
        materialId,
        quantity: parseFloat(quantity),
        purpose: purpose || null,
        status: "PENDING_CE",
        requestedById: userId,
      },
      include: {
        material: { select: { id: true, name: true, unit: true } },
        requestedBy: { select: { firstName: true, lastName: true, role: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ voucher }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects/[id]/withdrawal-vouchers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/withdrawal-vouchers - CE validates or PM approves
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { userId, role } = auth.session;
    const body = await req.json();
    const { voucherId, action, notes } = body;

    if (!voucherId || !action) {
      return NextResponse.json({ error: "Missing voucherId or action" }, { status: 400 });
    }

    const voucher = await prisma.withdrawalVoucher.findUnique({ where: { id: voucherId } });
    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    let updateData: any = {};

    if (action === "CE_APPROVE") {
      if (role !== Role.CONSTRUCTION_ENGINEER && !["SYSTEM_ADMIN","GENERAL_MANAGER","DEPUTY_GENERAL_MANAGER","VP_OF_CONSTRUCTION","PROJECT_MANAGER"].includes(role)) {
        return NextResponse.json({ error: "Only Construction Engineers can validate withdrawal vouchers." }, { status: 403 });
      }
      updateData = { status: "PENDING_PM", ceNotes: notes || null };
    } else if (action === "CE_REJECT") {
      updateData = { status: "REJECTED", ceNotes: notes || null };
    } else if (action === "PM_APPROVE") {
      if (role !== Role.PROJECT_MANAGER && !["SYSTEM_ADMIN","GENERAL_MANAGER","DEPUTY_GENERAL_MANAGER","VP_OF_CONSTRUCTION"].includes(role)) {
        return NextResponse.json({ error: "Only Project Managers can authorize withdrawal vouchers." }, { status: 403 });
      }
      // Approve and deduct from allocation
      updateData = { status: "APPROVED", pmNotes: notes || null, approverId: userId };

      // Deduct material from allocation
      await prisma.materialAllocation.updateMany({
        where: { projectId: voucher.projectId, materialId: voucher.materialId },
        data: { consumedQty: { increment: voucher.quantity } },
      });
    } else if (action === "PM_REJECT") {
      updateData = { status: "REJECTED", pmNotes: notes || null };
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const updated = await prisma.withdrawalVoucher.update({
      where: { id: voucherId },
      data: updateData,
      include: {
        material: { select: { id: true, name: true, unit: true } },
        requestedBy: { select: { firstName: true, lastName: true, role: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ voucher: updated });
  } catch (error: any) {
    console.error("PATCH /api/projects/[id]/withdrawal-vouchers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

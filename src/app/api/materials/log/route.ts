import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// POST /api/materials/log - Add stock (STOCK_IN) or deduct stock manually (STOCK_OUT)
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role } = auth.session;
    // Only Admin, GMs, VPs, or PMs can log stock updates directly
    const isAuthorized = 
      role === Role.SYSTEM_ADMIN ||
      role === Role.GENERAL_MANAGER ||
      role === Role.DEPUTY_GENERAL_MANAGER ||
      role === Role.VP_OF_CONSTRUCTION ||
      role === Role.PROJECT_MANAGER;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied to update stock levels" }, { status: 403 });
    }

    const body = await req.json();
    const { materialId, quantity, actionType, referenceId } = body; // actionType: "STOCK_IN", "STOCK_OUT"

    if (!materialId || quantity === undefined || !actionType) {
      return NextResponse.json({ error: "Missing required fields: materialId, quantity, actionType" }, { status: 400 });
    }

    const material = await prisma.material.findUnique({
      where: { id: materialId }
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const changeQty = parseFloat(quantity);
    if (isNaN(changeQty) || changeQty <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
    }

    const actualChange = actionType === "STOCK_IN" ? changeQty : -changeQty;

    // Check if STOCK_OUT would cause negative total stock
    if (actionType === "STOCK_OUT" && material.stockCount + actualChange < 0) {
      return NextResponse.json({ error: `Insufficient stock count. Available: ${material.stockCount}` }, { status: 400 });
    }

    // Execute transaction to update stock and write log entry
    const [updatedMaterial, log] = await prisma.$transaction([
      prisma.material.update({
        where: { id: materialId },
        data: { stockCount: { increment: actualChange } }
      }),
      prisma.materialLog.create({
        data: {
          materialId,
          quantity: actualChange,
          actionType,
          referenceId: referenceId || null
        }
      })
    ]);

    return NextResponse.json({ material: updatedMaterial, log });
  } catch (error: any) {
    console.error("POST /api/materials/log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

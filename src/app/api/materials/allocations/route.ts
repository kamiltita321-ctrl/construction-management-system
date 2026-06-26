import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// POST /api/materials/allocations - Allocate material quantity to a project
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    // Only Admin, GMs, VPs, or PMs can make project allocations
    const isRoleAuthorized = 
      role === Role.SYSTEM_ADMIN ||
      role === Role.GENERAL_MANAGER ||
      role === Role.DEPUTY_GENERAL_MANAGER ||
      role === Role.VP_OF_CONSTRUCTION ||
      role === Role.PROJECT_MANAGER;

    if (!isRoleAuthorized) {
      return NextResponse.json({ error: "Access denied to allocate materials" }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, materialId, allocatedQty } = body;

    if (!projectId || !materialId || allocatedQty === undefined) {
      return NextResponse.json({ error: "Missing required fields: projectId, materialId, allocatedQty" }, { status: 400 });
    }

    const qtyToAllocate = parseFloat(allocatedQty);
    if (isNaN(qtyToAllocate) || qtyToAllocate <= 0) {
      return NextResponse.json({ error: "Allocated quantity must be a positive number" }, { status: 400 });
    }

    // Check project and material exist
    const [project, material] = await prisma.$transaction([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.material.findUnique({ where: { id: materialId } })
    ]);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!material) return NextResponse.json({ error: "Material not found" }, { status: 404 });

    // Check project assigned boundaries for Project Managers
    if (role === Role.PROJECT_MANAGER && project.managerId !== userId) {
      return NextResponse.json({ error: "Access denied. Project Managers can only allocate materials to projects they manage." }, { status: 403 });
    }

    // Validate that we have enough unallocated global stock
    if (material.stockCount < qtyToAllocate) {
      return NextResponse.json({ error: `Insufficient unallocated global stock. Available: ${material.stockCount} ${material.unit}` }, { status: 400 });
    }

    // Check if an allocation already exists for this project-material combo
    const existingAllocation = await prisma.materialAllocation.findFirst({
      where: { projectId, materialId }
    });

    let allocation;
    if (existingAllocation) {
      // Execute transaction to update allocation and decrement global stock
      const [updatedAlloc] = await prisma.$transaction([
        prisma.materialAllocation.update({
          where: { id: existingAllocation.id },
          data: { allocatedQty: { increment: qtyToAllocate } }
        }),
        prisma.material.update({
          where: { id: materialId },
          data: { stockCount: { decrement: qtyToAllocate } }
        }),
        prisma.materialLog.create({
          data: {
            materialId,
            quantity: -qtyToAllocate,
            actionType: "STOCK_OUT",
            referenceId: `ALLOCATION_UP_${projectId}`
          }
        })
      ]);
      allocation = updatedAlloc;
    } else {
      // Execute transaction to create allocation and decrement global stock
      const [newAlloc] = await prisma.$transaction([
        prisma.materialAllocation.create({
          data: {
            projectId,
            materialId,
            allocatedQty: qtyToAllocate,
            consumedQty: 0.0
          }
        }),
        prisma.material.update({
          where: { id: materialId },
          data: { stockCount: { decrement: qtyToAllocate } }
        }),
        prisma.materialLog.create({
          data: {
            materialId,
            quantity: -qtyToAllocate,
            actionType: "STOCK_OUT",
            referenceId: `ALLOCATION_NEW_${projectId}`
          }
        })
      ]);
      allocation = newAlloc;
    }

    return NextResponse.json({ allocation });
  } catch (error: any) {
    console.error("POST /api/materials/allocations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

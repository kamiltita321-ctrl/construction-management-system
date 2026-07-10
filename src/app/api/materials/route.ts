import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// GET /api/materials - Get list of materials
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;

    const materials = await prisma.material.findMany({
      include: {
        allocations: {
          include: {
            project: {
              select: { id: true, name: true, code: true, managerId: true, engineers: { select: { id: true } } }
            }
          }
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 10
        }
      },
      orderBy: { name: "asc" }
    });

    // Restrict allocations visible to user based on role and project assignments
    const filteredMaterials = materials.map((m) => {
      const filteredAllocations = m.allocations.filter((a) => {
        if (role === Role.OFFICE_ENGINEER) {
          return a.project && a.project.engineers.some((e) => e.id === userId);
        } else if (role === Role.PROJECT_MANAGER) {
          return a.project && a.project.managerId === userId;
        }
        return true;
      });

      return {
        ...m,
        allocations: filteredAllocations
      };
    });

    return NextResponse.json({ materials: filteredMaterials });
  } catch (error: any) {
    console.error("GET /api/materials error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/materials - Create a new material
export async function POST(req: NextRequest) {
  try {
    const allowedRoles: Role[] = [
      Role.SYSTEM_ADMIN,
      Role.GENERAL_MANAGER,
      Role.DEPUTY_GENERAL_MANAGER,
      Role.VP_OF_CONSTRUCTION
    ];
    const auth = await verifyApiAuth(allowedRoles);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { name, unit, minStock } = body;

    if (!name || !unit) {
      return NextResponse.json({ error: "Name and unit are required fields" }, { status: 400 });
    }

    const exists = await prisma.material.findUnique({
      where: { name }
    });

    if (exists) {
      return NextResponse.json({ error: "Material with this name already exists" }, { status: 400 });
    }

    const material = await prisma.material.create({
      data: {
        name,
        unit,
        minStock: minStock !== undefined ? parseFloat(minStock) : 0.0,
        stockCount: 0.0
      }
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/materials error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import InventoryDashboard from "./InventoryDashboard";

export default async function InventoryPage() {
  const session = await requireAuth();
  const { role, userId } = session;

  // 1. Fetch materials with nested logs and allocations
  const materials = await prisma.material.findMany({
    include: {
      allocations: {
        include: {
          project: {
            select: { id: true, name: true, code: true }
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

  // Fetch list of project IDs user has access to
  let projectIdsUserHasAccessTo: string[] = [];
  if (role === Role.SITE_ENGINEER) {
    const userProjects = await prisma.project.findMany({
      where: { engineers: { some: { id: userId } } },
      select: { id: true }
    });
    projectIdsUserHasAccessTo = userProjects.map(p => p.id);
  } else if (role === Role.PROJECT_MANAGER) {
    const userProjects = await prisma.project.findMany({
      where: { managerId: userId },
      select: { id: true }
    });
    projectIdsUserHasAccessTo = userProjects.map(p => p.id);
  }

  // 2. Access control check - Only System Admin, General Manager, Deputy General Manager, and VP of Construction are allowed.
  const isAllowedExecutive =
    role === Role.SYSTEM_ADMIN ||
    role === Role.GENERAL_MANAGER ||
    role === Role.DEPUTY_GENERAL_MANAGER ||
    role === Role.VP_OF_CONSTRUCTION;

  let projects: { id: string; name: string; code: string }[] = [];
  if (!isAllowedExecutive) {
    redirect("/forbidden");
  } else {
    // Admins, GMs, DGMs, VPs can allocate to any project
    projects = await prisma.project.findMany({
      select: { id: true, name: true, code: true }
    });
  }

  // Serialize models into serializable formats for Client Components
  const serializedMaterials = materials.map((m) => {
    // Restrict allocations visible to user based on role and project assignments
    const filteredAllocations = m.allocations;

    return {
      id: m.id,
      name: m.name,
      unit: m.unit,
      stockCount: m.stockCount,
      minStock: m.minStock,
      allocations: filteredAllocations.map((a) => ({
        id: a.id,
        projectId: a.projectId,
        project: a.project,
        allocatedQty: a.allocatedQty,
        consumedQty: a.consumedQty
      })),
      logs: m.logs.map((l) => ({
        id: l.id,
        quantity: l.quantity,
        actionType: l.actionType,
        referenceId: l.referenceId,
        createdAt: l.createdAt.toISOString()
      }))
    };
  });

  return (
    <InventoryDashboard
      initialMaterials={serializedMaterials}
      projects={projects}
      currentUser={{ id: userId, role }}
    />
  );
}

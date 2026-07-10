import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { Role, ProjectStatus, OrderStatus } from "@prisma/client";
import OverviewDashboard from "./OverviewDashboard";

export default async function DashboardPage() {
  const session = await requireAuth();
  const { role, userId } = session;

  // 1. Query projects scoped by role
  let projectQuery: any;
  if (role === Role.OFFICE_ENGINEER) {
    projectQuery = { engineers: { some: { id: userId } } };
  } else if (role === Role.PROJECT_MANAGER) {
    projectQuery = { managerId: userId };
  } else {
    projectQuery = {}; // Admin, GM, DGM, VP see all
  }

  const projects = await prisma.project.findMany({
    where: projectQuery,
    include: {
      tasks: { select: { progress: true, status: true } },
      changeOrders: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Compute metrics
  const activeProjectsCount = projects.filter(p => p.status === ProjectStatus.ACTIVE).length;
  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);

  // Per-project average task progress
  const projectsData = projects.map(p => {
    const tasks = p.tasks;
    const avgProgress = tasks.length > 0
      ? Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length)
      : 0;
    return { name: p.name, budget: p.budget, status: p.status, progress: avgProgress };
  });

  // 3. Pending tasks count
  let taskQuery: any;
  if (role === Role.OFFICE_ENGINEER) {
    taskQuery = { assigneeId: userId, status: { not: OrderStatus.COMPLETED } };
  } else if (role === Role.PROJECT_MANAGER) {
    taskQuery = { project: { managerId: userId }, status: { not: OrderStatus.COMPLETED } };
  } else {
    taskQuery = { status: { not: OrderStatus.COMPLETED } };
  }

  const pendingTasksCount = await prisma.task.count({ where: taskQuery });

  // 4. Pending change orders
  let coQuery: any;
  if (role === Role.OFFICE_ENGINEER) {
    coQuery = { project: { engineers: { some: { id: userId } } }, status: OrderStatus.PENDING_APPROVAL };
  } else if (role === Role.PROJECT_MANAGER) {
    coQuery = { project: { managerId: userId }, status: OrderStatus.PENDING_APPROVAL };
  } else {
    coQuery = { status: OrderStatus.PENDING_APPROVAL };
  }
  const pendingChangeOrdersCount = await prisma.changeOrder.count({ where: coQuery });

  // 5. Low stock count
  const allMaterials = await prisma.material.findMany({
    select: { stockCount: true, minStock: true },
  });
  const lowStockCount = allMaterials.filter(m => m.stockCount <= m.minStock).length;

  // 6. Overall avg task progress (weighted)
  let totalTasks = 0;
  let accumulatedProgress = 0;
  projects.forEach(p => {
    p.tasks.forEach(t => {
      totalTasks++;
      accumulatedProgress += t.progress;
    });
  });
  const avgProgress = totalTasks > 0 ? Math.round(accumulatedProgress / totalTasks) : 0;

  // 7. Recent activity feed
  const recentTasks = await prisma.task.findMany({
    where: taskQuery,
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, title: true, status: true, progress: true, updatedAt: true },
  });

  const recentCOs = await prisma.changeOrder.findMany({
    where: coQuery,
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  const recentActivities = [
    ...recentTasks.map(t => ({
      id: `task-${t.id}`,
      description: `Task updated: "${t.title}" — ${t.status.replace(/_/g, " ")} (${t.progress}%)`,
      date: t.updatedAt.toISOString(),
    })),
    ...recentCOs.map(co => ({
      id: `co-${co.id}`,
      description: `Change Order: "${co.title}" is ${co.status.replace(/_/g, " ")}`,
      date: co.updatedAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <OverviewDashboard
      stats={{
        activeProjects: activeProjectsCount || projects.length,
        pendingTasks: pendingTasksCount,
        lowStockMaterialsCount: lowStockCount,
        pendingChangeOrdersCount,
        totalBudget,
        avgProgress,
      }}
      charts={{ projectsData, recentActivities }}
      currentUser={{ role, firstName: session.firstName }}
    />
  );
}

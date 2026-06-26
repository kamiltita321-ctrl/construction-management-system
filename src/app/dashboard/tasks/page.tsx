import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import TasksDashboard from "./TasksDashboard";

export default async function TasksPage() {
  const session = await requireAuth();
  const { role, userId } = session;

  // 1. Fetch Work Orders (Tasks) matching permissions
  let tasks;
  if (role === Role.SITE_ENGINEER) {
    tasks = await prisma.task.findMany({
      where: {
        project: {
          engineers: { some: { id: userId } }
        }
      },
      include: {
        project: { select: { name: true, code: true } },
        assignee: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  } else if (role === Role.PROJECT_MANAGER) {
    tasks = await prisma.task.findMany({
      where: {
        project: { managerId: userId }
      },
      include: {
        project: { select: { name: true, code: true } },
        assignee: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  } else {
    tasks = await prisma.task.findMany({
      include: {
        project: { select: { name: true, code: true } },
        assignee: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  // 2. Fetch Change Orders matching permissions
  let changeOrders;
  if (role === Role.SITE_ENGINEER) {
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
    changeOrders = await prisma.changeOrder.findMany({
      include: {
        project: { select: { name: true, code: true } },
        requester: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // 3. Fetch active projects list for options
  let projects;
  if (role === Role.SITE_ENGINEER) {
    projects = await prisma.project.findMany({
      where: { engineers: { some: { id: userId } } },
      select: { id: true, name: true, code: true },
    });
  } else if (role === Role.PROJECT_MANAGER) {
    projects = await prisma.project.findMany({
      where: { managerId: userId },
      select: { id: true, name: true, code: true },
    });
  } else {
    projects = await prisma.project.findMany({
      select: { id: true, name: true, code: true },
    });
  }

  // 4. Fetch site engineers list for assignments
  const engineers = await prisma.user.findMany({
    where: { role: Role.SITE_ENGINEER, isActive: true },
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  // Serialize models to plain items
  const serializedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    dueDate: t.dueDate.toISOString().split("T")[0],
    status: t.status,
    type: t.type,
    progress: t.progress,
    projectId: t.projectId,
    project: t.project,
    assigneeId: t.assigneeId,
    assignee: t.assignee,
  }));

  const serializedCOs = changeOrders.map((co) => ({
    id: co.id,
    title: co.title,
    description: co.description,
    estimatedCost: co.estimatedCost,
    status: co.status,
    rejectionReason: co.rejectionReason,
    projectId: co.projectId,
    project: co.project,
    requester: co.requester,
    approver: co.approver,
  }));

  return (
    <TasksDashboard
      initialTasks={serializedTasks}
      initialChangeOrders={serializedCOs}
      projects={projects}
      engineers={engineers}
      currentUser={{
        id: session.userId,
        email: session.email,
        role: session.role,
        firstName: session.firstName,
        lastName: session.lastName,
      }}
    />
  );
}

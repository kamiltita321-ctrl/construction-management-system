import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ProjectWorkspace from "./ProjectWorkspace";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { role, userId } = session;
  const { id } = await params;

  // 1. Fetch project details
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      manager: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
      engineers: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
      milestones: {
        orderBy: { dueDate: "asc" },
      },
      tasks: {
        include: {
          assignee: { select: { firstName: true, lastName: true } }
        },
        orderBy: { dueDate: "asc" }
      },
      changeOrders: {
        include: {
          requester: { select: { firstName: true, lastName: true } },
          approver: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: "desc" }
      },
      materials: {
        include: {
          material: true,
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // 2. Access control check
  const isExecutive =
    role === Role.SYSTEM_ADMIN ||
    role === Role.GENERAL_MANAGER ||
    role === Role.DEPUTY_GENERAL_MANAGER ||
    role === Role.VP_OF_CONSTRUCTION;

  const isAssignedPM = role === Role.PROJECT_MANAGER && project.managerId === userId;
  const isAssignedField =
    (role === Role.OFFICE_ENGINEER || role === Role.CONSTRUCTION_ENGINEER) &&
    project.engineers.some((e) => e.id === userId);

  if (!isExecutive && !isAssignedPM && !isAssignedField) {
    redirect("/forbidden");
  }

  // 3. Fetch reports & summaries scoped to project
  const reports = await prisma.dailyReport.findMany({
    where: { projectId: id },
    include: {
      project: { select: { id: true, name: true, code: true } },
      submitter: { select: { firstName: true, lastName: true } },
      materialUsage: true,
      photos: true
    },
    orderBy: { reportDate: "desc" }
  });

  const summaries = await prisma.summaryReport.findMany({
    where: { projectId: id },
    include: {
      project: { select: { id: true, name: true, code: true } },
      compiler: { select: { firstName: true, lastName: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  // Serialize objects for client hydration
  const serializedProject = {
    id: project.id,
    name: project.name,
    code: project.code,
    description: project.description,
    location: project.location,
    startDate: project.startDate.toISOString().split("T")[0],
    endDate: project.endDate ? project.endDate.toISOString().split("T")[0] : null,
    status: project.status,
    budget: project.budget,
    category: (project as any).category || "BUILDING",
    lagReason: (project as any).lagReason || null,
    manager: project.manager,
    engineers: project.engineers,
    milestones: project.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      dueDate: m.dueDate.toISOString().split("T")[0],
      isCompleted: m.isCompleted,
    })),
    materials: project.materials,
    documents: project.documents.map((d) => ({
      id: d.id,
      title: d.title,
      fileUrl: d.fileUrl,
      fileType: d.fileType,
      fileSize: d.fileSize,
      uploadedBy: d.uploadedBy,
      createdAt: d.createdAt.toISOString(),
    })),
  };

  const serializedTasks = project.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    dueDate: t.dueDate.toISOString().split("T")[0],
    status: t.status,
    type: t.type,
    progress: t.progress,
    projectId: t.projectId,
    assigneeId: t.assigneeId,
    assignee: t.assignee
  }));

  const serializedCOs = project.changeOrders.map((co) => ({
    id: co.id,
    title: co.title,
    description: co.description,
    estimatedCost: co.estimatedCost,
    status: co.status,
    rejectionReason: co.rejectionReason,
    projectId: co.projectId,
    requester: co.requester,
    approver: co.approver
  }));

  const serializedReports = reports.map((r) => ({
    id: r.id,
    reportDate: r.reportDate.toISOString().split("T")[0],
    workCompleted: r.workCompleted,
    issuesFaced: r.issuesFaced,
    weather: r.weather,
    isApproved: r.isApproved,
    approvedBy: r.approvedBy,
    project: r.project,
    submitter: r.submitter,
    materialUsage: r.materialUsage.map((u) => ({
      id: u.id,
      materialName: u.materialName,
      quantityUsed: u.quantityUsed
    })),
    photos: r.photos.map((p) => ({
      id: p.id,
      fileUrl: p.fileUrl,
      caption: p.caption
    }))
  }));

  const serializedSummaries = summaries.map((s) => ({
    id: s.id,
    title: s.title,
    reportType: s.reportType,
    startDate: s.startDate.toISOString().split("T")[0],
    endDate: s.endDate.toISOString().split("T")[0],
    commentary: s.commentary,
    project: s.project,
    compiler: s.compiler
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Breadcrumbs / Header Banner */}
      <div>
        <div style={{ display: "flex", gap: "8px", fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" }}>
          <Link href="/dashboard/projects" style={{ color: "var(--text-muted)" }}>
            Projects
          </Link>
          <span>/</span>
          <span style={{ color: "var(--text-secondary)" }}>{project.code}</span>
        </div>
        <h2 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px" }}>{project.name}</h2>
      </div>

      <ProjectWorkspace
        project={serializedProject as any}
        initialTasks={serializedTasks}
        initialChangeOrders={serializedCOs}
        initialReports={serializedReports}
        initialSummaries={serializedSummaries}
        currentUser={{
          id: userId,
          role,
          firstName: session.firstName,
          lastName: session.lastName,
          email: session.email
        }}
      />
    </div>
  );
}

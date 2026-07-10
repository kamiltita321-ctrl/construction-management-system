import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import ReportsDashboard from "./ReportsDashboard";
import SummaryDashboard from "./SummaryDashboard";
import ReportsTabsLayout from "./ReportsTabsLayout";

export default async function ReportsPage() {
  const session = await requireAuth();
  const { role, userId } = session;

  // 1. Fetch daily reports matching permissions
  let reports;
  if (role === Role.OFFICE_ENGINEER) {
    // Site Engineers see reports they submitted, OR approved reports for their assigned projects
    reports = await prisma.dailyReport.findMany({
      where: {
        OR: [
          { submitterId: userId },
          {
            project: { engineers: { some: { id: userId } } },
            isApproved: true
          }
        ]
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        submitter: { select: { firstName: true, lastName: true } },
        materialUsage: true,
        photos: true
      },
      orderBy: { reportDate: "desc" }
    });
  } else if (role === Role.PROJECT_MANAGER) {
    // PMs see all reports on projects they manage (pending or approved)
    reports = await prisma.dailyReport.findMany({
      where: { project: { managerId: userId } },
      include: {
        project: { select: { id: true, name: true, code: true } },
        submitter: { select: { firstName: true, lastName: true } },
        materialUsage: true,
        photos: true
      },
      orderBy: { reportDate: "desc" }
    });
  } else {
    // Admin, GM, DGM, VP see all reports
    reports = await prisma.dailyReport.findMany({
      include: {
        project: { select: { id: true, name: true, code: true } },
        submitter: { select: { firstName: true, lastName: true } },
        materialUsage: true,
        photos: true
      },
      orderBy: { reportDate: "desc" }
    });
  }

  // 2. Fetch projects details (with allocated materials) that user has access to
  let projects;
  if (role === Role.OFFICE_ENGINEER) {
    projects = await prisma.project.findMany({
      where: { engineers: { some: { id: userId } } },
      select: {
        id: true,
        name: true,
        code: true,
        materials: {
          include: {
            material: { select: { id: true, name: true, unit: true } }
          }
        }
      }
    });
  } else if (role === Role.PROJECT_MANAGER) {
    projects = await prisma.project.findMany({
      where: { managerId: userId },
      select: {
        id: true,
        name: true,
        code: true,
        materials: {
          include: {
            material: { select: { id: true, name: true, unit: true } }
          }
        }
      }
    });
  } else {
    projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        materials: {
          include: {
            material: { select: { id: true, name: true, unit: true } }
          }
        }
      }
    });
  }

  // 3. Fetch summary reports
  let summaries: any[] = [];
  if (role === Role.OFFICE_ENGINEER) {
    summaries = []; // Site Engineers do not have access to Weekly/Monthly Reports features
  } else if (role === Role.PROJECT_MANAGER) {
    summaries = await prisma.summaryReport.findMany({
      where: { project: { managerId: userId } },
      include: {
        project: { select: { id: true, name: true, code: true } },
        compiler: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  } else {
    summaries = await prisma.summaryReport.findMany({
      include: {
        project: { select: { id: true, name: true, code: true } },
        compiler: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  // Serialize objects for client hydration
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

  const serializedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    materials: p.materials.map((m) => ({
      material: {
        id: m.material.id,
        name: m.material.name,
        unit: m.material.unit
      }
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

  const reportsDashboard = (
    <ReportsDashboard
      initialReports={serializedReports}
      projects={serializedProjects}
      currentUser={{
        id: userId,
        role,
        firstName: session.firstName,
        lastName: session.lastName
      }}
    />
  );

  const summaryDashboard = (
    <SummaryDashboard
      initialSummaries={serializedSummaries}
      projects={serializedProjects}
      currentUser={{ role }}
    />
  );

  return (
    <ReportsTabsLayout
      reportsDashboard={reportsDashboard}
      summaryDashboard={summaryDashboard}
      isSiteEngineer={role === Role.OFFICE_ENGINEER}
    />
  );
}

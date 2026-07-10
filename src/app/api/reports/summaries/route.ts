import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// GET /api/reports/summaries - Fetch compiled reports or perform dynamic compilation aggregation preview
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    if (role === Role.OFFICE_ENGINEER) {
      return NextResponse.json({ error: "Access denied. Office Engineers do not have access to Weekly/Monthly Reports features." }, { status: 403 });
    }
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode"); // "preview" or "list"
    const projectId = url.searchParams.get("projectId");

    if (mode === "preview") {
      const startDateStr = url.searchParams.get("startDate");
      const endDateStr = url.searchParams.get("endDate");

      if (!projectId || !startDateStr || !endDateStr) {
        return NextResponse.json({ error: "Missing preview fields: projectId, startDate, endDate" }, { status: 400 });
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999); // set to end of day

      // Retrieve all approved daily reports in range
      const approvedReports = await prisma.dailyReport.findMany({
        where: {
          projectId,
          reportDate: {
            gte: startDate,
            lte: endDate
          },
          isApproved: true
        },
        include: {
          materialUsage: true,
          submitter: { select: { firstName: true, lastName: true } }
        },
        orderBy: { reportDate: "asc" }
      });

      // Aggregate outputs
      const workCompletedSummary = approvedReports.map(r => `[${r.reportDate.toISOString().split("T")[0]}] ${r.workCompleted}`).join("\n\n");
      const issuesSummary = approvedReports.filter(r => r.issuesFaced).map(r => `[${r.reportDate.toISOString().split("T")[0]}] ${r.issuesFaced}`).join("\n\n");
      
      // Sum material usage
      const materialTotals: { [name: string]: number } = {};
      approvedReports.flatMap(r => r.materialUsage).forEach(u => {
        materialTotals[u.materialName] = (materialTotals[u.materialName] || 0) + u.quantityUsed;
      });

      const aggregatedMaterials = Object.keys(materialTotals).map(name => ({
        materialName: name,
        totalUsed: materialTotals[name]
      }));

      return NextResponse.json({
        preview: {
          workCompletedSummary,
          issuesSummary,
          aggregatedMaterials,
          daysLogged: approvedReports.length
        }
      });
    }

    // List mode
    let summaries;
    if (role === Role.OFFICE_ENGINEER) {
      summaries = await prisma.summaryReport.findMany({
        where: {
          project: { engineers: { some: { id: userId } } },
          projectId: projectId || undefined
        },
        include: {
          project: { select: { id: true, name: true, code: true } },
          compiler: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: "desc" }
      });
    } else if (role === Role.PROJECT_MANAGER) {
      summaries = await prisma.summaryReport.findMany({
        where: {
          project: { managerId: userId },
          projectId: projectId || undefined
        },
        include: {
          project: { select: { id: true, name: true, code: true } },
          compiler: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: "desc" }
      });
    } else {
      summaries = await prisma.summaryReport.findMany({
        where: {
          projectId: projectId || undefined
        },
        include: {
          project: { select: { id: true, name: true, code: true } },
          compiler: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: "desc" }
      });
    }

    return NextResponse.json({ summaries });
  } catch (error: any) {
    console.error("GET /api/reports/summaries error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/reports/summaries - Create and compile a SummaryReport
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    // Only PMs, Admins, GMs, VPs can compile summaries
    if (role === Role.OFFICE_ENGINEER) {
      return NextResponse.json({ error: "Access denied to compile reports" }, { status: 403 });
    }

    const body = await req.json();
    const { title, reportType, startDate, endDate, commentary, projectId } = body;

    if (!title || !reportType || !startDate || !endDate || !projectId) {
      return NextResponse.json({ error: "Missing required summary fields" }, { status: 400 });
    }

    const summaryReport = await prisma.summaryReport.create({
      data: {
        title,
        reportType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        commentary: commentary || null,
        projectId,
        compilerId: userId
      }
    });

    return NextResponse.json({ summaryReport }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/reports/summaries error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

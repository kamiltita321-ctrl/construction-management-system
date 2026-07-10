import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// GET /api/reports/summaries/[id] - Fetch single summary details and dynamic aggregated items for viewing/exporting
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    if (auth.session.role === Role.OFFICE_ENGINEER) {
      return NextResponse.json({ error: "Access denied. Office Engineers do not have access to Weekly/Monthly Reports." }, { status: 403 });
    }

    const { id } = await params;

    const summary = await prisma.summaryReport.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, code: true, location: true, budget: true } },
        compiler: { select: { firstName: true, lastName: true, email: true } }
      }
    });

    if (!summary) {
      return NextResponse.json({ error: "Summary report not found" }, { status: 404 });
    }

    // Retrieve approved daily site logs in the summary's dates window to build the dynamic print/PDF layout
    const approvedReports = await prisma.dailyReport.findMany({
      where: {
        projectId: summary.projectId,
        reportDate: {
          gte: summary.startDate,
          lte: summary.endDate
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
    const workCompletedLogs = approvedReports.map(r => ({
      date: r.reportDate.toISOString().split("T")[0],
      submitter: `${r.submitter.firstName} ${r.submitter.lastName}`,
      workCompleted: r.workCompleted,
      weather: r.weather
    }));

    const issuesLogs = approvedReports
      .filter(r => r.issuesFaced)
      .map(r => ({
        date: r.reportDate.toISOString().split("T")[0],
        submitter: `${r.submitter.firstName} ${r.submitter.lastName}`,
        issuesFaced: r.issuesFaced
      }));

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
      summary,
      details: {
        workCompletedLogs,
        issuesLogs,
        aggregatedMaterials,
        daysCount: approvedReports.length
      }
    });
  } catch (error: any) {
    console.error("GET /api/reports/summaries/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

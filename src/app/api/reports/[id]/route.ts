import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// PUT /api/reports/[id] - Approve site daily report
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const { role, userId } = auth.session;

    const report = await prisma.dailyReport.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!report) {
      return NextResponse.json({ error: "Daily report not found" }, { status: 404 });
    }

    // Only Project Managers can review and approve daily reports
    const isAuthorized = role === Role.PROJECT_MANAGER && report.project.managerId === userId;
 
    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied to approve this report. Only the assigned Project Manager can approve reports." }, { status: 403 });
    }

    const body = await req.json();
    const { isApproved } = body;

    if (isApproved === undefined) {
      return NextResponse.json({ error: "Missing required parameter: isApproved" }, { status: 400 });
    }

    const updatedReport = await prisma.dailyReport.update({
      where: { id },
      data: {
        isApproved: !!isApproved,
        approvedBy: isApproved ? `${auth.session.firstName} ${auth.session.lastName}` : null
      }
    });

    return NextResponse.json({ report: updatedReport });
  } catch (error: any) {
    console.error("PUT /api/reports/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

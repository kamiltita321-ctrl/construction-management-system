import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// PUT /api/reports/[id] - Update or Approve site daily report
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const { role, userId, firstName, lastName } = auth.session;

    const report = await prisma.dailyReport.findUnique({
      where: { id },
      include: {
        project: true,
        materialUsage: true,
      }
    });

    if (!report) {
      return NextResponse.json({ error: "Daily report not found" }, { status: 404 });
    }

    const body = await req.json();
    const { action, isApproved, workCompleted, issuesFaced, weather, dailyCost, dailyProfit, lagReason, materials } = body;

    // Handle PM Approval Flow
    if (action === "approve" || isApproved !== undefined) {
      const isAuthorizedPM = role === Role.PROJECT_MANAGER && report.project.managerId === userId;
      const isAuthorizedExec =
        role === Role.SYSTEM_ADMIN ||
        role === Role.GENERAL_MANAGER ||
        role === Role.DEPUTY_GENERAL_MANAGER ||
        role === Role.VP_OF_CONSTRUCTION;

      if (!isAuthorizedPM && !isAuthorizedExec) {
        return NextResponse.json({ error: "Access denied to approve this report. Only Project Managers or Executives can approve." }, { status: 403 });
      }

      const updatedReport = await prisma.dailyReport.update({
        where: { id },
        data: {
          isApproved: !!isApproved,
          approvedBy: isApproved ? `${firstName} ${lastName}` : null,
          lastEditedBy: `${firstName} ${lastName}`,
          lastEditedRole: role,
          lastEditedAt: new Date(),
        }
      });

      return NextResponse.json({ report: updatedReport });
    }

    // Handle Edit/Update Flow
    // Allowed to edit: original submitter, assigned PM, or Executives
    const isAuthorizedSubmitter = report.submitterId === userId;
    const isAuthorizedPM = role === Role.PROJECT_MANAGER && report.project.managerId === userId;
    const isAuthorizedExec =
      role === Role.SYSTEM_ADMIN ||
      role === Role.GENERAL_MANAGER ||
      role === Role.DEPUTY_GENERAL_MANAGER ||
      role === Role.VP_OF_CONSTRUCTION;

    if (!isAuthorizedSubmitter && !isAuthorizedPM && !isAuthorizedExec) {
      return NextResponse.json({ error: "Access denied to edit this report." }, { status: 403 });
    }

    if (!workCompleted) {
      return NextResponse.json({ error: "Missing required field: workCompleted" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Rollback old material consumption allocation
      for (const oldUsage of report.materialUsage) {
        const mat = await tx.material.findFirst({ where: { name: oldUsage.materialName } });
        if (mat) {
          const allocation = await tx.materialAllocation.findFirst({
            where: { projectId: report.projectId, materialId: mat.id }
          });
          if (allocation) {
            await tx.materialAllocation.update({
              where: { id: allocation.id },
              data: { consumedQty: { decrement: oldUsage.quantityUsed } }
            });
          }
        }
      }

      // Delete old material usage records
      await tx.reportMaterialUsage.deleteMany({
        where: { dailyReportId: id }
      });

      // 2. Add new material usage records & increment allocations
      if (materials && Array.isArray(materials)) {
        for (const mat of materials) {
          const { materialId, quantityUsed } = mat;
          const usage = parseFloat(quantityUsed);
          if (isNaN(usage) || usage <= 0) continue;

          const dbMaterial = await tx.material.findUnique({ where: { id: materialId } });
          if (!dbMaterial) continue;

          await tx.reportMaterialUsage.create({
            data: { dailyReportId: id, materialName: dbMaterial.name, quantityUsed: usage },
          });

          const allocation = await tx.materialAllocation.findFirst({
            where: { projectId: report.projectId, materialId },
          });
          if (allocation) {
            await tx.materialAllocation.update({
              where: { id: allocation.id },
              data: { consumedQty: { increment: usage } },
            });
          }
        }
      }

      // 3. Update report content + write stamp
      const updatedReport = await tx.dailyReport.update({
        where: { id },
        data: {
          workCompleted,
          issuesFaced: issuesFaced || null,
          weather: weather || null,
          dailyCost: dailyCost ? parseFloat(dailyCost) : null,
          dailyProfit: dailyProfit ? parseFloat(dailyProfit) : null,
          lagReason: lagReason || null,
          lastEditedBy: `${firstName} ${lastName}`,
          lastEditedRole: role,
          lastEditedAt: new Date(),
        }
      });

      return updatedReport;
    });

    return NextResponse.json({ report: result });
  } catch (error: any) {
    console.error("PUT /api/reports/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

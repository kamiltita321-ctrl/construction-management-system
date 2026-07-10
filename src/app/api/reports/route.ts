import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// GET /api/reports - Fetch daily reports for projects
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");

    let reports;
    if (role === Role.OFFICE_ENGINEER || role === Role.CONSTRUCTION_ENGINEER) {
      // Field engineers see reports they submitted, OR approved reports for their assigned projects
      reports = await prisma.dailyReport.findMany({
        where: {
          OR: [
            { submitterId: userId },
            {
              project: { engineers: { some: { id: userId } } },
              isApproved: true,
            },
          ],
          projectId: projectId || undefined,
        },
        include: {
          project: { select: { id: true, name: true, code: true } },
          submitter: { select: { firstName: true, lastName: true } },
          materialUsage: true,
          photos: true,
        },
        orderBy: { reportDate: "desc" },
      });
    } else if (role === Role.PROJECT_MANAGER) {
      // PMs see reports on projects they manage
      reports = await prisma.dailyReport.findMany({
        where: {
          project: { managerId: userId },
          projectId: projectId || undefined,
        },
        include: {
          project: { select: { id: true, name: true, code: true } },
          submitter: { select: { firstName: true, lastName: true } },
          materialUsage: true,
          photos: true,
        },
        orderBy: { reportDate: "desc" },
      });
    } else {
      // Executives/Admins see all reports
      reports = await prisma.dailyReport.findMany({
        where: {
          projectId: projectId || undefined,
        },
        include: {
          project: { select: { id: true, name: true, code: true } },
          submitter: { select: { firstName: true, lastName: true } },
          materialUsage: true,
          photos: true,
        },
        orderBy: { reportDate: "desc" },
      });
    }

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/reports - Create new Daily Report (Office Engineer submits)
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;

    // Only Office Engineers can submit daily site reports
    if (role !== Role.OFFICE_ENGINEER) {
      return NextResponse.json(
        { error: "Access denied. Only Office Engineers can submit daily reports." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { projectId, reportDate, workCompleted, issuesFaced, weather, photos, materials } = body;

    if (!projectId || !reportDate || !workCompleted) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, reportDate, workCompleted" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(reportDate);

    // Check if daily report already exists for this project on this date
    const exists = await prisma.dailyReport.findFirst({
      where: { projectId, reportDate: parsedDate },
    });

    if (exists) {
      return NextResponse.json(
        { error: "A daily report has already been logged for this project on this date" },
        { status: 400 }
      );
    }

    // Process daily report creation in a Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.dailyReport.create({
        data: {
          projectId,
          reportDate: parsedDate,
          workCompleted,
          issuesFaced: issuesFaced || null,
          weather: weather || null,
          submitterId: userId,
          isApproved: false,
        },
      });

      if (photos && Array.isArray(photos)) {
        for (const photo of photos) {
          await tx.reportPhoto.create({
            data: {
              fileUrl: photo.fileUrl,
              caption: photo.caption || null,
              dailyReportId: report.id,
            },
          });
        }
      }

      if (materials && Array.isArray(materials)) {
        for (const mat of materials) {
          const { materialId, quantityUsed } = mat;
          const usage = parseFloat(quantityUsed);
          if (isNaN(usage) || usage <= 0) continue;

          const dbMaterial = await tx.material.findUnique({ where: { id: materialId } });
          if (!dbMaterial) continue;

          await tx.reportMaterialUsage.create({
            data: { dailyReportId: report.id, materialName: dbMaterial.name, quantityUsed: usage },
          });

          const allocation = await tx.materialAllocation.findFirst({
            where: { projectId, materialId },
          });
          if (allocation) {
            await tx.materialAllocation.update({
              where: { id: allocation.id },
              data: { consumedQty: { increment: usage } },
            });
          }
        }
      }

      return report;
    });

    return NextResponse.json({ report: result }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

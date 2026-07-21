import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role, OrderStatus } from "@prisma/client";

// ── Pipeline stage definitions ──
// INITIATED → SE_EXECUTION → CE_QC_REVIEW → PM_APPROVAL → CONSULTANT_REVIEW → COMPLETED
const STAGE_LABELS: Record<string, string> = {
  INITIATED:          "Initiated by CE",
  SE_EXECUTION:       "Site Engineer Execution",
  CE_QC_REVIEW:       "CE Final Technical Check",
  PM_APPROVAL:        "Project Manager Approval",
  CONSULTANT_REVIEW:  "Consultant Review",
  COMPLETED:          "Completed",
};

function isExecutive(role: string) {
  const execRoles: string[] = [
    Role.SYSTEM_ADMIN,
    Role.GENERAL_MANAGER,
    Role.DEPUTY_GENERAL_MANAGER,
    Role.VP_OF_CONSTRUCTION,
  ];
  return execRoles.includes(role);
}

// PUT /api/tasks/[id] - Advance or return Work Order through pipeline
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          include: { engineers: { select: { id: true, role: true } } },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Work order not found." }, { status: 404 });
    }

    const body = await req.json();
    const { action, progress, title, description, dueDate, assigneeId, comment } = body;

    const isCE = role === Role.CONSTRUCTION_ENGINEER;
    const isSE = role === Role.SITE_ENGINEER;
    const isPM = role === Role.PROJECT_MANAGER;
    const isExec = isExecutive(role);

    // ── Progress / metadata update (not a stage transition) ──
    if (action === "update_progress" || (!action && progress !== undefined && !body.action)) {
      const canUpdateProgress =
        isExec || isPM || isCE || isSE ||
        role === Role.OFFICE_ENGINEER;

      if (!canUpdateProgress) {
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }

      const updateData: any = {};
      if (progress !== undefined) updateData.progress = Math.min(Math.max(parseInt(progress) || 0, 0), 100);
      if (title !== undefined && (isExec || isPM || isCE)) updateData.title = title;
      if (description !== undefined && (isExec || isPM || isCE)) updateData.description = description;
      if (dueDate !== undefined && (isExec || isPM || isCE)) updateData.dueDate = new Date(dueDate);
      if (assigneeId !== undefined && (isExec || isPM)) updateData.assigneeId = assigneeId || null;
      if (updateData.progress === 100) updateData.status = OrderStatus.COMPLETED;

      const updated = await prisma.task.update({ where: { id }, data: updateData });
      return NextResponse.json({ task: updated });
    }

    // ── Stage transition actions ──
    const stage = task.workflowStage;

    switch (action) {
      // CE submits to Site Engineer
      case "submit_to_se": {
        if (!isCE && !isExec) {
          return NextResponse.json({ error: "Only the Construction Engineer can submit to Site Engineer." }, { status: 403 });
        }
        if (stage !== "INITIATED") {
          return NextResponse.json({ error: `Cannot submit: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.task.update({
          where: { id },
          data: {
            workflowStage: "SE_EXECUTION",
            status: OrderStatus.IN_PROGRESS,
          },
        });
        return NextResponse.json({ task: updated });
      }

      // SE submits back to CE for final QC
      case "se_submit_to_ce": {
        if (!isSE && !isExec) {
          return NextResponse.json({ error: "Only the Site Engineer can submit back to CE." }, { status: 403 });
        }
        if (stage !== "SE_EXECUTION") {
          return NextResponse.json({ error: `Cannot submit: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.task.update({
          where: { id },
          data: { workflowStage: "CE_QC_REVIEW" },
        });
        return NextResponse.json({ task: updated });
      }

      // SE returns to CE for correction
      case "se_return_to_ce": {
        if (!isSE && !isExec) {
          return NextResponse.json({ error: "Only the Site Engineer can return to CE." }, { status: 403 });
        }
        if (stage !== "SE_EXECUTION") {
          return NextResponse.json({ error: `Cannot return: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.task.update({
          where: { id },
          data: { workflowStage: "INITIATED" },
        });
        return NextResponse.json({ task: updated });
      }

      // CE approves final QC and sends to PM
      case "ce_approve_to_pm": {
        if (!isCE && !isExec) {
          return NextResponse.json({ error: "Only the Construction Engineer can submit to Project Manager." }, { status: 403 });
        }
        if (stage !== "CE_QC_REVIEW") {
          return NextResponse.json({ error: `Cannot submit: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.task.update({
          where: { id },
          data: {
            workflowStage: "PM_APPROVAL",
            status: OrderStatus.PENDING_APPROVAL,
          },
        });
        return NextResponse.json({ task: updated });
      }

      // CE returns from QC stage back to SE
      case "ce_return_to_se": {
        if (!isCE && !isExec) {
          return NextResponse.json({ error: "Only the Construction Engineer can return to Site Engineer." }, { status: 403 });
        }
        if (stage !== "CE_QC_REVIEW") {
          return NextResponse.json({ error: `Cannot return: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.task.update({
          where: { id },
          data: { workflowStage: "SE_EXECUTION" },
        });
        return NextResponse.json({ task: updated });
      }

      // PM approves and forwards to Consultant
      case "pm_approve": {
        if (!isPM && !isExec) {
          return NextResponse.json({ error: "Only the Project Manager can approve." }, { status: 403 });
        }
        if (stage !== "PM_APPROVAL") {
          return NextResponse.json({ error: `Cannot approve: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        // PM must manage this project
        if (isPM && task.project.managerId !== userId) {
          return NextResponse.json({ error: "You do not manage this project." }, { status: 403 });
        }
        const updated = await prisma.task.update({
          where: { id },
          data: {
            workflowStage: "CONSULTANT_REVIEW",
            status: OrderStatus.APPROVED,
          },
        });
        return NextResponse.json({ task: updated });
      }

      // PM rejects and returns to CE
      case "pm_reject": {
        if (!isPM && !isExec) {
          return NextResponse.json({ error: "Only the Project Manager can reject." }, { status: 403 });
        }
        if (stage !== "PM_APPROVAL") {
          return NextResponse.json({ error: `Cannot reject: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        if (isPM && task.project.managerId !== userId) {
          return NextResponse.json({ error: "You do not manage this project." }, { status: 403 });
        }
        const updated = await prisma.task.update({
          where: { id },
          data: {
            workflowStage: "INITIATED",
            status: OrderStatus.REJECTED,
          },
        });
        return NextResponse.json({ task: updated });
      }

      // PM returns to CE for correction without rejection
      case "pm_return": {
        if (!isPM && !isExec) {
          return NextResponse.json({ error: "Only the Project Manager can return for correction." }, { status: 403 });
        }
        if (stage !== "PM_APPROVAL") {
          return NextResponse.json({ error: `Cannot return: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        if (isPM && task.project.managerId !== userId) {
          return NextResponse.json({ error: "You do not manage this project." }, { status: 403 });
        }
        const updated = await prisma.task.update({
          where: { id },
          data: { workflowStage: "CE_QC_REVIEW" },
        });
        return NextResponse.json({ task: updated });
      }

      // Consultant accepts
      case "consultant_accept": {
        if (!isExec && !isPM) {
          return NextResponse.json({ error: "Only executive roles can act as Consultant." }, { status: 403 });
        }
        if (stage !== "CONSULTANT_REVIEW") {
          return NextResponse.json({ error: `Cannot accept: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.task.update({
          where: { id },
          data: {
            workflowStage: "COMPLETED",
            status: OrderStatus.COMPLETED,
            progress: 100,
          },
        });
        return NextResponse.json({ task: updated });
      }

      // Consultant rejects
      case "consultant_reject": {
        if (!isExec && !isPM) {
          return NextResponse.json({ error: "Only executive roles can act as Consultant." }, { status: 403 });
        }
        if (stage !== "CONSULTANT_REVIEW") {
          return NextResponse.json({ error: `Cannot reject: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.task.update({
          where: { id },
          data: {
            workflowStage: "PM_APPROVAL",
            status: OrderStatus.PENDING_APPROVAL,
          },
        });
        return NextResponse.json({ task: updated });
      }

      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("PUT /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Delete work order (PM or Executive only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;

    const canDelete =
      isExecutive(role) || role === Role.PROJECT_MANAGER;

    if (!canDelete) {
      return NextResponse.json({ error: "Only project managers or leadership can delete work orders." }, { status: 403 });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: { select: { managerId: true } } },
    });

    if (!task) {
      return NextResponse.json({ error: "Work order not found." }, { status: 404 });
    }

    if (role === Role.PROJECT_MANAGER && task.project.managerId !== userId) {
      return NextResponse.json({ error: "You do not manage this project." }, { status: 403 });
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

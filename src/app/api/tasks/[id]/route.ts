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
    const actorName = `${auth.session.firstName} ${auth.session.lastName}`;
    const returnReason = body.returnReason || body.rejectionReason || body.note || comment || "";

    // Load task history to inspect previous actors for self-approval checks
    const taskHistories = await prisma.taskHistory.findMany({ where: { taskId: id } });

    const getActorOfAction = (act: string) => {
      const entry = taskHistories.slice().reverse().find((h: any) => h.action === act);
      return entry ? entry.actorId : null;
    };

    let nextStage = stage;
    let nextStatus = task.status;

    switch (action) {
      case "submit_to_se": {
        if (!isCE && !isExec) {
          return NextResponse.json({ error: "Only the Construction Engineer can submit to Site Engineer." }, { status: 403 });
        }
        if (stage !== "INITIATED") {
          return NextResponse.json({ error: `Cannot submit: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        
        nextStage = "SE_EXECUTION";
        nextStatus = OrderStatus.IN_PROGRESS;
        break;
      }

      case "se_submit_to_ce": {
        if (!isSE && !isExec) {
          return NextResponse.json({ error: "Only the Site Engineer can submit back to CE." }, { status: 403 });
        }
        if (stage !== "SE_EXECUTION") {
          return NextResponse.json({ error: `Cannot submit: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        
        // Prevent self-approval: SE actor cannot be task creator (CE)
        if (task.creatorId === userId) {
          return NextResponse.json({ error: "Self-approval prevention: As the creator of this Work Order, you cannot submit execution review for yourself." }, { status: 400 });
        }

        nextStage = "CE_QC_REVIEW";
        break;
      }

      case "se_return_to_ce": {
        if (!isSE && !isExec) {
          return NextResponse.json({ error: "Only the Site Engineer can return to CE." }, { status: 403 });
        }
        if (stage !== "SE_EXECUTION") {
          return NextResponse.json({ error: `Cannot return: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        if (!returnReason.trim()) {
          return NextResponse.json({ error: "A return reason is required." }, { status: 400 });
        }

        nextStage = "INITIATED";
        break;
      }

      case "ce_approve_to_pm": {
        if (!isCE && !isExec) {
          return NextResponse.json({ error: "Only the Construction Engineer can submit to Project Manager." }, { status: 403 });
        }
        if (stage !== "CE_QC_REVIEW") {
          return NextResponse.json({ error: `Cannot submit: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }

        // Prevent self-approval: CE verifying cannot be same user who did SE execution
        const seActorId = getActorOfAction("se_submit_to_ce");
        if (seActorId === userId) {
          return NextResponse.json({ error: "Self-approval prevention: You executed the Site Engineer step; you cannot perform final CE QC verification." }, { status: 400 });
        }

        nextStage = "PM_APPROVAL";
        nextStatus = OrderStatus.PENDING_APPROVAL;
        break;
      }

      case "ce_return_to_se": {
        if (!isCE && !isExec) {
          return NextResponse.json({ error: "Only the Construction Engineer can return to Site Engineer." }, { status: 403 });
        }
        if (stage !== "CE_QC_REVIEW") {
          return NextResponse.json({ error: `Cannot return: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        if (!returnReason.trim()) {
          return NextResponse.json({ error: "A return reason is required." }, { status: 400 });
        }

        nextStage = "SE_EXECUTION";
        break;
      }

      case "pm_approve": {
        if (!isPM && !isExec) {
          return NextResponse.json({ error: "Only the Project Manager can approve." }, { status: 403 });
        }
        if (stage !== "PM_APPROVAL") {
          return NextResponse.json({ error: `Cannot approve: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        if (isPM && task.project.managerId !== userId) {
          return NextResponse.json({ error: "You do not manage this project." }, { status: 403 });
        }

        // Prevent self-approval: PM cannot be the CE actor who did QC verification
        const ceActorId = getActorOfAction("ce_approve_to_pm");
        if (ceActorId === userId) {
          return NextResponse.json({ error: "Self-approval prevention: You performed the Construction Engineer QC verification; you cannot approve this as PM." }, { status: 400 });
        }

        nextStage = "CONSULTANT_REVIEW";
        nextStatus = OrderStatus.APPROVED;
        break;
      }

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
        if (!returnReason.trim()) {
          return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
        }

        nextStage = "INITIATED";
        nextStatus = OrderStatus.REJECTED;
        break;
      }

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
        if (!returnReason.trim()) {
          return NextResponse.json({ error: "A return reason is required." }, { status: 400 });
        }

        nextStage = "CE_QC_REVIEW";
        break;
      }

      case "consultant_accept": {
        if (!isExec && !isPM) {
          return NextResponse.json({ error: "Only executive roles can act as Consultant." }, { status: 403 });
        }
        if (stage !== "CONSULTANT_REVIEW") {
          return NextResponse.json({ error: `Cannot accept: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }

        nextStage = "COMPLETED";
        nextStatus = OrderStatus.COMPLETED;
        break;
      }

      case "consultant_reject": {
        if (!isExec && !isPM) {
          return NextResponse.json({ error: "Only executive roles can act as Consultant." }, { status: 403 });
        }
        if (stage !== "CONSULTANT_REVIEW") {
          return NextResponse.json({ error: `Cannot reject: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        if (!returnReason.trim()) {
          return NextResponse.json({ error: "A return reason is required." }, { status: 400 });
        }

        nextStage = "PM_APPROVAL";
        nextStatus = OrderStatus.PENDING_APPROVAL;
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    // ── Commit the stage transition in Database ──
    const updated = await prisma.task.update({
      where: { id },
      data: {
        workflowStage: nextStage,
        status: nextStatus,
        lastReturnReason: returnReason.trim() || null,
        progress: nextStage === "COMPLETED" ? 100 : task.progress,
      },
    });

    // ── Log in Task History ──
    await prisma.taskHistory.create({
      data: {
        taskId: id,
        fromStage: stage,
        toStage: nextStage,
        action,
        actorId: userId,
        actorName,
        actorRole: role,
        note: returnReason.trim() || null,
      },
    });

    // ── Dispatch Notifications ──
    const notifTitle = `Work Order: ${updated.title}`;
    const pageLink = `/dashboard/projects/${task.projectId}`;

    // Target roles or specific users based on nextStage
    if (nextStage === "SE_EXECUTION") {
      // Find Site Engineers on project
      const targetSEs = task.project.engineers.filter(e => e.role === Role.SITE_ENGINEER);
      for (const se of targetSEs) {
        await prisma.notification.create({
          data: { userId: se.id, title: notifTitle, message: `Awaiting execution assignment. Action by Site Engineer required.`, link: pageLink }
        });
      }
    } else if (nextStage === "CE_QC_REVIEW") {
      // Notify task creator (Construction Engineer)
      await prisma.notification.create({
        data: { userId: task.creatorId, title: notifTitle, message: `Execution completed by Site Engineer. Awaiting final QC verification.`, link: pageLink }
      });
    } else if (nextStage === "PM_APPROVAL") {
      // Notify Project Manager
      await prisma.notification.create({
        data: { userId: task.project.managerId, title: notifTitle, message: `Technical QC verified. PM Approval required.`, link: pageLink }
      });
    } else if (nextStage === "CONSULTANT_REVIEW") {
      // Notify Executives (Consultant roles)
      const execUsers = await prisma.user.findMany({
        where: { role: { in: [Role.SYSTEM_ADMIN, Role.GENERAL_MANAGER, Role.DEPUTY_GENERAL_MANAGER, Role.VP_OF_CONSTRUCTION] }, isActive: true },
        select: { id: true }
      });
      for (const ex of execUsers) {
        await prisma.notification.create({
          data: { userId: ex.id, title: notifTitle, message: `Approved by Project Manager. Awaiting Consultant final acceptance review.`, link: pageLink }
        });
      }
    } else if (nextStage === "INITIATED" && (action === "se_return_to_ce" || action === "pm_reject")) {
      // Notify Creator of return/rejection
      await prisma.notification.create({
        data: { userId: task.creatorId, title: notifTitle, message: `Returned/Rejected: "${returnReason.substring(0, 50)}". Correction needed.`, link: pageLink }
      });
    }

    const freshTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { firstName: true, lastName: true } },
        creator: { select: { firstName: true, lastName: true, role: true } },
        history: { orderBy: { createdAt: "desc" } },
        comments: { orderBy: { createdAt: "asc" } },
      }
    });

    return NextResponse.json({ task: freshTask });
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

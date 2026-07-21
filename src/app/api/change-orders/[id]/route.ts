import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role, OrderStatus } from "@prisma/client";

// Pipeline: INITIATED → SE_EXECUTION → CE_QC → PM_APPROVAL → CONSULTANT_REVIEW → COMPLETED
const STAGE_LABELS: Record<string, string> = {
  INITIATED:         "Initiated by CE",
  SE_EXECUTION:      "Site Engineer Execution",
  CE_QC:             "CE Final Check",
  PM_APPROVAL:       "Project Manager Approval",
  CONSULTANT_REVIEW: "Consultant Review",
  COMPLETED:         "Completed",
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

// GET /api/change-orders/[id] - Fetch single change order with full details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const changeOrder = await prisma.changeOrder.findUnique({
      where: { id },
      include: {
        project: { select: { name: true, code: true, budget: true } },
        requester: { select: { firstName: true, lastName: true, role: true } },
        approver: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    if (!changeOrder) {
      return NextResponse.json({ error: "Change order not found." }, { status: 404 });
    }

    return NextResponse.json({ changeOrder });
  } catch (error: any) {
    console.error("GET /api/change-orders/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/change-orders/[id] - Advance or return Change Order through pipeline
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    const body = await req.json();
    const { action, requestLetterUrl, rejectionReason } = body;

    const isCE = role === Role.CONSTRUCTION_ENGINEER;
    const isSE = role === Role.SITE_ENGINEER;
    const isPM = role === Role.PROJECT_MANAGER;
    const isExec = isExecutive(role);

    const co = await prisma.changeOrder.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            engineers: { select: { id: true } },
          },
        },
      },
    });

    if (!co) {
      return NextResponse.json({ error: "Change order not found." }, { status: 404 });
    }

    const stage = co.workflowStage;

    // Handle requestLetterUrl attachment separately (can be done at any point before consultant step)
    if (action === "attach_letter") {
      if (!requestLetterUrl) {
        return NextResponse.json({ error: "No letter URL provided." }, { status: 400 });
      }
      const updated = await prisma.changeOrder.update({
        where: { id },
        data: { requestLetterUrl },
        include: {
          requester: { select: { firstName: true, lastName: true, role: true } },
          approver: { select: { firstName: true, lastName: true } },
        },
      });
      return NextResponse.json({ changeOrder: updated });
    }

    switch (action) {
      // ── Executive fast-track direct approval ──
      case "executive_approve": {
        if (!isExec) {
          return NextResponse.json({ error: "Only Head Office executives can direct-approve." }, { status: 403 });
        }
        const updated = await prisma.changeOrder.update({
          where: { id },
          data: {
            workflowStage: "COMPLETED",
            status: OrderStatus.APPROVED,
            approverId: userId,
          },
          include: {
            requester: { select: { firstName: true, lastName: true, role: true } },
            approver: { select: { firstName: true, lastName: true } },
          },
        });
        return NextResponse.json({ changeOrder: updated });
      }

      // ── Attach consultant request letter ──
      case "attach_letter": {
        if (!isPM && !isExec) {
          return NextResponse.json({ error: "Only PM or Head Office can attach a consultant letter." }, { status: 403 });
        }
        const letterUrl = body.requestLetterUrl;
        if (!letterUrl) {
          return NextResponse.json({ error: "requestLetterUrl is required." }, { status: 400 });
        }
        const updated = await prisma.changeOrder.update({
          where: { id },
          data: { requestLetterUrl: letterUrl },
          include: {
            requester: { select: { firstName: true, lastName: true, role: true } },
            approver: { select: { firstName: true, lastName: true } },
          },
        });
        return NextResponse.json({ changeOrder: updated });
      }

      // CE submits to Site Engineer
      case "submit_to_se": {
        if (!isCE && !isExec) {
          return NextResponse.json({ error: "Only the Construction Engineer can submit to Site Engineer." }, { status: 403 });
        }
        if (stage !== "INITIATED") {
          return NextResponse.json({ error: `Cannot submit: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.changeOrder.update({
          where: { id },
          data: { workflowStage: "SE_EXECUTION", status: OrderStatus.PENDING_APPROVAL },
          include: { requester: { select: { firstName: true, lastName: true, role: true } }, approver: { select: { firstName: true, lastName: true } } },
        });
        return NextResponse.json({ changeOrder: updated });
      }

      // SE submits back to CE for final QC
      case "se_submit_to_ce": {
        if (!isSE && !isExec) {
          return NextResponse.json({ error: "Only the Site Engineer can submit to CE." }, { status: 403 });
        }
        if (stage !== "SE_EXECUTION") {
          return NextResponse.json({ error: `Cannot submit: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.changeOrder.update({
          where: { id },
          data: { workflowStage: "CE_QC" },
          include: { requester: { select: { firstName: true, lastName: true, role: true } }, approver: { select: { firstName: true, lastName: true } } },
        });
        return NextResponse.json({ changeOrder: updated });
      }

      // SE returns to CE for rework
      case "se_return_to_ce": {
        if (!isSE && !isExec) {
          return NextResponse.json({ error: "Only the Site Engineer can return to CE." }, { status: 403 });
        }
        if (stage !== "SE_EXECUTION") {
          return NextResponse.json({ error: `Cannot return: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.changeOrder.update({
          where: { id },
          data: { workflowStage: "INITIATED", status: OrderStatus.DRAFT },
          include: { requester: { select: { firstName: true, lastName: true, role: true } }, approver: { select: { firstName: true, lastName: true } } },
        });
        return NextResponse.json({ changeOrder: updated });
      }

      // CE submits final QC to PM
      case "ce_approve_to_pm": {
        if (!isCE && !isExec) {
          return NextResponse.json({ error: "Only the Construction Engineer can submit to Project Manager." }, { status: 403 });
        }
        if (stage !== "CE_QC") {
          return NextResponse.json({ error: `Cannot submit: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.changeOrder.update({
          where: { id },
          data: { workflowStage: "PM_APPROVAL", status: OrderStatus.PENDING_APPROVAL },
          include: { requester: { select: { firstName: true, lastName: true, role: true } }, approver: { select: { firstName: true, lastName: true } } },
        });
        return NextResponse.json({ changeOrder: updated });
      }

      // CE returns from QC to SE
      case "ce_return_to_se": {
        if (!isCE && !isExec) {
          return NextResponse.json({ error: "Only the Construction Engineer can return to Site Engineer." }, { status: 403 });
        }
        if (stage !== "CE_QC") {
          return NextResponse.json({ error: `Cannot return: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.changeOrder.update({
          where: { id },
          data: { workflowStage: "SE_EXECUTION" },
          include: { requester: { select: { firstName: true, lastName: true, role: true } }, approver: { select: { firstName: true, lastName: true } } },
        });
        return NextResponse.json({ changeOrder: updated });
      }

      // PM approves → Consultant (REQUIRES consultant request letter)
      case "pm_approve": {
        if (!isPM && !isExec) {
          return NextResponse.json({ error: "Only the Project Manager can approve." }, { status: 403 });
        }
        if (stage !== "PM_APPROVAL") {
          return NextResponse.json({ error: `Cannot approve: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        if (isPM && co.project.managerId !== userId) {
          return NextResponse.json({ error: "You do not manage this project." }, { status: 403 });
        }
        // ── CONSULTANT LETTER IS REQUIRED ──
        if (!co.requestLetterUrl) {
          return NextResponse.json(
            {
              error: "A consultant request letter must be attached before forwarding to the Consultant.",
              code: "LETTER_REQUIRED",
            },
            { status: 422 }
          );
        }
        const updated = await prisma.changeOrder.update({
          where: { id },
          data: {
            workflowStage: "CONSULTANT_REVIEW",
            status: OrderStatus.APPROVED,
            approverId: userId,
          },
          include: { requester: { select: { firstName: true, lastName: true, role: true } }, approver: { select: { firstName: true, lastName: true } } },
        });
        return NextResponse.json({ changeOrder: updated });
      }

      // PM rejects and sends back to CE
      case "pm_reject": {
        if (!isPM && !isExec) {
          return NextResponse.json({ error: "Only the Project Manager can reject." }, { status: 403 });
        }
        if (stage !== "PM_APPROVAL") {
          return NextResponse.json({ error: `Cannot reject: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        if (isPM && co.project.managerId !== userId) {
          return NextResponse.json({ error: "You do not manage this project." }, { status: 403 });
        }
        const updated = await prisma.changeOrder.update({
          where: { id },
          data: {
            workflowStage: "INITIATED",
            status: OrderStatus.REJECTED,
            rejectionReason: rejectionReason || null,
          },
          include: { requester: { select: { firstName: true, lastName: true, role: true } }, approver: { select: { firstName: true, lastName: true } } },
        });
        return NextResponse.json({ changeOrder: updated });
      }

      // PM returns to CE for correction (no rejection)
      case "pm_return": {
        if (!isPM && !isExec) {
          return NextResponse.json({ error: "Only the Project Manager can return for correction." }, { status: 403 });
        }
        if (stage !== "PM_APPROVAL") {
          return NextResponse.json({ error: `Cannot return: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        if (isPM && co.project.managerId !== userId) {
          return NextResponse.json({ error: "You do not manage this project." }, { status: 403 });
        }
        const updated = await prisma.changeOrder.update({
          where: { id },
          data: { workflowStage: "CE_QC" },
          include: { requester: { select: { firstName: true, lastName: true, role: true } }, approver: { select: { firstName: true, lastName: true } } },
        });
        return NextResponse.json({ changeOrder: updated });
      }

      // Consultant accepts
      case "consultant_accept": {
        if (!isExec && !isPM) {
          return NextResponse.json({ error: "Only executive roles can act as Consultant." }, { status: 403 });
        }
        if (stage !== "CONSULTANT_REVIEW") {
          return NextResponse.json({ error: `Cannot accept: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.changeOrder.update({
          where: { id },
          data: {
            workflowStage: "COMPLETED",
            status: OrderStatus.APPROVED,
            approverId: userId,
          },
          include: { requester: { select: { firstName: true, lastName: true, role: true } }, approver: { select: { firstName: true, lastName: true } } },
        });
        return NextResponse.json({ changeOrder: updated });
      }

      // Consultant rejects — returns to PM
      case "consultant_reject": {
        if (!isExec && !isPM) {
          return NextResponse.json({ error: "Only executive roles can act as Consultant." }, { status: 403 });
        }
        if (stage !== "CONSULTANT_REVIEW") {
          return NextResponse.json({ error: `Cannot reject: current stage is "${STAGE_LABELS[stage]}".` }, { status: 400 });
        }
        const updated = await prisma.changeOrder.update({
          where: { id },
          data: {
            workflowStage: "PM_APPROVAL",
            status: OrderStatus.PENDING_APPROVAL,
            rejectionReason: rejectionReason || null,
          },
          include: { requester: { select: { firstName: true, lastName: true, role: true } }, approver: { select: { firstName: true, lastName: true } } },
        });
        return NextResponse.json({ changeOrder: updated });
      }

      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("PUT /api/change-orders/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

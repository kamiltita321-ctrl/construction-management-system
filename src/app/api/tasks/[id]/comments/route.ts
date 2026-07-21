import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";

// GET /api/tasks/[id]/comments - Get all comments for a specific task
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const comments = await prisma.taskComment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ comments });
  } catch (error: any) {
    console.error("GET /api/tasks/[id]/comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tasks/[id]/comments - Add a new comment to a specific task
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { firstName, lastName, role, userId } = auth.session;
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Comment content cannot be empty." }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          include: { engineers: { select: { id: true } } },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const authorName = `${firstName} ${lastName}`;

    const newComment = await prisma.taskComment.create({
      data: {
        taskId: id,
        authorId: userId,
        authorName,
        authorRole: role,
        content: content.trim(),
      },
    });

    // Also log this in TaskHistory as a comment action
    await prisma.taskHistory.create({
      data: {
        taskId: id,
        fromStage: task.workflowStage,
        toStage: task.workflowStage,
        action: "ADD_COMMENT",
        actorId: userId,
        actorName: authorName,
        actorRole: role,
        note: `Added comment: "${content.trim().substring(0, 60)}${content.trim().length > 60 ? "..." : ""}"`,
      },
    });

    return NextResponse.json({ comment: newComment });
  } catch (error: any) {
    console.error("POST /api/tasks/[id]/comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role, userId } = auth.session;
    const body = await req.json();
    const { title, description, dueDate, projectId } = body;

    if (!title || !dueDate || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields: title, dueDate, projectId" },
        { status: 400 }
      );
    }

    // Check permissions: PM of the project or executive
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isAuthorized = 
      role === Role.SYSTEM_ADMIN ||
      role === Role.GENERAL_MANAGER ||
      role === Role.DEPUTY_GENERAL_MANAGER ||
      role === Role.VP_OF_CONSTRUCTION ||
      (role === Role.PROJECT_MANAGER && project.managerId === userId);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized to add milestones to this project" }, { status: 403 });
    }

    const milestone = await prisma.milestone.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        projectId,
      }
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/milestones error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

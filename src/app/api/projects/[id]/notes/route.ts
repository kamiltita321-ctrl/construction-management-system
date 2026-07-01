import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// GET /api/projects/[id]/notes - Fetch notes for a project workspace (role-sandboxed)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const { role } = auth.session;

    // Filter notes: only return notes authored by users who have the same system role as the current user
    const notes = await prisma.projectNote.findMany({
      where: { 
        projectId: id,
        author: {
          role: role as Role
        }
      },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error("GET /api/projects/[id]/notes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/notes - Create a new project note
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const { userId } = auth.session;
    const body = await req.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Missing required fields: title, content" }, { status: 400 });
    }

    const note = await prisma.projectNote.create({
      data: {
        title,
        content,
        projectId: id,
        authorId: userId
      },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } }
      }
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects/[id]/notes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

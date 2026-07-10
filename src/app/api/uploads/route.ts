import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role } = auth.session;
    // Office Engineers are read-only on documents (Level 3 shared only)
    if (role === "OFFICE_ENGINEER") {
      return NextResponse.json(
        { error: "Access denied. Office Engineers are restricted to read-only access for documents." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const fileType = formData.get("fileType") as string | null;
    const projectId = formData.get("projectId") as string | null;
    const confidentialityLevel = parseInt(formData.get("confidentialityLevel") as string || "3");
    const referenceNumber = formData.get("referenceNumber") as string | null;
    const documentDate = formData.get("documentDate") as string | null;

    if (!file || !title || !fileType || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields: file, title, fileType, projectId" },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Read file bytes
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save under public/uploads/projects/[projectId]
    const relativeUploadDir = join("uploads", "projects", projectId);
    const absoluteUploadDir = join(process.cwd(), "public", relativeUploadDir);

    // Ensure the folder directory exists
    await mkdir(absoluteUploadDir, { recursive: true });

    // Sanitize and create a unique name
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}_${sanitizedFileName}`;
    const absoluteFilePath = join(absoluteUploadDir, uniqueFileName);
    
    // Web URL path (replaces Windows backslashes with forward slashes)
    const fileUrl = `/${relativeUploadDir}/${uniqueFileName}`.replace(/\\/g, "/");

    // Write file to filesystem
    await writeFile(absoluteFilePath, buffer);

    const document = await prisma.document.create({
      data: {
        title,
        fileUrl,
        fileType,
        fileSize: file.size,
        projectId,
        uploadedBy: `${auth.session.firstName} ${auth.session.lastName}`,
        confidentialityLevel: confidentialityLevel || 3,
        referenceNumber: referenceNumber || null,
        documentDate: documentDate ? new Date(documentDate) : null,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/uploads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

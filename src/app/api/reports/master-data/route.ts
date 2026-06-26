import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiAuth } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const [
      activities,
      equipmentTypes,
      units,
      jobTitles,
      idleReasons,
      downReasons,
      personnel
    ] = await Promise.all([
      prisma.activity.findMany({ orderBy: { name: "asc" } }),
      prisma.equipmentType.findMany({
        include: { machines: { orderBy: { code: "asc" } } },
        orderBy: { name: "asc" }
      }),
      prisma.unit.findMany({ orderBy: { name: "asc" } }),
      prisma.jobTitle.findMany({ orderBy: { name: "asc" } }),
      prisma.idleReason.findMany({ orderBy: { name: "asc" } }),
      prisma.downReason.findMany({ orderBy: { name: "asc" } }),
      prisma.personnel.findMany({ orderBy: { name: "asc" } })
    ]);

    return NextResponse.json({
      activities,
      equipmentTypes,
      units,
      jobTitles,
      idleReasons,
      downReasons,
      personnel
    });
  } catch (error: any) {
    console.error("GET /api/reports/master-data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST endpoint to dynamically add master data options (admin configuration)
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth.authorized) return auth.response;

    const { role } = auth.session;
    if (role !== "SYSTEM_ADMIN" && role !== "PROJECT_MANAGER") {
      return NextResponse.json({ error: "Access denied. Only Admins or Project Managers can configure master data." }, { status: 403 });
    }

    const body = await req.json();
    const { type, name, extra } = body; // type can be 'activity', 'equipmentType', 'machine', 'unit', 'jobTitle', 'idleReason', 'downReason', 'personnel'

    if (!type || !name) {
      return NextResponse.json({ error: "Missing required fields: type, name" }, { status: 400 });
    }

    let result;
    switch (type) {
      case "activity":
        result = await prisma.activity.create({ data: { name } });
        break;
      case "unit":
        result = await prisma.unit.create({ data: { name } });
        break;
      case "jobTitle":
        result = await prisma.jobTitle.create({ data: { name } });
        break;
      case "idleReason":
        result = await prisma.idleReason.create({ data: { name } });
        break;
      case "downReason":
        result = await prisma.downReason.create({ data: { name } });
        break;
      case "personnel":
        result = await prisma.personnel.create({ data: { name, role: extra || null } });
        break;
      case "equipmentType":
        result = await prisma.equipmentType.create({ data: { name } });
        break;
      case "machine":
        if (!extra) {
          return NextResponse.json({ error: "Missing equipmentTypeId in extra field" }, { status: 400 });
        }
        result = await prisma.machine.create({
          data: { code: name, equipmentTypeId: extra }
        });
        break;
      default:
        return NextResponse.json({ error: "Invalid master data type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/reports/master-data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

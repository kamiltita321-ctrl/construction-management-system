import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth-utils";
import { verifyApiAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";

// PUT /api/admin/users/[id] - Update user profile, role, and project assignments (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiAuth([Role.SYSTEM_ADMIN]);
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const body = await req.json();
    const { email, password, firstName, lastName, role, phone, isActive, assignedProjectIds } = body;

    // Check if target user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Verify email uniqueness if email is changed
    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "Email is already taken." }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone || null;
    if (isActive !== undefined) updateData.isActive = !!isActive;
    if (role) {
      if (!Object.values(Role).includes(role as Role)) {
        return NextResponse.json({ error: "Invalid role selected." }, { status: 400 });
      }
      updateData.role = role as Role;
    }
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Perform base user update
      const updated = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      });

      // 2. Perform project assignments update if provided
      if (assignedProjectIds && Array.isArray(assignedProjectIds)) {
        const finalRole = role || user.role;

        // If user is a Project Manager: update managed projects managerId
        if (finalRole === Role.PROJECT_MANAGER) {
          // Unset other projects where this user was manager (since a project needs a PM, but we unset this manager if not in the new list)
          // Set manager to the System Admin or PM by default, or just disconnect (set managerId to any fallback or set it to nullable if schema permits.
          // Wait, managerId in Project is not nullable (managerId String), so we cannot unset it unless we reassign.
          // Let's connect the projects in the list to this manager
          for (const projId of assignedProjectIds) {
            await tx.project.update({
              where: { id: projId },
              data: { managerId: id }
            });
          }
        } 
        
        // If user is an engineer role, update siteProjects relation
        const isEngineer =
          finalRole === Role.OFFICE_ENGINEER ||
          finalRole === Role.CONSTRUCTION_ENGINEER ||
          finalRole === Role.SITE_ENGINEER;

        if (isEngineer) {
          await tx.user.update({
            where: { id },
            data: {
              siteProjects: {
                set: assignedProjectIds.map((pId) => ({ id: pId })),
              },
            },
          });
        }
      }

      // Fetch fresh profile with projects loaded
      const freshUser = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          managedProjects: { select: { id: true, name: true, code: true } },
          siteProjects: { select: { id: true, name: true, code: true } },
        },
      });

      return freshUser;
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error("PUT /api/admin/users/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

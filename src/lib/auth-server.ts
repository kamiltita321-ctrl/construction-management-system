import { getSession } from "./session";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

/**
 * Guards Server Components and Layouts.
 * Redirects to /login if the user is not authenticated.
 * Redirects to /forbidden if the user does not have the required permissions.
 */
export async function requireAuth(allowedRoles?: Role[]) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (allowedRoles && !allowedRoles.includes(session.role as Role)) {
    redirect("/forbidden");
  }

  return session;
}

/**
 * Guards API Routes.
 * Returns a JSON response with status 401 or 403 if the check fails.
 */
export async function verifyApiAuth(allowedRoles?: Role[]) {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false as const,
      response: new Response(JSON.stringify({ error: "Unauthorized. Please log in." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.role as Role)) {
    return {
      authorized: false as const,
      response: new Response(JSON.stringify({ error: "Forbidden. Insufficient permissions." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  return {
    authorized: true as const,
    session,
  };
}

/** Head Office leadership roles — full system access */
export const EXECUTIVE_ROLES: Role[] = [
  Role.SYSTEM_ADMIN,
  Role.GENERAL_MANAGER,
  Role.DEPUTY_GENERAL_MANAGER,
  Role.VP_OF_CONSTRUCTION,
];

/** All field/office roles that are project-scoped (non-executive) */
export const FIELD_ROLES: Role[] = [
  Role.PROJECT_MANAGER,
  Role.CONSTRUCTION_ENGINEER,
  Role.OFFICE_ENGINEER,
  Role.CONSTRUCTION_ENGINEER_HEAD,
  Role.SITE_ENGINEER,
];

/** Roles that can initiate and QC Work Orders */
export const WORK_ORDER_ROLES: Role[] = [
  ...EXECUTIVE_ROLES,
  Role.PROJECT_MANAGER,
  Role.CONSTRUCTION_ENGINEER,
  Role.CONSTRUCTION_ENGINEER_HEAD,
];

/** Roles that can approve Change Orders */
export const CO_APPROVAL_ROLES: Role[] = [...EXECUTIVE_ROLES];

/** Roles that can create Change Order requests */
export const CO_REQUEST_ROLES: Role[] = [...EXECUTIVE_ROLES, Role.PROJECT_MANAGER];

/** Roles that can log Visitor entries */
export const VISITOR_LOG_ROLES: Role[] = [...EXECUTIVE_ROLES];

/** Roles that can create Inspection requests */
export const INSPECTION_CREATE_ROLES: Role[] = [
  ...EXECUTIVE_ROLES,
  Role.PROJECT_MANAGER,
  Role.CONSTRUCTION_ENGINEER,
  Role.CONSTRUCTION_ENGINEER_HEAD,
];

/** Roles that can encode final Inspection results */
export const INSPECTION_RESULT_ROLES: Role[] = [
  ...EXECUTIVE_ROLES,
  Role.PROJECT_MANAGER,
  Role.OFFICE_ENGINEER,
  Role.SITE_ENGINEER,
];

export function isExecutive(role: Role): boolean {
  return EXECUTIVE_ROLES.includes(role);
}

export function isHeadOffice(role: string): boolean {
  return EXECUTIVE_ROLES.includes(role as Role);
}

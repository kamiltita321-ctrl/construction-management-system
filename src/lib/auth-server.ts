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

export const EXECUTIVE_ROLES: Role[] = [
  Role.SYSTEM_ADMIN,
  Role.GENERAL_MANAGER,
  Role.DEPUTY_GENERAL_MANAGER,
  Role.VP_OF_CONSTRUCTION,
];

export function isExecutive(role: Role): boolean {
  return EXECUTIVE_ROLES.includes(role);
}


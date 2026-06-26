import { cookies } from "next/headers";
import { decryptSession, encryptSession, SessionPayload } from "./auth-utils";

const SESSION_COOKIE_NAME = "cms_session";
const SESSION_DURATION = 1000 * 60 * 60 * 8; // 8 hours duration

/**
 * Retrieves the current session payload from the request cookies.
 * Returns null if the session cookie is missing, tampered with, or expired.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie || !cookie.value) return null;
    return decryptSession(cookie.value);
  } catch (error) {
    return null;
  }
}

/**
 * Creates and sets a new session cookie for the user.
 */
export async function setSession(user: {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION;
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    expiresAt,
  };
  
  const token = encryptSession(payload);
  const cookieStore = await cookies();
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/**
 * Deletes the session cookie, logging out the user.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

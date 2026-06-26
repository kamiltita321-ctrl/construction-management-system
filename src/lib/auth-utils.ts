import { scrypt, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getSecretKey(): Buffer {
  const secret = process.env.SESSION_SECRET || "default_super_secret_session_key_32_bytes_long!!";
  // Allocate exactly 32 bytes for aes-256 key size
  return Buffer.alloc(KEY_LENGTH, secret, "utf-8");
}

/**
 * Hashes a plaintext password using Node's native scrypt algorithm.
 * Output format is `salt:hash` (hex encoded).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, "hex");
  
  // Timing safe comparison to prevent timing attacks
  return timingSafeEqual(keyBuffer, derivedKey);
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  expiresAt: number;
}

/**
 * Encrypts a session payload into a stateless token.
 */
export function encryptSession(payload: SessionPayload): string {
  const key = getSecretKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  // Format: iv:encryptedData:tag
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

/**
 * Decrypts a session token back into a payload, or returns null if invalid.
 */
export function decryptSession(token: string): SessionPayload | null {
  try {
    const [ivHex, encryptedHex, tagHex] = token.split(":");
    if (!ivHex || !encryptedHex || !tagHex) return null;
    
    const key = getSecretKey();
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    const payload = JSON.parse(decrypted.toString("utf8")) as SessionPayload;
    
    // Check expiration
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

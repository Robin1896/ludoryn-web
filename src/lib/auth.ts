import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET ?? "ludoryn-default-secret-change-me";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const derived = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(derived, "hex"),
    );
  } catch {
    return false;
  }
}

export function createToken(payload: { id: number; username: string }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64");
  return `${data}.${sig}`;
}

export function verifyToken(token: string): { id: number; username: string } | null {
  try {
    const dot = token.lastIndexOf(".");
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac("sha256", SECRET).update(data).digest("base64");
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(data, "base64").toString());
  } catch {
    return null;
  }
}

export const COOKIE_NAME = "ludoryn-token";
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 dagen
};

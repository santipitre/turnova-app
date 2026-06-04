/**
 * Firma/verificación de la cookie de sesión (runtime Node).
 * Formato del token: <payloadB64url>.<hmacB64url>
 * El secreto vive solo en el server (env TURNOVA_SESSION_SECRET) — nunca en el browser.
 */
import crypto from "crypto";
import { SESSION_TIMEOUT_MS, type TurnovaSession, type TurnovaUser } from "./pyralis-auth";

function secret(): string {
  return process.env.TURNOVA_SESSION_SECRET || "";
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Firma una sesión y devuelve el token. Lanza si falta el secreto. */
export function signCookie(user: TurnovaUser): string {
  const sec = secret();
  if (!sec) throw new Error("TURNOVA_SESSION_SECRET no está configurada");
  const payload = b64url(Buffer.from(JSON.stringify({ user, ts: Date.now() }), "utf-8"));
  const sig = b64url(crypto.createHmac("sha256", sec).update(payload).digest());
  return `${payload}.${sig}`;
}

/** Verifica el token (firma + expiración). Devuelve la sesión o null. */
export function verifyCookieNode(value: string | undefined): TurnovaSession | null {
  const sec = secret();
  if (!value || !sec) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = b64url(crypto.createHmac("sha256", sec).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(fromB64url(payload).toString("utf-8")) as TurnovaSession;
    if (!obj.user?.id || !obj.ts) return null;
    if (Date.now() - obj.ts > SESSION_TIMEOUT_MS) return null;
    return obj;
  } catch {
    return null;
  }
}

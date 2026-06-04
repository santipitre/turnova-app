/**
 * Verificación de la cookie de sesión en runtime Edge (middleware), con Web Crypto.
 * No importa 'crypto' de Node para no romper el bundle Edge.
 */
import type { TurnovaSession } from "./pyralis-auth";

const TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 horas (igual a SESSION_TIMEOUT_MS)

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function bytesToB64url(bytes: ArrayBuffer): string {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function verifyCookieEdge(value: string | undefined): Promise<TurnovaSession | null> {
  const sec = process.env.TURNOVA_SESSION_SECRET || "";
  if (!value || !sec) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(sec),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    if (bytesToB64url(mac) !== sig) return null;
    const json = new TextDecoder().decode(b64urlToBytes(payload));
    const obj = JSON.parse(json) as TurnovaSession;
    if (!obj.user?.id || !obj.ts) return null;
    if (Date.now() - obj.ts > TIMEOUT_MS) return null;
    return obj;
  } catch {
    return null;
  }
}

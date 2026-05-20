"use client";

/**
 * Helpers de sesión Pyralis para Client Components (hooks y utils).
 * Leen y escriben la cookie "turnova_session" desde document.cookie.
 */
import {
  SESSION_COOKIE_NAME,
  SESSION_TIMEOUT_MS,
  decodeSession,
  encodeSession,
  type TurnovaSession,
  type TurnovaUser,
} from "./pyralis-auth";

/**
 * Lee cookie por nombre desde document.cookie.
 */
function getCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const cookies = document.cookie.split(";").map((c) => c.trim());
  for (const c of cookies) {
    if (c.startsWith(`${name}=`)) {
      return decodeURIComponent(c.substring(name.length + 1));
    }
  }
  return undefined;
}

/**
 * Devuelve la sesión actual o null.
 */
export function getClientSession(): TurnovaSession | null {
  const raw = getCookieValue(SESSION_COOKIE_NAME);
  return decodeSession(raw);
}

export function getClientUser(): TurnovaUser | null {
  return getClientSession()?.user ?? null;
}

/**
 * Setea cookie de sesión (no httpOnly desde JS browser).
 * Lo usa el login form después de loginWithPin exitoso.
 */
export function setClientSession(user: TurnovaUser) {
  if (typeof document === "undefined") return;
  const value = encodeSession(user);
  const maxAge = SESSION_TIMEOUT_MS / 1000;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

/**
 * Borra cookie de sesión.
 */
export function clearClientSession() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

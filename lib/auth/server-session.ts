/**
 * Helpers de sesión Pyralis para Server Components, Route Handlers, Server Actions.
 * Leen y escriben la cookie "turnova_session" usando next/headers.
 */
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_TIMEOUT_MS,
  decodeSession,
  encodeSession,
  type TurnovaSession,
  type TurnovaUser,
} from "./pyralis-auth";

/**
 * Lee la sesión actual desde cookies (Server Component / Route Handler).
 * Devuelve null si no hay sesión o expiró.
 */
export function getServerSession(): TurnovaSession | null {
  const store = cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  return decodeSession(raw);
}

/**
 * Devuelve el user de la sesión o null.
 */
export function getServerUser(): TurnovaUser | null {
  return getServerSession()?.user ?? null;
}

/**
 * Crea cookie de sesión. Solo usable desde Route Handler o Server Action
 * (Server Components no pueden setear cookies).
 */
export function setServerSession(user: TurnovaUser) {
  const store = cookies();
  const value = encodeSession(user);
  store.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TIMEOUT_MS / 1000,
  });
}

/**
 * Borra cookie de sesión.
 */
export function clearServerSession() {
  const store = cookies();
  store.delete(SESSION_COOKIE_NAME);
}

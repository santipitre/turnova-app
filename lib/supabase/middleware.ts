/**
 * Middleware de auth Pyralis (PIN-based).
 * Reemplaza al Supabase Auth middleware (2026-05-20).
 *
 * Lee la cookie "turnova_session" y decide si la ruta es accesible.
 * Si no hay sesion valida y la ruta es privada, redirige a /login.
 */
import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/pyralis-auth";

const RUTAS_PUBLICAS = [
  "/login",
  "/landing",
  "/auth/error",
  "/lector-publico",
  "/api/procesar-pedido-demo",
];

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl.clone();
  // La raíz "/" muestra la landing pública (la sirve app/page.tsx).
  // Por eso es pública SIN importar si hay sesión o no — el banner
  // "Ir a mi panel" se muestra dentro del componente si hay sesión.
  const esRaiz = url.pathname === "/";
  const esRutaPublica =
    esRaiz || RUTAS_PUBLICAS.some((r) => url.pathname.startsWith(r));

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSession(sessionCookie);

  // No hay sesion valida y la ruta requiere auth -> redirect a login
  if (!session && !esRutaPublica) {
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Hay sesion y va al login -> redirect a dashboard
  if (session && url.pathname === "/login") {
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

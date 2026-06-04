/**
 * POST /api/auth/logout — borra la cookie de sesión (httpOnly) del lado del servidor.
 */
import { NextResponse } from "next/server";
import { clearServerSession } from "@/lib/auth/server-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  clearServerSession();
  return NextResponse.json({ ok: true });
}

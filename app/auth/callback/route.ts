/**
 * Auth callback obsoleto post-migración 2026-05-20.
 * Turnova ya no usa Supabase Auth (OAuth/magic link).
 * Redirige a /login para que el usuario use PIN.
 */
import { NextResponse, type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`);
}

/**
 * POST /api/auth/login
 * Verifica usuario + PIN del lado del SERVIDOR y setea la cookie de sesión
 * firmada (HMAC) y httpOnly. El navegador nunca ve el secreto ni puede forjar la cookie.
 */
import { NextResponse } from "next/server";
import { loginWithPin } from "@/lib/auth/pyralis-auth";
import { setServerSession } from "@/lib/auth/server-session";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.TURNOVA_SESSION_SECRET) {
    return NextResponse.json(
      { error: "Falta configurar TURNOVA_SESSION_SECRET en el servidor." },
      { status: 500 },
    );
  }

  let body: { username?: string; pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const username = (body.username || "").trim();
  const pin = (body.pin || "").trim();
  if (!username || !pin) {
    return NextResponse.json({ error: "Usuario y PIN requeridos" }, { status: 400 });
  }

  try {
    const user = await loginWithPin(username, pin);
    // Traer auth_user_id (para poder firmar JWT de plataforma en operaciones admin)
    try {
      const admin = createServiceClient();
      const { data } = await admin.schema("public").from("usuarios")
        .select("auth_user_id").eq("id", user.id).single();
      user.auth_user_id = data?.auth_user_id ?? null;
    } catch { /* no bloqueante */ }
    setServerSession(user);
    // No devolvemos datos sensibles; solo lo necesario para la UI.
    return NextResponse.json({
      ok: true,
      user: { nombre: user.nombre, username: user.username, rol_turnova: user.rol_turnova },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No se pudo iniciar sesión";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

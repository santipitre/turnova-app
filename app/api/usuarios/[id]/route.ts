/**
 * PATCH /api/usuarios/[id]  -> cambiar rol_turnova y/o activo (admin only)
 * POST  /api/usuarios/[id]/reset-pin via ?action=reset-pin -> resetear PIN (admin only)
 */
import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server-session";
import { esAdmin } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { platformAsUser } from "@/lib/supabase/platform-admin";
import { extraerPin } from "@/lib/usuarios/pin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES_VALIDOS = ["admin", "operador", "solo_lectura"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = getServerUser();
  if (!user || !user.tenant_id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!esAdmin(user.rol_turnova)) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  let body: { rol_turnova?: string; activo?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }); }

  const patch: Record<string, unknown> = {};
  if (body.rol_turnova !== undefined) {
    if (!ROLES_VALIDOS.includes(body.rol_turnova)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    patch.rol = body.rol_turnova;
  }
  if (body.activo !== undefined) patch.activo = !!body.activo;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });

  const admin = createServiceClient();
  const { error } = await admin.from("profiles").update(patch).eq("id", params.id).eq("tenant_id", user.tenant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = getServerUser();
  if (!user || !user.tenant_id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!esAdmin(user.rol_turnova)) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  if (!user.auth_user_id) return NextResponse.json({ error: "Sin auth_user_id para firmar JWT" }, { status: 400 });
  if (!process.env.SUPABASE_JWT_SECRET) return NextResponse.json({ error: "Falta SUPABASE_JWT_SECRET" }, { status: 500 });

  const action = new URL(request.url).searchParams.get("action");
  if (action !== "reset-pin") return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });

  const plat = platformAsUser(user.auth_user_id);
  const { data: pin, error } = await plat.rpc("admin_reset_pin", { p_usuario_id: params.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, pin_temporal: extraerPin(pin) });
}

/**
 * PATCH  /api/usuarios/[id]                 -> cambiar rol_turnova y/o activo (admin only)
 * POST   /api/usuarios/[id]?action=reset-pin -> resetear PIN a temporal (admin only)
 * DELETE /api/usuarios/[id]                 -> quitar acceso a este centro (admin only)
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
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body invalido" }, { status: 400 }); }

  const patch: Record<string, unknown> = {};
  if (body.rol_turnova !== undefined) {
    if (!ROLES_VALIDOS.includes(body.rol_turnova)) return NextResponse.json({ error: "Rol invalido" }, { status: 400 });
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
  if (action !== "reset-pin") return NextResponse.json({ error: "Accion no soportada" }, { status: 400 });

  const plat = platformAsUser(user.auth_user_id);
  const { data: pin, error } = await plat.rpc("admin_reset_pin", { p_usuario_id: params.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, pin_temporal: extraerPin(pin) });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = getServerUser();
  if (!user || !user.tenant_id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!esAdmin(user.rol_turnova)) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  if (params.id === user.id) return NextResponse.json({ error: "No podes eliminar tu propio usuario" }, { status: 400 });
  if (!user.auth_user_id || !process.env.SUPABASE_JWT_SECRET) {
    return NextResponse.json({ error: "Falta configuracion para operar como admin" }, { status: 400 });
  }

  const admin = createServiceClient();

  // El usuario debe pertenecer a este centro.
  const { data: target } = await admin.from("profiles").select("rol").eq("id", params.id).eq("tenant_id", user.tenant_id).maybeSingle();
  if (!target) return NextResponse.json({ error: "El usuario no pertenece a este centro" }, { status: 404 });

  // Proteger al ultimo administrador.
  if (target.rol === "admin" || target.rol === "superadmin") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true })
      .eq("tenant_id", user.tenant_id).in("rol", ["admin", "superadmin"]);
    if ((count ?? 0) <= 1) return NextResponse.json({ error: "No podes eliminar al unico administrador del centro" }, { status: 400 });
  }

  // 1) Revocar licencia Turnova (actuando como admin via JWT).
  const plat = platformAsUser(user.auth_user_id);
  const { error: eRev } = await plat.rpc("revocar_licencia_turnova", { p_usuario_id: params.id });
  if (eRev) return NextResponse.json({ error: `No se pudo revocar la licencia: ${eRev.message}` }, { status: 400 });

  // 2) Quitar el acceso a este centro (borrar el profile del tenant).
  const { error: eProf } = await admin.from("profiles").delete().eq("id", params.id).eq("tenant_id", user.tenant_id);
  if (eProf) return NextResponse.json({ error: eProf.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

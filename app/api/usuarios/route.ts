/**
 * GET  /api/usuarios  -> lista de usuarios de Turnova del centro (admin only)
 * POST /api/usuarios  -> crea un usuario nuevo (admin only)
 *
 * El alta usa las funciones de plataforma (admin_crear_usuario + otorgar_licencia_turnova)
 * actuando como el admin logueado vía JWT. El rol Turnova se setea en turnova.profiles.
 */
import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server-session";
import { esAdmin } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { platformAsUser } from "@/lib/supabase/platform-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES_VALIDOS = ["admin", "operador", "solo_lectura"];

export async function GET() {
  const user = getServerUser();
  if (!user || !user.tenant_id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!esAdmin(user.rol_turnova)) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const admin = createServiceClient();
  // profiles del tenant + datos del usuario
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, rol, activo")
    .eq("tenant_id", user.tenant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (profiles ?? []).map((p: { id: string }) => p.id);
  let usuariosById: Record<string, { username: string; nombre: string }> = {};
  if (ids.length) {
    const { data: us } = await admin.schema("public").from("usuarios").select("id, username, nombre").in("id", ids);
    for (const u of us ?? []) usuariosById[u.id] = { username: u.username, nombre: u.nombre };
  }
  const lista = (profiles ?? []).map((p: { id: string; rol: string; activo: boolean }) => ({
    id: p.id,
    username: usuariosById[p.id]?.username ?? "—",
    nombre: usuariosById[p.id]?.nombre ?? "—",
    rol_turnova: p.rol,
    activo: p.activo,
  })).sort((a, b) => a.username.localeCompare(b.username));

  return NextResponse.json({ usuarios: lista });
}

export async function POST(request: Request) {
  const user = getServerUser();
  if (!user || !user.tenant_id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!esAdmin(user.rol_turnova)) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  if (!user.auth_user_id) {
    return NextResponse.json({ error: "Tu usuario no tiene auth_user_id; no se puede firmar el JWT de plataforma." }, { status: 400 });
  }
  if (!process.env.SUPABASE_JWT_SECRET) {
    return NextResponse.json({ error: "Falta SUPABASE_JWT_SECRET en el servidor." }, { status: 500 });
  }

  let body: { username?: string; nombre?: string; email?: string; rol_turnova?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }); }

  const username = (body.username || "").trim().toUpperCase();
  const nombre = (body.nombre || "").trim();
  const email = (body.email || "").trim();
  const rolTurnova = (body.rol_turnova || "operador").trim();
  if (!username || !nombre) return NextResponse.json({ error: "Username y nombre requeridos" }, { status: 400 });
  if (!ROLES_VALIDOS.includes(rolTurnova)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });

  const plat = platformAsUser(user.auth_user_id);
  const admin = createServiceClient();

  // 1) Crear usuario en la plataforma (como admin). Idempotente: si ya existe,
  //    lo recuperamos por username y completamos licencia/rol/PIN igual.
  let nuevoId: string | null = null;
  const { data: creado, error: e1 } = await plat.rpc("admin_crear_usuario", {
    p_username: username, p_nombre: nombre, p_email: email || null, p_rol: "mixto", p_permisos: {},
  });
  if (e1) {
    // ¿El usuario ya existe (alta previa parcial)? Recuperar su id y continuar.
    const { data: existente } = await admin
      .schema("public").from("usuarios").select("id").eq("username", username).maybeSingle();
    if (!existente?.id) {
      return NextResponse.json({ error: `No se pudo crear el usuario: ${e1.message}` }, { status: 400 });
    }
    nuevoId = existente.id;
  } else {
    nuevoId = typeof creado === "string" ? creado : (creado?.id || creado?.usuario_id || creado?.user_id || null);
  }
  if (!nuevoId) return NextResponse.json({ error: "El alta no devolvió un id de usuario." }, { status: 500 });

  // 2) Otorgar licencia Turnova en este tenant (uso interno FUESMEN = unlimited)
  const { error: e2 } = await plat.rpc("otorgar_licencia_turnova", {
    p_usuario_id: nuevoId, p_tenant_id: user.tenant_id, p_plan: "unlimited", p_dias: 3650, p_notas: "Alta interna FUESMEN",
  });
  if (e2) return NextResponse.json({ error: `Usuario creado pero falló la licencia: ${e2.message}`, id: nuevoId }, { status: 500 });

  // 3) Asignar rol Turnova en profiles
  await admin.from("profiles").update({ rol: rolTurnova }).eq("id", nuevoId).eq("tenant_id", user.tenant_id);

  // 4) PIN temporal
  let pinTemporal: string | null = null;
  try {
    const { data: pin } = await plat.rpc("admin_reset_pin", { p_usuario_id: nuevoId });
    pinTemporal = typeof pin === "string" ? pin : (pin?.pin || pin?.pin_temporal || null);
  } catch { /* no bloqueante */ }

  return NextResponse.json({ ok: true, id: nuevoId, username, rol_turnova: rolTurnova, pin_temporal: pinTemporal });
}

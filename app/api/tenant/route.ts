/**
 * PATCH /api/tenant
 * Actualiza los datos generales del centro (tenant): nombre, CUIT, zona horaria.
 * Auth: sesión Pyralis válida; opera sobre el tenant del usuario.
 */
import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server-session";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const user = getServerUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.tenant_id)
    return NextResponse.json({ error: "Usuario sin tenant" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};
  if (typeof body.nombre_centro === "string") {
    const v = body.nombre_centro.trim();
    if (!v) return NextResponse.json({ error: "El nombre no puede quedar vacío" }, { status: 400 });
    patch.nombre_centro = v;
  }
  if (typeof body.cuit === "string") patch.cuit = body.cuit.trim() || null;
  if (typeof body.timezone === "string") patch.timezone = body.timezone.trim() || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tenants")
    .update(patch)
    .eq("id", user.tenant_id);

  if (error) {
    console.error("[PATCH tenant] error:", error.message);
    return NextResponse.json(
      { error: "No se pudo guardar", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

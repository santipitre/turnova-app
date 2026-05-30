/**
 * API Route: GET /api/medicos/buscar?q=texto
 *
 * Autocompletado del catálogo de médicos derivantes (turnova.medicos_solicitantes).
 * Busca por nombre (substring) o por matrícula (prefijo), acotado al tenant del usuario.
 */
import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface MedicoSugerido {
  id: string;
  nombre_completo: string;
  matricula: string | null;
  especialidad: string | null;
}

export async function GET(request: Request) {
  const user = getServerUser();
  if (!user || !user.tenant_id) {
    return NextResponse.json({ medicos: [] }, { status: user ? 200 : 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ medicos: [] });
  }

  // Escapar comodines de PostgREST para evitar inyección de patrones
  const safe = q.replace(/[%,()]/g, " ").trim();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("medicos_solicitantes")
    .select("id, nombre, matricula, especialidad, pedidos_count")
    .eq("tenant_id", user.tenant_id)
    .or(`nombre.ilike.%${safe}%,matricula.ilike.${safe}%`)
    .order("pedidos_count", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[medicos/buscar] error:", error.message);
    return NextResponse.json({ medicos: [], error: error.message }, { status: 200 });
  }

  const medicos: MedicoSugerido[] = (data ?? []).map((m: any) => ({
    id: m.id,
    nombre_completo: m.nombre,
    matricula: m.matricula ?? null,
    especialidad: m.especialidad ?? null,
  }));

  return NextResponse.json({ medicos });
}

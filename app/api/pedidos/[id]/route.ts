/**
 * PATCH /api/pedidos/[id]
 * Permite a un usuario actualizar los datos extraídos de un pedido manualmente
 * después de revisión humana. Reemplaza los campos detectados por IA con los
 * datos corregidos por el operador.
 *
 * Auth: requiere sesión Pyralis válida (cookie turnova_session) y que el
 * pedido pertenezca al tenant del usuario.
 */
import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server-session";

interface UpdatePayload {
  practica_detectada?: string;
  obra_social_detectada?: string;
  medico_solicitante?: string;
  matricula_medico?: string;
  diagnostico_presunto?: string;
  numero_afiliado?: string;
  fecha_pedido?: string;
  urgencia_indicada?: boolean;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // 1. Auth
  const user = getServerUser();
  if (!user || !user.tenant_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // 2. Parse body
  let body: UpdatePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 3. Verificar que el pedido existe y pertenece al tenant
  const { data: pedido, error: fetchErr } = await supabase
    .from("pedidos_medicos")
    .select("id, tenant_id, extraccion_ia")
    .eq("id", params.id)
    .eq("tenant_id", user.tenant_id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[PATCH pedido] fetch error:", fetchErr);
    return NextResponse.json({ error: "Error al leer pedido" }, { status: 500 });
  }
  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  // 4. Resolver IDs de matching si el operador cambió la práctica/OS al catálogo
  let practicaIdMatched: string | null = null;
  let obraSocialIdMatched: string | null = null;

  if (body.practica_detectada) {
    const { data: practica } = await supabase
      .from("practicas")
      .select("id")
      .eq("tenant_id", user.tenant_id)
      .eq("nombre", body.practica_detectada)
      .maybeSingle();
    if (practica) practicaIdMatched = practica.id;
  }

  if (body.obra_social_detectada) {
    const { data: os } = await supabase
      .from("obras_sociales")
      .select("id")
      .eq("tenant_id", user.tenant_id)
      .eq("nombre", body.obra_social_detectada)
      .maybeSingle();
    if (os) obraSocialIdMatched = os.id;
  }

  // 5. Merge extraccion_ia preservando metadata original + flags de edición humana
  // NOTA: requiere_revision_manual vive DENTRO del JSON extraccion_ia, NO es columna.
  const extraccionPrevia = (pedido.extraccion_ia as Record<string, unknown>) || {};
  const matchingOk = !!(practicaIdMatched && obraSocialIdMatched);
  const nuevaExtraccion = {
    ...extraccionPrevia,
    medico_solicitante: body.medico_solicitante || null,
    matricula_medico: body.matricula_medico || null,
    diagnostico_presunto: body.diagnostico_presunto || null,
    numero_afiliado: body.numero_afiliado || null,
    fecha_pedido: body.fecha_pedido || null,
    urgencia_indicada: !!body.urgencia_indicada,
    practica_id_matched: practicaIdMatched,
    obra_social_id_matched: obraSocialIdMatched,
    // Si ahora hay match contra catálogo, el pedido sale de "requiere revisión"
    requiere_revision_manual: !matchingOk,
    // Marca de auditoría: este pedido fue corregido por un humano
    editado_manualmente: true,
    editado_por: user.username,
    editado_en: new Date().toISOString(),
  };

  // 6. Update pedido (solo columnas que existen en la tabla)
  const { error: updateErr } = await supabase
    .from("pedidos_medicos")
    .update({
      practica_detectada: body.practica_detectada || null,
      obra_social_detectada: body.obra_social_detectada || null,
      extraccion_ia: nuevaExtraccion,
      // Bumpear confianza a 1.0 porque ahora es decisión humana
      confianza_ia: 1.0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("tenant_id", user.tenant_id);

  if (updateErr) {
    console.error("[PATCH pedido] update error:", updateErr);
    return NextResponse.json(
      { error: "No se pudo actualizar el pedido", details: updateErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    pedido_id: params.id,
    matching_ok: matchingOk,
  });
}

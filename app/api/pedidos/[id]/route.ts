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
    .select(
      "id, tenant_id, extraccion_ia, practica_detectada, obra_social_detectada, archivo_storage_path, confianza_ia",
    )
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

  // 5. Detectar campos que cambiaron (vs valores originales) y bumpear su confianza
  const extraccionPrevia = (pedido.extraccion_ia as Record<string, unknown>) || {};
  const matchingOk = !!(practicaIdMatched && obraSocialIdMatched);

  const camposCorregidos: string[] = [];
  const checkChange = (
    campo: string,
    valorPrev: string | null | undefined,
    valorNuevo: string | undefined,
  ) => {
    const prev = (valorPrev ?? "").trim();
    const nuevo = (valorNuevo ?? "").trim();
    if (prev !== nuevo) camposCorregidos.push(campo);
  };
  checkChange("practica", pedido.practica_detectada, body.practica_detectada);
  checkChange("obra_social", pedido.obra_social_detectada, body.obra_social_detectada);
  checkChange("medico", extraccionPrevia.medico_solicitante as string | null, body.medico_solicitante);
  checkChange("matricula", extraccionPrevia.matricula_medico as string | null, body.matricula_medico);
  checkChange("numero_afiliado", extraccionPrevia.numero_afiliado as string | null, body.numero_afiliado);
  checkChange("diagnostico", extraccionPrevia.diagnostico_presunto as string | null, body.diagnostico_presunto);
  checkChange("fecha_pedido", extraccionPrevia.fecha_pedido as string | null, body.fecha_pedido);

  // Bumpear confianza_por_campo a 1.0 para los campos editados (verde en UI)
  const confianzaPrevia =
    (extraccionPrevia.confianza_por_campo as Record<string, number> | undefined) || {};
  const confianzaActualizada: Record<string, number> = { ...confianzaPrevia };
  const CAMPO_TO_CONF_KEY: Record<string, string> = {
    practica: "practica_solicitada",
    obra_social: "obra_social",
    medico: "medico_solicitante",
    matricula: "matricula_medico",
    numero_afiliado: "numero_afiliado",
    diagnostico: "diagnostico_presunto",
    fecha_pedido: "fecha_pedido",
  };
  for (const c of camposCorregidos) {
    const k = CAMPO_TO_CONF_KEY[c];
    if (k) confianzaActualizada[k] = 1.0;
  }

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
    confianza_por_campo: confianzaActualizada,
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

  // 7. APRENDIZAJE — guardar la corrección en correcciones_ia para que la IA
  // aprenda de este caso en futuros pedidos. No bloqueante.
  if (camposCorregidos.length > 0) {
    try {
      const { error: corrErr } = await supabase.from("correcciones_ia").insert({
        tenant_id: user.tenant_id,
        pedido_medico_id: params.id,
        // Valores que la IA tenía (antes de la corrección)
        ia_practica: pedido.practica_detectada,
        ia_obra_social: pedido.obra_social_detectada,
        ia_medico: extraccionPrevia.medico_solicitante ?? null,
        ia_matricula: extraccionPrevia.matricula_medico ?? null,
        ia_numero_afiliado: extraccionPrevia.numero_afiliado ?? null,
        ia_diagnostico: extraccionPrevia.diagnostico_presunto ?? null,
        ia_especialidad: extraccionPrevia.especialidad_inferida ?? null,
        ia_confianza_global: pedido.confianza_ia ?? null,
        // Valores corregidos por el humano (la verdad)
        humano_practica: body.practica_detectada || null,
        humano_obra_social: body.obra_social_detectada || null,
        humano_medico: body.medico_solicitante || null,
        humano_matricula: body.matricula_medico || null,
        humano_numero_afiliado: body.numero_afiliado || null,
        humano_diagnostico: body.diagnostico_presunto || null,
        // Campos que se modificaron (para métricas)
        campos_corregidos: camposCorregidos,
        // Para retrieval futuro
        archivo_storage_path: pedido.archivo_storage_path ?? null,
        corregido_por: user.username,
      });
      if (corrErr) {
        // No bloqueamos la respuesta — el aprendizaje es secundario al guardado
        console.error("[PATCH pedido] no se pudo guardar correccion:", corrErr.message);
      }
    } catch (err) {
      console.error("[PATCH pedido] excepción guardando correccion:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    pedido_id: params.id,
    matching_ok: matchingOk,
    campos_corregidos: camposCorregidos,
  });
}

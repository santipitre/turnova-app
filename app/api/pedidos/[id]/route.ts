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
import { puedeEditar } from "@/lib/auth/roles";

interface UpdatePayload {
  practica_detectada?: string;
  /** Lista completa de prácticas (1+). Si no viene, se usa solo practica_detectada. */
  practicas_array?: Array<{ nombre: string; cantidad?: number; codigo_nomenclador?: string | null }>;
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
  if (!puedeEditar(user.rol_turnova)) {
    return NextResponse.json({ error: "Tu rol (solo lectura) no permite editar pedidos." }, { status: 403 });
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

  // Si vinieron múltiples prácticas, matchear cada una al catálogo
  const practicasArrayResult: Array<{
    nombre: string;
    cantidad: number;
    codigo_nomenclador: string | null;
    confianza: number;
    practica_id: string | null;
  }> = [];
  if (Array.isArray(body.practicas_array) && body.practicas_array.length > 0) {
    for (const p of body.practicas_array) {
      if (!p.nombre || !p.nombre.trim()) continue;
      const nombre = p.nombre.trim();
      let matchId: string | null = null;
      const { data: practica } = await supabase
        .from("practicas")
        .select("id")
        .eq("tenant_id", user.tenant_id)
        .eq("nombre", nombre)
        .maybeSingle();
      if (practica) matchId = practica.id;
      practicasArrayResult.push({
        nombre,
        cantidad: Math.max(1, Math.round(Number(p.cantidad) || 1)),
        codigo_nomenclador: p.codigo_nomenclador ?? null,
        confianza: 1.0, // Editado por humano = 100%
        practica_id: matchId,
      });
    }
    // La primera del array es la principal (para columna practica_detectada)
    if (practicasArrayResult.length > 0 && !body.practica_detectada) {
      practicaIdMatched = practicasArrayResult[0].practica_id;
    }
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
    // Array de prácticas (sobrescribe el de la IA con la versión corregida por humano)
    practicas_array:
      practicasArrayResult.length > 0
        ? practicasArrayResult
        : (extraccionPrevia.practicas_array ?? null),
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

  // 8. APRENDIZAJE — auto-upsert del médico en el diccionario
  // Si el operador puso nombre y/o matrícula, alimentamos automáticamente
  // medicos_solicitantes para que la próxima vez la IA lo reconozca.
  if (body.medico_solicitante || body.matricula_medico) {
    try {
      const { error: upsertErr } = await supabase.rpc("upsert_medico_solicitante", {
        p_tenant_id: user.tenant_id,
        p_nombre: body.medico_solicitante || "",
        p_matricula: body.matricula_medico || null,
        p_especialidad: (extraccionPrevia.especialidad_inferida as string | null) || null,
        // Si la IA leyó algo distinto, lo guardamos como variante de cómo se firma
        p_variante_nombre:
          (extraccionPrevia.medico_solicitante as string | null) &&
          (extraccionPrevia.medico_solicitante as string | null) !== body.medico_solicitante
            ? (extraccionPrevia.medico_solicitante as string)
            : null,
        p_centro_emisor: null,
      });
      if (upsertErr) {
        console.warn("[PATCH pedido] no se pudo upsert médico:", upsertErr.message);
      }
    } catch (err) {
      console.warn("[PATCH pedido] excepción upsert médico:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    pedido_id: params.id,
    matching_ok: matchingOk,
    campos_corregidos: camposCorregidos,
  });
}

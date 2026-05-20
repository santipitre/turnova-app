/**
 * API Route: POST /api/procesar-pedido
 *
 * Recibe una imagen/PDF de pedido médico, llama a Claude Vision para extraer datos,
 * matchea obra social y práctica contra la BD, y guarda el pedido en pedidos_medicos.
 *
 * Body: { archivo_base64: string, media_type: string, paciente_id?: string, canal_origen?: string }
 * Response: { ok: true, pedido_medico: {...}, matching: {...}, metrica: {...} }
 */

import { NextResponse } from "next/server";
import { createClient as createServerClient, createServiceClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/server-session";
import { extraerDatosPedido } from "@/lib/api/claude-vision";

export const runtime = "nodejs"; // Necesitamos Node, no Edge (atob, fetch grande)
export const maxDuration = 60; // segundos

interface RequestBody {
  archivo_base64?: string;
  media_type?: string;
  paciente_id?: string;
  canal_origen?: string;
}

export async function POST(request: Request) {
  // ---------------------------------------------------------------
  // 1. Validar sesión Pyralis y obtener tenant
  // ---------------------------------------------------------------
  const user = getServerUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!user.tenant_id) {
    return NextResponse.json({ error: "Usuario sin tenant Turnova" }, { status: 403 });
  }

  const supabase = createServerClient();
  const profile = { id: user.id, tenant_id: user.tenant_id, nombre: user.nombre };

  // ---------------------------------------------------------------
  // 2. Parsear body
  // ---------------------------------------------------------------
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  if (!body.archivo_base64 || !body.media_type) {
    return NextResponse.json(
      { error: "Falta archivo_base64 o media_type" },
      { status: 400 },
    );
  }

  const admin = createServiceClient();

  // ---------------------------------------------------------------
  // 3. Subir archivo a Storage para preview/auditoría
  // ---------------------------------------------------------------
  let archivoUrl: string | null = null;
  let archivoStoragePath: string | null = null;
  try {
    const fileBytes = Uint8Array.from(atob(body.archivo_base64), (c) => c.charCodeAt(0));
    const ext = body.media_type === "application/pdf"
      ? "pdf"
      : body.media_type.split("/")[1] ?? "jpg";
    const fileName = `${profile.tenant_id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("pedidos-medicos")
      .upload(fileName, fileBytes, {
        contentType: body.media_type,
        upsert: false,
      });

    if (uploadError) {
      console.warn("Storage upload failed (no bloqueante):", uploadError.message);
    } else {
      archivoStoragePath = fileName;
      // Generar URL firmada con expiración de 24 horas para preview
      const { data: signed } = await admin.storage
        .from("pedidos-medicos")
        .createSignedUrl(fileName, 60 * 60 * 24);
      archivoUrl = signed?.signedUrl ?? null;
    }
  } catch (e) {
    console.warn("Error subiendo a Storage (no bloqueante):", e);
  }

  // ---------------------------------------------------------------
  // 4. Cargar catálogo del centro (OS + prácticas) para inyectar en prompt Claude
  // ---------------------------------------------------------------
  let catalogo = null;
  try {
    const [{ data: os }, { data: practicas }] = await Promise.all([
      supabase
        .from("obras_sociales")
        .select("nombre, aliases")
        .eq("tenant_id", profile.tenant_id)
        .eq("activa", true)
        .order("nombre"),
      supabase
        .from("practicas")
        .select("nombre, codigo_nomenclador, servicio")
        .eq("tenant_id", profile.tenant_id)
        .eq("activa", true)
        .order("nombre"),
    ]);
    catalogo = {
      obras_sociales: (os || []).map((r: any) => ({ nombre: r.nombre, aliases: r.aliases || [] })),
      practicas: (practicas || []).map((r: any) => ({
        nombre: r.nombre,
        codigo: r.codigo_nomenclador,
        servicio: r.servicio,
      })),
    };
  } catch (e) {
    console.warn("No pude cargar catálogo, Claude usará prompt genérico:", e);
  }

  // ---------------------------------------------------------------
  // 5. Llamar Claude Vision
  // ---------------------------------------------------------------
  const inicioIA = Date.now();
  let datos;
  try {
    datos = await extraerDatosPedido(body.archivo_base64, body.media_type, catalogo);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Error procesando con IA: ${msg}` },
      { status: 500 },
    );
  }
  const tiempoIA = Date.now() - inicioIA;

  // ---------------------------------------------------------------
  // 5. Matching contra BD

  let obraSocialId: string | null = null;
  let practicaId: string | null = null;

  if (datos.obra_social) {
    const { data: match } = await admin.rpc("match_obra_social", {
      p_tenant_id: profile.tenant_id,
      p_nombre_detectado: datos.obra_social,
    });
    obraSocialId = match ?? null;
  }

  if (datos.practica_solicitada) {
    const { data: match } = await admin.rpc("match_practica", {
      p_tenant_id: profile.tenant_id,
      p_nombre_detectado: datos.practica_solicitada,
    });
    practicaId = match ?? null;
  }

  // ---------------------------------------------------------------
  // 5. Decidir si requiere revisión manual
  // ---------------------------------------------------------------
  const UMBRAL_CONFIANZA = 0.85;
  const requiereRevision =
    datos.confianza < UMBRAL_CONFIANZA || !obraSocialId || !practicaId;

  // ---------------------------------------------------------------
  // 6. Guardar pedido_medico (schema turnova.pedidos_medicos)
  // ---------------------------------------------------------------
  const pedidoData = {
    tenant_id: profile.tenant_id,
    paciente_id: body.paciente_id ?? null,
    archivo_url: archivoUrl, // URL firmada con expiración 24hs
    archivo_storage_path: archivoStoragePath,
    canal_origen: body.canal_origen ?? "web",
    medico_solicitante: datos.medico_solicitante ?? null,
    matricula: datos.matricula_medico ?? null,
    practica_detectada: datos.practica_solicitada ?? null,
    practica_id: practicaId,
    obra_social_detectada: datos.obra_social ?? null,
    obra_social_id: obraSocialId,
    nro_afiliado_detectado: datos.numero_afiliado ?? null,
    urgencia: datos.urgencia_indicada ? "alta" : "media",
    estado: "procesado",
    extraccion_ia: {
      ...datos,
      practica_id_matched: practicaId,
      obra_social_id_matched: obraSocialId,
      requiere_revision_manual: requiereRevision,
      tiempo_procesamiento_ms: tiempoIA,
    },
    confianza_ia: datos.confianza,
  };

  const { data: pedidoGuardado, error: errSave } = await admin
    .from("pedidos_medicos")
    .insert(pedidoData)
    .select()
    .single();

  if (errSave) {
    return NextResponse.json(
      { error: `Error guardando pedido: ${errSave.message}` },
      { status: 500 },
    );
  }

  // ---------------------------------------------------------------
  // 7. Auditoría (schema turnova.auditoria)
  // ---------------------------------------------------------------
  await admin.from("auditoria").insert({
    tenant_id: profile.tenant_id,
    usuario_id: profile.id,
    accion: "procesar_ia",
    tabla: "pedidos_medicos",
    registro_id: pedidoGuardado.id,
    payload: {
      confianza: datos.confianza,
      tiempo_ms: tiempoIA,
      obra_social_matched: !!obraSocialId,
      practica_matched: !!practicaId,
    },
  });

  return NextResponse.json({
    ok: true,
    pedido_medico: pedidoGuardado,
    matching: {
      obra_social_id: obraSocialId,
      practica_id: practicaId,
      requiere_revision_manual: requiereRevision,
    },
    metrica: {
      confianza: datos.confianza,
      tiempo_ms: tiempoIA,
    },
  });
}

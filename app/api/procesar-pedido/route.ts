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
  // 4b. APRENDIZAJE — traer correcciones previas + médicos conocidos + patrones OS
  // No bloqueante: si falla, seguimos con el contexto que se haya podido cargar.
  // ---------------------------------------------------------------
  let correcciones: import("@/lib/api/claude-vision").CorreccionPrevia[] = [];
  try {
    const { data, error } = await supabase.rpc("get_correcciones_relevantes", {
      p_tenant_id: profile.tenant_id,
      p_limit: 8,
    });
    if (error) console.warn("[procesar] correcciones:", error.message);
    else if (data) correcciones = data;
  } catch (e) {
    console.warn("[procesar] error correcciones (no bloqueante):", e);
  }

  let medicosConocidos: import("@/lib/api/claude-vision").MedicoConocido[] = [];
  let patronesAfiliado: import("@/lib/api/claude-vision").PatronAfiliado[] = [];
  try {
    const { data, error } = await supabase.rpc("get_contexto_aprendizaje", {
      p_tenant_id: profile.tenant_id,
      p_top_medicos: 30,
    });
    if (error) {
      console.warn("[procesar] contexto aprendizaje:", error.message);
    } else if (data) {
      for (const row of data as any[]) {
        if (row.tipo === "medico") {
          medicosConocidos.push({
            nombre: row.nombre,
            matricula: row.matricula,
            especialidad: row.especialidad,
          });
        } else if (row.tipo === "patron_os") {
          patronesAfiliado.push({
            obra_social_nombre: row.obra_social_nombre,
            formato_descripcion: row.formato_descripcion,
            ejemplos: row.ejemplos,
          });
        }
      }
    }
  } catch (e) {
    console.warn("[procesar] error contexto aprendizaje (no bloqueante):", e);
  }

  console.log(
    `[procesar] contexto IA: ${correcciones.length} correcciones, ${medicosConocidos.length} médicos, ${patronesAfiliado.length} patrones OS`,
  );

  // ---------------------------------------------------------------
  // 5. Llamar Claude Vision con TODO el contexto
  // ---------------------------------------------------------------
  const inicioIA = Date.now();
  let datos;
  try {
    datos = await extraerDatosPedido(
      body.archivo_base64,
      body.media_type,
      catalogo,
      correcciones,
      medicosConocidos,
      patronesAfiliado,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Error procesando con IA: ${msg}` },
      { status: 500 },
    );
  }
  const tiempoIA = Date.now() - inicioIA;

  // ---------------------------------------------------------------
  // 4.b Matchear el médico derivante contra el catálogo (medicos_solicitantes)
  //     Prioridad: matrícula exacta (1.0) > similitud de nombre (pg_trgm).
  //     Auto-elige la mejor opción y la marca para revisión salvo match exacto.
  // ---------------------------------------------------------------
  let medicoCanonNombre: string | null = datos.medico_solicitante ?? null;
  let medicoCanonMatricula: string | null = datos.matricula_medico ?? null;
  let medicoMatch: {
    id: string;
    nombre: string;
    matricula: string | null;
    similitud: number;
  } | null = null;
  let medicoNoCatalogado = false;

  if (datos.medico_solicitante || datos.matricula_medico) {
    try {
      const { data: matches } = await admin.rpc("buscar_medico_similar", {
        p_tenant_id: profile.tenant_id,
        p_nombre: datos.medico_solicitante ?? null,
        p_matricula: datos.matricula_medico ?? null,
        p_threshold: 0.4,
      });
      const best = Array.isArray(matches) && matches.length > 0 ? matches[0] : null;
      if (best) {
        medicoMatch = {
          id: best.id,
          nombre: best.nombre,
          matricula: best.matricula ?? null,
          similitud: Number(best.similitud) || 0,
        };
        // Adoptar la identidad canónica del catálogo
        medicoCanonNombre = best.nombre;
        if (best.matricula) medicoCanonMatricula = best.matricula;
      } else if (datos.medico_solicitante) {
        // La IA leyó un derivante que no está en el catálogo: queda para revisión
        medicoNoCatalogado = true;
      }
    } catch (e) {
      console.warn("[procesar] match de médico falló:", e);
    }
  }

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

  // Matchear TODAS las prácticas del array contra el catálogo
  // (la principal ya quedó en practicaId arriba)
  const practicasArray: Array<{
    nombre: string;
    codigo_nomenclador: string | null;
    confianza: number;
    practica_id: string | null;
  }> = [];
  if (Array.isArray(datos.practicas_solicitadas) && datos.practicas_solicitadas.length > 0) {
    for (const p of datos.practicas_solicitadas) {
      let matchId: string | null = null;
      try {
        const { data: match } = await admin.rpc("match_practica", {
          p_tenant_id: profile.tenant_id,
          p_nombre_detectado: p.nombre,
        });
        matchId = match ?? null;
      } catch (e) {
        console.warn(`[procesar] match falló para práctica "${p.nombre}":`, e);
      }
      practicasArray.push({
        nombre: p.nombre,
        codigo_nomenclador: p.codigo_nomenclador ?? null,
        confianza: p.confianza ?? 0.8,
        practica_id: matchId,
      });
    }
    console.log(`[procesar] ${practicasArray.length} prácticas detectadas, ${practicasArray.filter((p) => p.practica_id).length} matcheadas al catálogo`);
  }

  // ---------------------------------------------------------------
  // 4.c Autorización — ¿esta práctica requiere autorización previa
  //     para esta obra social? (matriz por grupo de estudio, migración 003)
  // ---------------------------------------------------------------
  let autorizacion: {
    requiere: boolean;
    regla: string;
    grupo: string | null;
    tope_anual: string | null;
    vigencia_dias: number;
    requisitos: string | null;
    estado_dato: string;
    fuente: string;
  } | null = null;
  if (obraSocialId && practicaId) {
    try {
      const { data: aut, error: autErr } = await admin.rpc("requiere_autorizacion", {
        p_tenant_id: profile.tenant_id,
        p_obra_social_id: obraSocialId,
        p_practica_id: practicaId,
      });
      if (autErr) console.warn("[procesar] requiere_autorizacion:", autErr.message);
      else autorizacion = aut ?? null;
    } catch (e) {
      console.warn("[procesar] excepción autorización (no bloqueante):", e);
    }
  }

  // Fallback: si el estudio no matcheó al catálogo (practica_id null) pero sí la obra social,
  // inferimos el GRUPO desde el texto leído y resolvemos la autorización por la matriz.
  if (!autorizacion && obraSocialId && datos.practica_solicitada) {
    try {
      const { data: aut2, error: e2 } = await admin.rpc("requiere_autorizacion_texto", {
        p_tenant_id: profile.tenant_id,
        p_obra_social_id: obraSocialId,
        p_texto: datos.practica_solicitada,
      });
      if (e2) console.warn("[procesar] requiere_autorizacion_texto:", e2.message);
      else if (aut2) autorizacion = aut2;
    } catch (e) {
      console.warn("[procesar] excepción autorización_texto (no bloqueante):", e);
    }
  }

  // Autorización por CADA práctica detectada (pedidos con varios estudios)
  if (obraSocialId && practicasArray.length > 0) {
    for (const it of practicasArray) {
      try {
        let a: unknown = null;
        if (it.practica_id) {
          const { data } = await admin.rpc("requiere_autorizacion", {
            p_tenant_id: profile.tenant_id, p_obra_social_id: obraSocialId, p_practica_id: it.practica_id,
          });
          a = data ?? null;
        }
        if (!a && it.nombre) {
          const { data } = await admin.rpc("requiere_autorizacion_texto", {
            p_tenant_id: profile.tenant_id, p_obra_social_id: obraSocialId, p_texto: it.nombre,
          });
          a = data ?? null;
        }
        (it as Record<string, unknown>).autorizacion = a;
      } catch (e) {
        console.warn("[procesar] autorización por práctica (no bloqueante):", e);
      }
    }
    // La autorización principal = la de la primera práctica si aún no se resolvió
    if (!autorizacion) autorizacion = ((practicasArray[0] as Record<string, unknown>).autorizacion as typeof autorizacion) ?? null;
  }

  // ---------------------------------------------------------------
  // 5. Decidir si requiere revisión manual
  // ---------------------------------------------------------------
  const UMBRAL_CONFIANZA = 0.85;
  // Autorización sin regla definida (A_CONFIRMAR) → conviene revisión manual
  const autorizacionSinRegla =
    !!autorizacion && (autorizacion.regla === "A_CONFIRMAR" || autorizacion.fuente === "sin_regla");
  // Match de médico dudoso: hay match pero no por matrícula exacta y similitud < 0.6
  const medicoMatchDudoso =
    !!medicoMatch && medicoMatch.similitud < 0.6;
  const requiereRevision =
    datos.confianza < UMBRAL_CONFIANZA ||
    !obraSocialId ||
    !practicaId ||
    medicoNoCatalogado ||
    medicoMatchDudoso ||
    autorizacionSinRegla;

  // ---------------------------------------------------------------
  // 6. Guardar pedido_medico (schema turnova.pedidos_medicos)
  // ---------------------------------------------------------------
  const pedidoData = {
    tenant_id: profile.tenant_id,
    paciente_id: body.paciente_id ?? null,
    archivo_url: archivoUrl, // URL firmada con expiración 24hs
    archivo_storage_path: archivoStoragePath,
    canal_origen: body.canal_origen ?? "web",
    medico_solicitante: medicoCanonNombre,
    matricula: medicoCanonMatricula,
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
      // Array de TODAS las prácticas detectadas (1+) con su match al catálogo
      practicas_array: practicasArray,
      // Médico derivante resuelto contra el catálogo
      medico_match: medicoMatch,
      medico_no_catalogado: medicoNoCatalogado,
      // Lo que leyó la IA antes de canonizar (para auditoría)
      medico_leido_ia: datos.medico_solicitante ?? null,
      matricula_leida_ia: datos.matricula_medico ?? null,
      // Autorización previa según matriz (obra social × grupo de estudio)
      autorizacion,
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
      autorizacion,
    },
    metrica: {
      confianza: datos.confianza,
      tiempo_ms: tiempoIA,
    },
  });
}

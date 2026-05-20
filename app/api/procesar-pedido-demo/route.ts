/**
 * API Route PÚBLICA (sin auth): POST /api/procesar-pedido-demo
 *
 * Modo demo del lector de pedidos médicos.
 * Solo extrae datos con Claude Vision y los devuelve.
 * NO guarda en la base de datos, NO requiere login.
 *
 * Body: { archivo_base64: string, media_type: string }
 * Response: { ok: true, datos: {...}, metrica: { tiempo_ms } }
 */

import { NextResponse } from "next/server";
import { extraerDatosPedido } from "@/lib/api/claude-vision";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RequestBody {
  archivo_base64?: string;
  media_type?: string;
}

export async function POST(request: Request) {
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

  const inicio = Date.now();
  let datos;
  try {
    datos = await extraerDatosPedido(body.archivo_base64, body.media_type);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Error procesando con IA: ${msg}` },
      { status: 500 },
    );
  }
  const tiempo_ms = Date.now() - inicio;

  return NextResponse.json({
    ok: true,
    datos,
    metrica: {
      confianza: datos.confianza ?? null,
      tiempo_ms,
    },
  });
}

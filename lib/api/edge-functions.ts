/**
 * Helpers para llamar a las Edge Functions de Supabase desde el cliente.
 * Post-migración 2026-05-20: usa anon key directo (sin Supabase Auth).
 */
"use client";

import type {
  AsignarTurnoResponse,
  ProcesarPedidoResponse,
  Turno,
} from "@/lib/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function callEdge<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? `Error ${response.status}`);
  }
  return data as T;
}

/**
 * Procesa un pedido médico con Claude Vision.
 */
export async function procesarPedido(input: {
  pedido_id?: string;
  archivo_url?: string;
  archivo_base64?: string;
  media_type?: string;
  paciente_id?: string;
  canal_origen?: string;
}): Promise<ProcesarPedidoResponse> {
  const response = await fetch("/api/procesar-pedido", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error ?? `Error ${response.status}`);
  return data as ProcesarPedidoResponse;
}

export async function asignarTurno(input: {
  pedido_medico_id: string;
  paciente_id?: string;
  sede_preferida?: string;
}): Promise<AsignarTurnoResponse> {
  return callEdge("/functions/v1/asignar-turno", input);
}

export async function confirmarTurno(input: {
  turno_id: string;
  canal_confirmacion?: string;
}): Promise<{ ok: true; turno: Turno; detalle: Record<string, unknown> }> {
  return callEdge("/functions/v1/confirmar-turno", input);
}

export async function cancelarTurno(input: {
  turno_id: string;
  motivo?: string;
}): Promise<{ ok: true; turno: Turno; libero_cupo: boolean }> {
  return callEdge("/functions/v1/cancelar-turno", input);
}

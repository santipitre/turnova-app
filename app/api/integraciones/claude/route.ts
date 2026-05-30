/**
 * GET /api/integraciones/claude
 *   -> { connected, model } estado de la integración con Anthropic.
 * GET /api/integraciones/claude?test=1
 *   -> hace una llamada mínima real para verificar que la API key funciona.
 */
import { NextResponse } from "next/server";

import { getServerUser } from "@/lib/auth/server-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-opus-4-7";

export async function GET(request: Request) {
  const user = getServerUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const connected = !!apiKey;
  const test = new URL(request.url).searchParams.get("test") === "1";

  if (!test) {
    return NextResponse.json({ connected, model: CLAUDE_MODEL });
  }

  if (!connected) {
    return NextResponse.json(
      { connected: false, model: CLAUDE_MODEL, test: { ok: false, error: "Falta ANTHROPIC_API_KEY" } },
      { status: 200 },
    );
  }

  // Llamada mínima de verificación
  const inicio = Date.now();
  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    const latencia = Date.now() - inicio;
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({
        connected: true,
        model: CLAUDE_MODEL,
        test: { ok: false, status: res.status, error: txt.slice(0, 200) },
      });
    }
    return NextResponse.json({
      connected: true,
      model: CLAUDE_MODEL,
      test: { ok: true, latencia_ms: latencia },
    });
  } catch (e) {
    return NextResponse.json({
      connected: true,
      model: CLAUDE_MODEL,
      test: { ok: false, error: e instanceof Error ? e.message : "Error de red" },
    });
  }
}

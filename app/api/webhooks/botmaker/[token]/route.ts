// ============================================================
// BOTMAKER -> TURNOVA  webhook receptor de mensajes
//
// BOTMAKER hace POST a:
//   https://turnova-app.vercel.app/api/webhooks/botmaker/<SECRETO>
// El <SECRETO> en la URL valida que quien pega es BOTMAKER y no un tercero.
// (Recomendado ademas: activar la allowlist de IPs de BOTMAKER en Vercel.)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  // 1) Validar el secreto del path
  if (
    !process.env.BOTMAKER_WEBHOOK_SECRET ||
    params.token !== process.env.BOTMAKER_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2) Parsear el payload
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // 3) Solo nos interesan las notificaciones de mensajes
  if (payload?.type !== "message" || !Array.isArray(payload.messages)) {
    return NextResponse.json({ ok: true, ignored: "no es mensaje" });
  }

  // 4) Quedarnos SOLO con lo que escribe el paciente (no el bot, no operadores)
  const mensajesPaciente = payload.messages.filter(
    (m: any) => m?.from === "user" || m?.fromCustomer === true
  );
  if (mensajesPaciente.length === 0) {
    return NextResponse.json({ ok: true, ignored: "sin mensajes de usuario" });
  }

  // 5) Mapear al formato de la tabla turnova.pedidos_entrantes
  const rows = mensajesPaciente.map((m: any) => ({
    botmaker_message_id: m._id ?? m._id_ ?? null,
    contact_id: payload.contactId ?? null,
    customer_id: payload.customerId ?? null,
    nombre: payload.firstName ?? null,
    apellido: payload.lastName ?? null,
    chat_platform: payload.chatPlatform ?? null,
    chat_channel_id: payload.chatChannelId ?? null,
    session_id: payload.sessionId ?? null,
    mensaje: m.message ?? null,
    adjunto_url: m.image ?? m.file ?? m.audio ?? m.video ?? null,
    fecha_mensaje: m.date ?? null,
    raw: payload,
    estado: "pendiente",
  }));

  // 6) Guardar (upsert para no duplicar si BOTMAKER reintenta)
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("pedidos_entrantes")
    .upsert(rows, { onConflict: "botmaker_message_id", ignoreDuplicates: true });

  if (error) {
    console.error("[botmaker-webhook] error insertando:", error);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  // 7) Responder rapido. El Motor Claude procesa los "pendiente" aparte.
  return NextResponse.json({ ok: true, recibidos: rows.length });
}

// Util para chequear a mano que el endpoint existe (GET en el navegador).
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  if (params.token !== process.env.BOTMAKER_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    mensaje: "Webhook BOTMAKER activo. Configuralo en BOTMAKER con metodo POST.",
  });
}

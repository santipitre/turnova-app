/**
 * POST /api/auth/cambiar-pin
 * Cambia el PIN del usuario logueado y baja el flag debe_cambiar_pin.
 * Usado por el modal de cambio forzado (primer ingreso / reset).
 */
import { NextResponse } from "next/server";
import { getServerUser, setServerSession } from "@/lib/auth/server-session";
import { createPublicClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PINS_TRIVIALES = [
  "1234", "0000", "1111", "2222", "3333", "4444", "5555",
  "6666", "7777", "8888", "9999", "4321", "1212", "123456",
];

export async function POST(request: Request) {
  const user = getServerUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { pin_actual?: string; pin_nuevo?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }); }

  const actual = (body.pin_actual || "").trim();
  const nuevo = (body.pin_nuevo || "").trim();
  if (!actual || !nuevo) return NextResponse.json({ error: "Ingresá el PIN actual y el nuevo" }, { status: 400 });
  if (!/^\d{4,8}$/.test(nuevo)) return NextResponse.json({ error: "El PIN nuevo debe tener entre 4 y 8 dígitos" }, { status: 400 });
  if (nuevo === actual) return NextResponse.json({ error: "El PIN nuevo no puede ser igual al actual" }, { status: 400 });
  if (PINS_TRIVIALES.includes(nuevo)) return NextResponse.json({ error: "Elegí un PIN menos obvio (evitá 1234, 0000, etc.)" }, { status: 400 });

  const supabase = createPublicClient();
  const { data: ok, error } = await supabase.rpc("cambiar_pin", {
    p_usuario_id: user.id, p_pin_actual: actual, p_pin_nuevo: nuevo,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (ok !== true) return NextResponse.json({ error: "El PIN actual es incorrecto" }, { status: 400 });

  // Refrescar la sesión con el flag ya en false (re-firma la cookie).
  setServerSession({ ...user, debe_cambiar_pin: false });
  return NextResponse.json({ ok: true });
}

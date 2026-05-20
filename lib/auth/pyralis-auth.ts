/**
 * Pyralis Auth — sistema PIN-based compartido con Lumen/Dictom.
 *
 * Reemplaza a Supabase Auth. Usa RPC functions en el Supabase Lumen
 * (`erjdncsnomwymjiaslpx`) para verificar PIN + licencia.
 *
 * Session: cookie httpOnly "turnova_session" con JSON base64 (8hs).
 * Schema: queries de data van contra `turnova.*` (configurado en supabase clients).
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const SESSION_COOKIE_NAME = "turnova_session";
export const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 horas

export interface TurnovaUser {
  id: string;
  username: string;
  nombre: string;
  rol: string; // rol Lumen (admin/consultor/mixto/solicitante/licencias)
  debe_cambiar_pin: boolean;
  tenant_id: string | null;
  rol_turnova: string | null; // superadmin/admin/operador/solo_lectura
}

export interface TurnovaSession {
  user: TurnovaUser;
  ts: number; // timestamp creación (ms)
}

export interface LicenciaTurnova {
  vigente: boolean;
  plan: string | null;
  dias_restantes: number;
  fecha_fin: string | null;
}

// Cliente RPC sin Auth context (anon key, las funciones son SECURITY DEFINER)
function getRpcClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Verifica usuario + PIN contra public.usuarios.
 * Si OK, verifica que tenga licencia Turnova activa.
 * Devuelve el user listo para guardar en sesión.
 */
export async function loginWithPin(
  username: string,
  pin: string,
): Promise<TurnovaUser> {
  const supabase = getRpcClient();

  const { data: userRows, error: userErr } = await supabase.rpc(
    "verificar_pin_turnova",
    { p_username: username.trim(), p_pin: pin.trim() },
  );

  if (userErr) throw new Error(`Error de conexión: ${userErr.message}`);
  if (!userRows || userRows.length === 0) {
    throw new Error("Usuario o PIN incorrecto");
  }

  const row = userRows[0];

  // Verificar licencia Turnova vigente
  const { data: licData, error: licErr } = await supabase.rpc(
    "licencia_turnova_activa",
    { p_usuario_id: row.id },
  );

  if (licErr) throw new Error(`Error verificando licencia: ${licErr.message}`);
  const licencia = licData?.[0] as LicenciaTurnova | undefined;
  if (!licencia?.vigente) {
    throw new Error(
      "No tenés licencia activa para Turnova. Contactá al administrador para solicitar acceso.",
    );
  }

  return {
    id: row.id,
    username: row.username,
    nombre: row.nombre,
    rol: row.rol,
    debe_cambiar_pin: row.debe_cambiar_pin,
    tenant_id: row.tenant_id,
    rol_turnova: row.rol_turnova,
  };
}

/**
 * Consulta licencia activa por usuario (sin login).
 */
export async function getLicencia(userId: string): Promise<LicenciaTurnova | null> {
  const supabase = getRpcClient();
  const { data, error } = await supabase.rpc("licencia_turnova_activa", {
    p_usuario_id: userId,
  });
  if (error) return null;
  return (data?.[0] as LicenciaTurnova) ?? null;
}

/**
 * Codifica una sesión a string para cookie.
 * Formato: base64(JSON({ user, ts })).
 */
export function encodeSession(user: TurnovaUser): string {
  const session: TurnovaSession = { user, ts: Date.now() };
  const json = JSON.stringify(session);
  if (typeof window === "undefined") {
    return Buffer.from(json, "utf-8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(json)));
}

/**
 * Decodifica string de cookie a sesión.
 * Devuelve null si el cookie es inválido o expiró.
 */
export function decodeSession(cookieValue: string | undefined): TurnovaSession | null {
  if (!cookieValue) return null;
  try {
    let json: string;
    if (typeof window === "undefined") {
      json = Buffer.from(cookieValue, "base64").toString("utf-8");
    } else {
      json = decodeURIComponent(escape(atob(cookieValue)));
    }
    const session = JSON.parse(json) as TurnovaSession;
    if (!session.user?.id || !session.ts) return null;
    if (Date.now() - session.ts > SESSION_TIMEOUT_MS) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Devuelve true si la sesión es válida (existe y no expiró).
 */
export function isSessionValid(session: TurnovaSession | null): boolean {
  if (!session) return false;
  return Date.now() - session.ts <= SESSION_TIMEOUT_MS;
}

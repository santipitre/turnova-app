/**
 * Cliente Supabase (schema public) que actúa como el usuario admin logueado,
 * presentando un JWT firmado. Permite llamar a las funciones admin de la
 * plataforma (admin_crear_usuario, otorgar_licencia_turnova, admin_reset_pin...).
 * Usar SOLO en route handlers server-side, después de verificar esAdmin().
 */
import { createClient } from "@supabase/supabase-js";
import { mintSupabaseJwt } from "@/lib/auth/supabase-jwt";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function platformAsUser(authUserId: string) {
  const jwt = mintSupabaseJwt(authUserId);
  return createClient(URL, ANON, {
    db: { schema: "public" },
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

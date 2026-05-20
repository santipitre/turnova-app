/**
 * Clientes Supabase para Server Components, Route Handlers, Server Actions.
 *
 * Cambio 2026-05-20: Turnova usa el Supabase de Lumen (erjdncsnomwymjiaslpx).
 * Schema operativo: turnova.* (configurado por default).
 * Auth: PIN-based via lib/auth/pyralis-auth, NO Supabase Auth.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const COMMON_AUTH = { autoRefreshToken: false, persistSession: false };

export function createClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: COMMON_AUTH,
    db: { schema: "turnova" },
  });
}

export function createServiceClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: COMMON_AUTH,
    db: { schema: "turnova" },
  });
}

export function createPublicClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: COMMON_AUTH,
    db: { schema: "public" },
  });
}

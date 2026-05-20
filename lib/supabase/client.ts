/**
 * Cliente Supabase para Client Components (navegador).
 *
 * Cambio 2026-05-20: usa el Supabase Lumen + schema turnova por default.
 * Auth: PIN-based via lib/auth/client-session, no Supabase Auth.
 */
"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente anon para queries desde el browser.
 * Schema default: `turnova`. Para public usar `.schema('public').from(...)`.
 */
export function createClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "turnova" },
  });
}

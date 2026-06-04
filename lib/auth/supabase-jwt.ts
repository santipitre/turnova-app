/**
 * Firma un JWT compatible con Supabase (HS256) para que el servidor de Turnova
 * pueda actuar ante Supabase como el usuario logueado (auth.uid() = su auth_user_id).
 * Esto habilita llamar a las funciones admin de la plataforma (admin_crear_usuario, etc.)
 * y, a futuro, la RLS por tenant.
 *
 * Secreto: process.env.SUPABASE_JWT_SECRET (Settings -> API -> JWT Secret). Solo en el server.
 */
import crypto from "crypto";

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function mintSupabaseJwt(authUserId: string, ttlSeconds = 300): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET no está configurada en el servidor");
  if (!authUserId) throw new Error("Falta auth_user_id para firmar el JWT");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      sub: authUserId,
      role: "authenticated",
      aud: "authenticated",
      iat: now,
      exp: now + ttlSeconds,
    }),
  );
  const sig = b64url(crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

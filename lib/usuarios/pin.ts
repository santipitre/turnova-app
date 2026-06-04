/**
 * admin_reset_pin devuelve jsonb {ok, username, mensaje:'PIN reseteado a 1234'}.
 * No genera un PIN aleatorio: resetea a un PIN fijo. Extraemos el número del mensaje.
 */
export function extraerPin(pin: unknown): string | null {
  if (typeof pin === "string") return pin;
  if (pin && typeof pin === "object") {
    const p = pin as Record<string, unknown>;
    if (typeof p.pin === "string") return p.pin;
    if (typeof p.pin_temporal === "string") return p.pin_temporal;
    if (typeof p.mensaje === "string") {
      const m = p.mensaje.match(/(\d{4,})/);
      if (m) return m[1];
    }
  }
  return null;
}

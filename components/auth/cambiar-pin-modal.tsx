"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";

/**
 * Modal bloqueante de cambio de PIN. Se muestra cuando el usuario tiene
 * debe_cambiar_pin = true (primer ingreso o tras un reset). No se puede cerrar
 * hasta cambiarlo. Diseño Turnova (no es el popup de Chrome).
 */
export function CambiarPinModal({ open }: { open: boolean }) {
  const router = useRouter();
  const [actual, setActual] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [repetir, setRepetir] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (nuevo !== repetir) { toast.error("El PIN nuevo y su repetición no coinciden"); return; }
    if (!/^\d{4,8}$/.test(nuevo)) { toast.error("El PIN nuevo debe tener entre 4 y 8 dígitos"); return; }
    setGuardando(true);
    try {
      const r = await fetch("/api/auth/cambiar-pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin_actual: actual, pin_nuevo: nuevo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "No se pudo cambiar el PIN");
      toast.success("PIN actualizado");
      router.refresh(); // el layout relee la sesión (flag en false) → el modal desaparece
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar el PIN");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(12, 10, 9, 0.78)", backdropFilter: "blur(6px)" }}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(160deg, #1c1917, #0c0a09)",
          border: "1px solid rgba(251, 191, 36, 0.25)",
          boxShadow: "0 0 40px rgba(251, 191, 36, 0.10), inset 0 0 20px rgba(251, 191, 36, 0.03)",
        }}
      >
        {/* franja superior amber */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, transparent, #fbbf24, transparent)" }} />

        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <ShieldCheck className="h-5 w-5 text-amber-400" style={{ filter: "drop-shadow(0 0 6px rgba(251,191,36,0.6))" }} />
            <h2 className="text-display-sm text-white">Cambiá tu PIN</h2>
          </div>
          <p className="text-sm text-stone-400 mb-5">
            Por seguridad, antes de seguir tenés que reemplazar el PIN temporal por uno propio.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs text-stone-400 mb-1 block">PIN actual</label>
              <Input
                type="password" inputMode="numeric" autoComplete="current-password"
                placeholder="El que usaste para entrar"
                value={actual} onChange={(e) => setActual(e.target.value.replace(/\D/g, ""))}
                maxLength={8} autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 mb-1 block">PIN nuevo (4 a 8 dígitos)</label>
              <Input
                type="password" inputMode="numeric" autoComplete="new-password"
                placeholder="Elegí uno que recuerdes"
                value={nuevo} onChange={(e) => setNuevo(e.target.value.replace(/\D/g, ""))}
                maxLength={8}
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 mb-1 block">Repetir PIN nuevo</label>
              <Input
                type="password" inputMode="numeric" autoComplete="new-password"
                placeholder="Confirmá el PIN nuevo"
                value={repetir} onChange={(e) => setRepetir(e.target.value.replace(/\D/g, ""))}
                maxLength={8}
              />
            </div>

            <button
              type="submit" disabled={guardando}
              className="w-full mt-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Guardar nuevo PIN
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

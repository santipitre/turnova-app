"use client";

import { useState } from "react";
import { Loader2, ChevronDown, CheckCircle2, XCircle, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  model: string;
  connected: boolean;
}

export function IntegracionClaude({ model, connected }: Props) {
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<
    { ok: boolean; latencia_ms?: number; error?: string } | null
  >(null);

  async function probar() {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch("/api/integraciones/claude?test=1");
      const json = await res.json();
      setResult(json.test ?? { ok: false, error: "Respuesta inválida" });
      if (json.test?.ok) {
        toast.success(`Conexión OK · ${json.test.latencia_ms} ms`);
      } else {
        toast.error("La prueba falló", { description: json.test?.error });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de red";
      setResult({ ok: false, error: msg });
      toast.error("La prueba falló", { description: msg });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Anthropic Claude API</div>
          <div className="text-caption text-stone-400 mt-0.5">
            Motor IA de extracción de pedidos médicos
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? "success" : "danger"}>
            {connected ? "Conectado" : "Sin clave"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            Configurar
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-3 rounded-md border border-stone-800 bg-stone-900/50 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-stone-400">Modelo</div>
              <div className="font-mono text-stone-100 mt-0.5">{model}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-stone-400">Estado</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-stone-100">
                {connected ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Clave configurada
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-400" /> Sin clave
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded border border-stone-800 bg-stone-950/40 px-3 py-2 text-xs text-stone-400">
            <KeyRound className="h-3.5 w-3.5 mt-0.5 shrink-0 text-stone-500" />
            <span>
              La clave se administra de forma segura por variable de entorno{" "}
              <code className="font-mono text-stone-300">ANTHROPIC_API_KEY</code> en el
              servidor. No se muestra ni se edita desde acá por seguridad.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={probar} disabled={testing}>
              {testing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Probando…
                </>
              ) : (
                "Probar conexión"
              )}
            </Button>
            {result && (
              <span
                className={`flex items-center gap-1.5 text-xs ${
                  result.ok ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {result.ok ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Funciona {result.latencia_ms ? `· ${result.latencia_ms} ms` : ""}
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" />
                    {result.error ?? "Falló"}
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

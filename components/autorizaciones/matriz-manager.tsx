"use client";

import { useMemo, useState } from "react";
import { Search, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";

export const GRUPOS_DEFAULT = [
  "PET",
  "Medicina Nuclear / SPECT",
  "Resonancia Magnética",
  "Tomografía",
  "Mamografía",
  "Densitometría",
  "Ecografía / Doppler",
  "Radiología",
  "Cardiología",
  "Consultas / Otros",
];

export interface ObraSocialLite {
  id: string;
  nombre: string;
  codigo: string | null;
  activa: boolean | null;
}

export interface CeldaMatriz {
  obra_social_id: string;
  grupo: string;
  requiere_autorizacion: string;
  estado_dato?: string | null;
}

interface Props {
  tenantId: string | null;
  obras: ObraSocialLite[];
  grupos: string[];
  celdas: CeldaMatriz[];
}

const OPCIONES: { value: string; label: string }[] = [
  { value: "SI_AUDITORIA", label: "SÍ · auditoría" },
  { value: "SI", label: "SÍ" },
  { value: "SIMPLE", label: "Simple" },
  { value: "NO", label: "NO" },
  { value: "A_CONFIRMAR", label: "A confirmar" },
  { value: "NO_DIRECTO", label: "NO · directo" },
];

function colorFor(v: string): string {
  if (v === "SI_AUDITORIA" || v === "SI") return "bg-red-500/15 text-red-300 border-red-500/30";
  if (v === "SIMPLE") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (v === "NO" || v === "NO_DIRECTO") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  return "bg-orange-500/15 text-orange-300 border-orange-500/30"; // A_CONFIRMAR
}

function keyOf(obraId: string, grupo: string) {
  return `${obraId}__${grupo}`;
}

export function MatrizAutorizacionesManager({ tenantId, obras, grupos, celdas }: Props) {
  // Mapa celda → valor
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const c of celdas) m[keyOf(c.obra_social_id, c.grupo)] = c.requiere_autorizacion;
    return m;
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);

  const valorDe = (obraId: string, grupo: string) =>
    valores[keyOf(obraId, grupo)] ?? "A_CONFIRMAR";

  const obrasFiltradas = useMemo(() => {
    const q = query.toLowerCase().trim();
    return obras.filter((o) => {
      if (q && !(o.nombre.toLowerCase().includes(q) || (o.codigo ?? "").toLowerCase().includes(q)))
        return false;
      if (soloPendientes && !grupos.some((g) => valorDe(o.id, g) === "A_CONFIRMAR")) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obras, grupos, query, soloPendientes, valores]);

  async function onChangeCelda(obraId: string, grupo: string, value: string) {
    if (!tenantId) {
      toast.error("No se pudo determinar el centro (tenant).");
      return;
    }
    const k = keyOf(obraId, grupo);
    const prev = valores[k];
    setValores((s) => ({ ...s, [k]: value })); // optimista
    setSavingKey(k);
    const supabase = createClient();
    const { error } = await supabase
      .from("matriz_autorizaciones")
      .upsert(
        {
          tenant_id: tenantId,
          obra_social_id: obraId,
          grupo,
          requiere_autorizacion: value,
          estado_dato: "VERIFICADO",
        },
        { onConflict: "tenant_id,obra_social_id,grupo" },
      );
    setSavingKey(null);
    if (error) {
      setValores((s) => ({ ...s, [k]: prev })); // revertir
      toast.error(`No se pudo guardar: ${error.message}`);
    } else {
      toast.success("Regla actualizada");
    }
  }

  const totalPend = useMemo(
    () =>
      obras.reduce(
        (acc, o) => acc + grupos.filter((g) => valorDe(o.id, g) === "A_CONFIRMAR").length,
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obras, grupos, valores],
  );

  return (
    <div className="space-y-4">
      {/* Barra */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
          <Input
            placeholder="Buscar obra social o código..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer">
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(e) => setSoloPendientes(e.target.checked)}
            className="accent-amber-400"
          />
          Solo pendientes de revisar
        </label>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <ShieldCheck className="h-4 w-4 text-amber-400" />
          {obrasFiltradas.length} obras · {totalPend} celdas a confirmar
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-2 text-[11px]">
        {OPCIONES.map((o) => (
          <span key={o.value} className={`px-2 py-0.5 rounded border ${colorFor(o.value)}`}>
            {o.label}
          </span>
        ))}
      </div>

      {/* Grilla */}
      <div className="overflow-auto rounded-xl border border-stone-800 max-h-[68vh]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-stone-900 text-left text-stone-300 px-3 py-2 text-xs uppercase tracking-wide min-w-[220px]">
                Obra social
              </th>
              {grupos.map((g) => (
                <th
                  key={g}
                  className="sticky top-0 z-20 bg-stone-900 text-stone-300 px-2 py-2 text-[11px] font-semibold min-w-[120px] text-center"
                >
                  {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {obrasFiltradas.map((o) => (
              <tr key={o.id} className="even:bg-stone-900/40">
                <td className="sticky left-0 z-10 bg-stone-950 px-3 py-1.5 align-top">
                  <div className="font-medium text-stone-200 leading-tight">{o.nombre}</div>
                  <div className="text-[10px] text-stone-500">
                    ID {o.codigo ?? "—"}
                    {o.activa === false && <span className="text-red-400"> · en baja</span>}
                  </div>
                </td>
                {grupos.map((g) => {
                  const k = keyOf(o.id, g);
                  const val = valorDe(o.id, g);
                  return (
                    <td key={g} className="px-1.5 py-1.5 text-center">
                      <div className="relative">
                        <select
                          value={val}
                          onChange={(e) => onChangeCelda(o.id, g, e.target.value)}
                          disabled={savingKey === k}
                          className={`w-full rounded border px-1.5 py-1 text-[11px] outline-none cursor-pointer ${colorFor(val)} ${
                            savingKey === k ? "opacity-50" : ""
                          }`}
                        >
                          {OPCIONES.map((op) => (
                            <option key={op.value} value={op.value} className="bg-stone-900 text-stone-100">
                              {op.label}
                            </option>
                          ))}
                        </select>
                        {savingKey === k && (
                          <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-stone-400" />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {obrasFiltradas.length === 0 && (
              <tr>
                <td colSpan={grupos.length + 1} className="text-center text-stone-500 py-8">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

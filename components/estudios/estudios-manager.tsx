"use client";

import { useMemo, useState } from "react";
import { Search, Loader2, FlaskConical } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";

const GRUPOS = [
  "PET",
  "Medicina Nuclear / SPECT",
  "Resonancia Magnética",
  "Tomografía",
  "Mamografía",
  "Densitometría",
  "Ecografía / Doppler",
  "Radiología",
  "Cardiología",
  "Radioterapia",
  "Consultas / Otros",
];

export interface PracticaLite {
  id: string;
  nombre: string;
  servicio: string | null;
  codigo_nomenclador: string | null;
  grupo: string | null;
}

interface Props {
  tenantId: string | null;
  practicas: PracticaLite[];
}

function colorFor(g: string | null): string {
  switch (g) {
    case "PET": return "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30";
    case "Medicina Nuclear / SPECT": return "bg-red-500/15 text-red-300 border-red-500/30";
    case "Resonancia Magnética": return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "Tomografía": return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
    case "Mamografía": return "bg-pink-500/15 text-pink-300 border-pink-500/30";
    case "Densitometría": return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "Ecografía / Doppler": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "Radiología": return "bg-teal-500/15 text-teal-300 border-teal-500/30";
    case "Cardiología": return "bg-orange-500/15 text-orange-300 border-orange-500/30";
    case "Radioterapia": return "bg-violet-500/15 text-violet-300 border-violet-500/30";
    default: return "bg-stone-500/15 text-stone-300 border-stone-500/40";
  }
}

export function EstudiosManager({ tenantId, practicas }: Props) {
  const [grupos, setGrupos] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const p of practicas) m[p.id] = p.grupo ?? "Consultas / Otros";
    return m;
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [soloGeneral, setSoloGeneral] = useState(false);

  const filtradas = useMemo(() => {
    const q = query.toLowerCase().trim();
    return practicas.filter((p) => {
      if (q && !(
        (p.nombre || "").toLowerCase().includes(q) ||
        (p.servicio || "").toLowerCase().includes(q) ||
        (p.codigo_nomenclador || "").toLowerCase().includes(q) ||
        (grupos[p.id] || "").toLowerCase().includes(q)
      )) return false;
      if (soloGeneral && grupos[p.id] !== "Consultas / Otros") return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practicas, query, soloGeneral, grupos]);

  async function onChange(id: string, value: string) {
    if (!tenantId) { toast.error("No se pudo determinar el centro (tenant)."); return; }
    const prev = grupos[id];
    setGrupos((s) => ({ ...s, [id]: value }));
    setSavingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("practicas").update({ grupo: value }).eq("id", id);
    setSavingId(null);
    if (error) {
      setGrupos((s) => ({ ...s, [id]: prev }));
      toast.error(`No se pudo guardar: ${error.message}`);
    } else {
      toast.success("Grupo actualizado");
    }
  }

  const totalGeneral = useMemo(
    () => practicas.filter((p) => (grupos[p.id] ?? "Consultas / Otros") === "Consultas / Otros").length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [practicas, grupos],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
          <Input
            placeholder="Buscar estudio, servicio o codigo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer">
          <input
            type="checkbox"
            checked={soloGeneral}
            onChange={(e) => setSoloGeneral(e.target.checked)}
            className="accent-amber-400"
          />
          Solo &quot;Consultas / Otros&quot; (a revisar)
        </label>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <FlaskConical className="h-4 w-4 text-amber-400" />
          {filtradas.length} estudios &middot; {totalGeneral} sin clasificar
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-stone-800 max-h-[68vh]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 z-20 bg-stone-900 text-left text-stone-300 px-3 py-2 text-xs uppercase tracking-wide">Servicio</th>
              <th className="sticky top-0 z-20 bg-stone-900 text-left text-stone-300 px-3 py-2 text-xs uppercase tracking-wide">Practica</th>
              <th className="sticky top-0 z-20 bg-stone-900 text-left text-stone-300 px-3 py-2 text-xs uppercase tracking-wide">Codigo</th>
              <th className="sticky top-0 z-20 bg-stone-900 text-left text-stone-300 px-3 py-2 text-xs uppercase tracking-wide min-w-[200px]">Grupo</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((p) => (
              <tr key={p.id} className="even:bg-stone-900/40">
                <td className="px-3 py-1.5 text-stone-400 whitespace-nowrap">{p.servicio || "-"}</td>
                <td className="px-3 py-1.5 text-stone-200">{p.nombre}</td>
                <td className="px-3 py-1.5 text-stone-500 whitespace-nowrap">{p.codigo_nomenclador || "-"}</td>
                <td className="px-3 py-1.5">
                  <div className="relative">
                    <select
                      value={grupos[p.id] ?? "Consultas / Otros"}
                      onChange={(e) => onChange(p.id, e.target.value)}
                      disabled={savingId === p.id}
                      className={`w-full rounded border px-2 py-1 text-xs outline-none cursor-pointer ${colorFor(grupos[p.id])} ${savingId === p.id ? "opacity-50" : ""}`}
                    >
                      {GRUPOS.map((g) => (
                        <option key={g} value={g} className="bg-stone-900 text-stone-100">{g}</option>
                      ))}
                    </select>
                    {savingId === p.id && (
                      <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-stone-400" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr><td colSpan={4} className="text-center text-stone-500 py-8">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

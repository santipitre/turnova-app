"use client";

import { useMemo, useState } from "react";
import { Search, Loader2, ShieldCheck, ListTree } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  "Radioterapia",
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
export interface PracticaMini {
  id: string;
  nombre: string;
  grupo: string | null;
  codigo_nomenclador: string | null;
}
export interface OverridePractica {
  obra_social_id: string;
  practica_id: string;
  requiere_autorizacion: string;
}

interface Props {
  tenantId: string | null;
  obras: ObraSocialLite[];
  grupos: string[];
  celdas: CeldaMatriz[];
  practicas: PracticaMini[];
  overrides: OverridePractica[];
}

const OPCIONES = [
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
  return "bg-orange-500/15 text-orange-300 border-orange-500/30";
}
const k = (a: string, b: string) => `${a}__${b}`;

export function MatrizAutorizacionesManager({
  tenantId, obras, grupos, celdas, practicas, overrides,
}: Props) {
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const c of celdas) m[k(c.obra_social_id, c.grupo)] = c.requiere_autorizacion;
    return m;
  });
  const [overMap, setOverMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const o of overrides) m[k(o.obra_social_id, o.practica_id)] = o.requiere_autorizacion;
    return m;
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [dlg, setDlg] = useState<{ obraId: string; obraNombre: string; grupo: string } | null>(null);
  const [dlgQuery, setDlgQuery] = useState("");

  const practicasByGrupo = useMemo(() => {
    const m: Record<string, PracticaMini[]> = {};
    for (const p of practicas) {
      const g = p.grupo || "Consultas / Otros";
      (m[g] = m[g] || []).push(p);
    }
    return m;
  }, [practicas]);

  // practica_id -> grupo (para contar overrides por celda)
  const grupoDePractica = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of practicas) m[p.id] = p.grupo || "Consultas / Otros";
    return m;
  }, [practicas]);

  const valorDe = (obraId: string, grupo: string) => valores[k(obraId, grupo)] ?? "A_CONFIRMAR";

  function overrideCount(obraId: string, grupo: string): number {
    let n = 0;
    for (const key in overMap) {
      const [oid, pid] = key.split("__");
      if (oid === obraId && grupoDePractica[pid] === grupo) n++;
    }
    return n;
  }

  const obrasFiltradas = useMemo(() => {
    const q = query.toLowerCase().trim();
    return obras.filter((o) => {
      if (q && !(o.nombre.toLowerCase().includes(q) || (o.codigo ?? "").toLowerCase().includes(q))) return false;
      if (soloPendientes && !grupos.some((g) => valorDe(o.id, g) === "A_CONFIRMAR")) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obras, grupos, query, soloPendientes, valores]);

  async function onChangeCelda(obraId: string, grupo: string, value: string) {
    if (!tenantId) { toast.error("No se pudo determinar el centro."); return; }
    const key = k(obraId, grupo);
    const prev = valores[key];
    setValores((s) => ({ ...s, [key]: value }));
    setSavingKey(key);
    const supabase = createClient();
    const { error } = await supabase.from("matriz_autorizaciones").upsert(
      { tenant_id: tenantId, obra_social_id: obraId, grupo, requiere_autorizacion: value, estado_dato: "VERIFICADO" },
      { onConflict: "tenant_id,obra_social_id,grupo" },
    );
    setSavingKey(null);
    if (error) { setValores((s) => ({ ...s, [key]: prev })); toast.error(`No se pudo guardar: ${error.message}`); }
    else toast.success("Regla del grupo actualizada");
  }

  async function onChangeOverride(obraId: string, practicaId: string, value: string) {
    if (!tenantId) { toast.error("No se pudo determinar el centro."); return; }
    const key = k(obraId, practicaId);
    const prev = overMap[key];
    const supabase = createClient();
    if (value === "") {
      // "(hereda del grupo)" → borrar excepción
      setOverMap((s) => { const c = { ...s }; delete c[key]; return c; });
      const { error } = await supabase.from("autorizaciones_practica").delete()
        .eq("tenant_id", tenantId).eq("obra_social_id", obraId).eq("practica_id", practicaId);
      if (error) { setOverMap((s) => ({ ...s, [key]: prev })); toast.error(`No se pudo borrar: ${error.message}`); }
      else toast.success("Vuelve a heredar del grupo");
      return;
    }
    setOverMap((s) => ({ ...s, [key]: value }));
    const { error } = await supabase.from("autorizaciones_practica").upsert(
      { tenant_id: tenantId, obra_social_id: obraId, practica_id: practicaId, requiere_autorizacion: value, estado_dato: "VERIFICADO" },
      { onConflict: "tenant_id,obra_social_id,practica_id" },
    );
    if (error) { setOverMap((s) => prev ? { ...s, [key]: prev } : (() => { const c = { ...s }; delete c[key]; return c; })()); toast.error(`No se pudo guardar: ${error.message}`); }
    else toast.success("Excepción del estudio guardada");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
          <Input placeholder="Buscar obra social o código..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer">
          <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} className="accent-amber-400" />
          Solo pendientes de revisar
        </label>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <ShieldCheck className="h-4 w-4 text-amber-400" />
          {obrasFiltradas.length} obras · el punto ámbar = tiene excepciones por estudio
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        {OPCIONES.map((o) => (
          <span key={o.value} className={`px-2 py-0.5 rounded border ${colorFor(o.value)}`}>{o.label}</span>
        ))}
      </div>

      <div className="overflow-auto rounded-xl border border-stone-800 max-h-[68vh]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-stone-900 text-left text-stone-300 px-3 py-2 text-xs uppercase tracking-wide min-w-[220px]">Obra social</th>
              {grupos.map((g) => (
                <th key={g} className="sticky top-0 z-20 bg-stone-900 text-stone-300 px-2 py-2 text-[11px] font-semibold min-w-[130px] text-center">{g}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {obrasFiltradas.map((o) => (
              <tr key={o.id} className="even:bg-stone-900/40">
                <td className="sticky left-0 z-10 bg-stone-950 px-3 py-1.5">
                  <div className="font-medium text-stone-200 leading-tight">{o.nombre}</div>
                  <div className="text-[10px] text-stone-500">ID {o.codigo ?? "—"}{o.activa === false && <span className="text-red-400"> · en baja</span>}</div>
                </td>
                {grupos.map((g) => {
                  const val = valorDe(o.id, g);
                  const nOv = overrideCount(o.id, g);
                  const nEst = (practicasByGrupo[g] || []).length;
                  return (
                    <td key={g} className={`px-1.5 py-1.5 text-center ${colorFor(val)}`}>
                      <div className="flex items-center gap-1">
                        <select
                          value={val}
                          onChange={(e) => onChangeCelda(o.id, g, e.target.value)}
                          disabled={savingKey === k(o.id, g)}
                          className={`flex-1 rounded border px-1 py-1 text-[11px] outline-none cursor-pointer bg-transparent ${colorFor(val)}`}
                        >
                          {OPCIONES.map((op) => (
                            <option key={op.value} value={op.value} className="bg-stone-900 text-stone-100">{op.label}</option>
                          ))}
                        </select>
                        {nEst > 0 && (
                          <button
                            title={`Ver ${nEst} estudios de ${g}${nOv ? ` · ${nOv} excepción(es)` : ""}`}
                            onClick={() => setDlg({ obraId: o.id, obraNombre: o.nombre, grupo: g })}
                            className="relative shrink-0 rounded p-0.5 text-stone-400 hover:text-amber-300"
                          >
                            <ListTree className="h-3.5 w-3.5" />
                            {nOv > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400" />}
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {obrasFiltradas.length === 0 && (
              <tr><td colSpan={grupos.length + 1} className="text-center text-stone-500 py-8">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Expandir grupo -> excepciones por estudio */}
      <Dialog open={!!dlg} onOpenChange={(o) => { if (!o) { setDlg(null); setDlgQuery(""); } }}>
        <DialogContent className="max-w-3xl w-[92vw] max-h-[82vh] overflow-hidden bg-stone-950 border border-stone-800 text-stone-200 p-0 flex flex-col">
          {dlg && (() => {
            const reglaGrupo = valorDe(dlg.obraId, dlg.grupo);
            const reglaGrupoLabel = OPCIONES.find((x) => x.value === reglaGrupo)?.label ?? reglaGrupo;
            const all = practicasByGrupo[dlg.grupo] || [];
            const q = dlgQuery.toLowerCase().trim();
            const lista = q
              ? all.filter((p) => p.nombre.toLowerCase().includes(q) || (p.codigo_nomenclador ?? "").toLowerCase().includes(q))
              : all;
            const nOv = overrideCount(dlg.obraId, dlg.grupo);
            return (
              <>
                <div className="px-5 pt-5 pb-3 border-b border-stone-800">
                  <DialogHeader>
                    <DialogTitle className="text-stone-100">{dlg.grupo}</DialogTitle>
                    <DialogDescription className="text-stone-400">
                      {dlg.obraNombre} — regla del grupo:{" "}
                      <span className={`inline-block align-middle px-2 py-0.5 rounded border text-[11px] ${colorFor(reglaGrupo)}`}>{reglaGrupoLabel}</span>
                      {nOv > 0 && <span className="ml-2 text-amber-300">· {nOv} excepción(es)</span>}
                      <span className="block mt-1 text-[11px] text-stone-500">Cada estudio hereda la regla del grupo; cambiá solo los que sean excepción.</span>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                    <input
                      value={dlgQuery}
                      onChange={(e) => setDlgQuery(e.target.value)}
                      placeholder="Buscar estudio..."
                      className="w-full rounded-lg bg-stone-900 border border-stone-700 text-stone-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto overflow-x-hidden px-5 py-1">
                  {lista.map((p) => {
                    const ov = overMap[k(dlg.obraId, p.id)] ?? "";
                    return (
                      <div key={p.id} className="flex items-center gap-3 border-b border-stone-800/70 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-stone-200 truncate" title={p.nombre}>{p.nombre}</div>
                          {p.codigo_nomenclador && <div className="text-[10px] text-stone-500">{p.codigo_nomenclador}</div>}
                        </div>
                        <select
                          value={ov}
                          onChange={(e) => onChangeOverride(dlg.obraId, p.id, e.target.value)}
                          className={`shrink-0 w-40 rounded border text-xs px-2 py-1.5 outline-none cursor-pointer ${ov ? colorFor(ov) : "bg-stone-900 border-stone-700 text-stone-300"}`}
                        >
                          <option value="" className="bg-stone-900 text-stone-300">Hereda ({reglaGrupoLabel})</option>
                          {OPCIONES.map((op) => (
                            <option key={op.value} value={op.value} className="bg-stone-900 text-stone-100">{op.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                  {lista.length === 0 && <div className="text-sm text-stone-500 py-6 text-center">Sin estudios.</div>}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

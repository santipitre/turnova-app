"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Save,
  X,
  Trash2,
  Loader2,
  Layers,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Servicio {
  id: string;
  nombre: string;
}

export interface ObraRef {
  id: string;
  nombre: string;
}

interface Props {
  servicios: Servicio[];
  obrasNoVip: ObraRef[];
  /** { [obraSocialId]: { [servicio]: cantidad_semanal } } */
  cuposMap: Record<string, Record<string, number>>;
  /** { [obraSocialId]: { [servicio]: usados_semana } } */
  usadosMap: Record<string, Record<string, number>>;
}

type Ocupacion = "ok" | "aviso" | "agotado";

/** Regla de negocio: <80% saludable · 80-99% reserva urgencias · 100% agotado/cortado. */
function ocupacionEstado(pct: number): Ocupacion {
  if (pct >= 100) return "agotado";
  if (pct >= 80) return "aviso";
  return "ok";
}

const BAR_CLASS: Record<Ocupacion, string> = {
  ok: "bg-lumen-pulse",
  aviso: "bg-pyralis-warning",
  agotado: "bg-pyralis-danger",
};
const TXT_CLASS: Record<Ocupacion, string> = {
  ok: "text-lumen-pulse",
  aviso: "text-pyralis-warning",
  agotado: "text-pyralis-danger",
};

export function CuposManager({
  servicios,
  obrasNoVip,
  cuposMap,
  usadosMap,
}: Props) {
  const router = useRouter();
  const nombreOS = useMemo(
    () => Object.fromEntries(obrasNoVip.map((o) => [o.id, o.nombre])),
    [obrasNoVip],
  );

  // Obras sociales ya configuradas (tienen al menos una fila de cupo)
  const configuredIds = useMemo(
    () =>
      Object.keys(cuposMap)
        .filter((id) => nombreOS[id])
        .sort((a, b) => nombreOS[a].localeCompare(nombreOS[b])),
    [cuposMap, nombreOS],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filas nuevas agregadas en el cliente (aún sin guardar)
  const [extraRows, setExtraRows] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickValue, setPickValue] = useState("");

  // Alta de servicio
  const [newServicio, setNewServicio] = useState("");
  const [addingServicio, setAddingServicio] = useState(false);

  const rowIds = useMemo(() => {
    const set = [...configuredIds, ...extraRows.filter((id) => !configuredIds.includes(id))];
    return set;
  }, [configuredIds, extraRows]);

  const disponiblesParaAgregar = obrasNoVip.filter(
    (o) => !rowIds.includes(o.id),
  );

  // Avisos de ocupación (≥80%) y cortes (100%) de la semana
  const alertas = useMemo(() => {
    const aviso: string[] = [];
    const agotado: string[] = [];
    rowIds.forEach((osId) => {
      const tot = cuposMap[osId] ?? {};
      const us = usadosMap[osId] ?? {};
      servicios.forEach((s) => {
        const total = tot[s.nombre] ?? 0;
        if (total === 0) return;
        const pct = ((us[s.nombre] ?? 0) / total) * 100;
        const etiqueta = `${nombreOS[osId]} · ${s.nombre}`;
        if (pct >= 100) agotado.push(etiqueta);
        else if (pct >= 80) aviso.push(etiqueta);
      });
    });
    return { aviso, agotado };
  }, [rowIds, cuposMap, usadosMap, servicios, nombreOS]);

  function startEdit(osId: string) {
    const current = cuposMap[osId] ?? {};
    const d: Record<string, number> = {};
    servicios.forEach((s) => {
      d[s.nombre] = current[s.nombre] ?? 0;
    });
    setDraft(d);
    setEditingId(osId);
  }

  function cancelEdit(osId: string) {
    setEditingId(null);
    setDraft({});
    setExtraRows((prev) => prev.filter((id) => id !== osId));
  }

  async function saveRow(osId: string) {
    setSavingId(osId);
    const supabase = createClient();
    const filas = servicios.map((s) => ({
      obra_social_id: osId,
      servicio: s.nombre,
      cantidad_semanal: Number(draft[s.nombre]) || 0,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("cupos_servicio")
      .upsert(filas, { onConflict: "obra_social_id,servicio" });
    setSavingId(null);
    if (error) {
      toast.error(`No se pudo guardar: ${error.message}`);
      return;
    }
    toast.success(`Cupos de ${nombreOS[osId]} guardados.`);
    setEditingId(null);
    setDraft({});
    setExtraRows((prev) => prev.filter((id) => id !== osId));
    router.refresh();
  }

  async function removeRow(osId: string) {
    if (extraRows.includes(osId) && !configuredIds.includes(osId)) {
      setExtraRows((prev) => prev.filter((id) => id !== osId));
      if (editingId === osId) cancelEdit(osId);
      return;
    }
    setSavingId(osId);
    const supabase = createClient();
    const { error } = await supabase
      .from("cupos_servicio")
      .delete()
      .eq("obra_social_id", osId);
    setSavingId(null);
    if (error) {
      toast.error(`No se pudo quitar: ${error.message}`);
      return;
    }
    toast.success(`${nombreOS[osId]} quitada de cupos.`);
    router.refresh();
  }

  function agregarObraSocial() {
    if (!pickValue) return;
    setExtraRows((prev) => [...prev, pickValue]);
    setPickerOpen(false);
    setPickValue("");
    startEdit(pickValue);
  }

  async function agregarServicio() {
    const nombre = newServicio.trim();
    if (!nombre) return;
    setAddingServicio(true);
    const supabase = createClient();
    const orden = servicios.length + 1;
    const { error } = await supabase
      .from("servicios")
      .insert({ nombre, orden });
    setAddingServicio(false);
    if (error) {
      toast.error(`No se pudo agregar el servicio: ${error.message}`);
      return;
    }
    toast.success(`Servicio "${nombre}" agregado.`);
    setNewServicio("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Matriz de ocupación</CardTitle>
            <div className="flex gap-4 mt-2 text-caption text-stone-400">
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-lumen-pulse" /> Saludable (&lt;80%)
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-pyralis-warning" /> Aviso · reserva urgencias (80-99%)
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-pyralis-danger" /> Agotado · prestación cortada (100%)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!pickerOpen ? (
              <Button
                variant="glow"
                size="sm"
                onClick={() => setPickerOpen(true)}
                disabled={disponiblesParaAgregar.length === 0}
              >
                <Plus className="h-4 w-4" />
                Agregar obra social
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={pickValue}
                  onChange={(e) => setPickValue(e.target.value)}
                  className="h-9 rounded border border-stone-800 bg-stone-900/60 text-stone-100 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-lumen-glow max-w-[220px]"
                >
                  <option value="">Elegir obra social…</option>
                  {disponiblesParaAgregar.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre}
                    </option>
                  ))}
                </select>
                <Button variant="glow" size="sm" onClick={agregarObraSocial} disabled={!pickValue}>
                  Agregar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPickerOpen(false);
                    setPickValue("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(alertas.agotado.length > 0 || alertas.aviso.length > 0) && (
          <div className="mb-4 space-y-2">
            {alertas.agotado.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-pyralis-danger/30 bg-pyralis-danger/10 px-3 py-2 text-sm text-pyralis-danger">
                <Ban className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Prestación cortada (100%)</strong> en {alertas.agotado.length}:{" "}
                  {alertas.agotado.join(", ")}. Se reanuda al abrir los cupos de la próxima semana.
                </span>
              </div>
            )}
            {alertas.aviso.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-pyralis-warning/30 bg-pyralis-warning/10 px-3 py-2 text-sm text-pyralis-warning">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Reserva de urgencias (≥80%)</strong> en {alertas.aviso.length}:{" "}
                  {alertas.aviso.join(", ")}. Los pedidos no urgentes pasan al próximo período.
                </span>
              </div>
            )}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-stone-800/60">
                <th className="text-left p-3 text-overline text-stone-400 uppercase sticky left-0 bg-stone-900/40 z-10">
                  Obra Social
                </th>
                {servicios.map((s) => (
                  <th
                    key={s.id}
                    className="text-left p-3 text-overline text-stone-400 uppercase whitespace-nowrap min-w-[120px]"
                  >
                    {s.nombre}
                  </th>
                ))}
                <th className="text-right p-3 text-overline text-stone-400 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {rowIds.map((osId) => {
                const editing = editingId === osId;
                const saving = savingId === osId;
                const totales = cuposMap[osId] ?? {};
                const usados = usadosMap[osId] ?? {};
                return (
                  <tr
                    key={osId}
                    className={`border-b border-stone-800/40 transition-colors ${
                      editing ? "bg-stone-800/40" : "hover:bg-stone-800/30"
                    }`}
                  >
                    <td className="p-3 font-semibold text-stone-100 sticky left-0 bg-stone-900/60 z-10">
                      {nombreOS[osId] ?? "—"}
                    </td>

                    {servicios.map((s) => {
                      if (editing) {
                        return (
                          <td key={s.id} className="p-2">
                            <Input
                              type="number"
                              min={0}
                              value={draft[s.nombre] ?? 0}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  [s.nombre]: Number(e.target.value),
                                }))
                              }
                              className="h-8 w-20 text-sm"
                            />
                          </td>
                        );
                      }
                      const total = totales[s.nombre] ?? 0;
                      const used = usados[s.nombre] ?? 0;
                      if (total === 0) {
                        return (
                          <td key={s.id} className="p-3 text-stone-600 text-xs">
                            —
                          </td>
                        );
                      }
                      const pct = Math.round((used / total) * 100);
                      const estado = ocupacionEstado(pct);
                      return (
                        <td key={s.id} className="p-3 min-w-[130px]">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-semibold text-stone-100">
                              {used}
                              <span className="text-stone-400">/{total}</span>
                            </span>
                            <span className={`text-xs font-bold ${TXT_CLASS[estado]}`}>
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-stone-800/60 rounded-full overflow-hidden mt-1.5">
                            <div
                              className={`h-full ${BAR_CLASS[estado]} transition-all`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          {estado === "agotado" ? (
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-pyralis-danger">
                              <Ban className="h-3 w-3" /> Cupo agotado · cortado
                            </div>
                          ) : estado === "aviso" ? (
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-pyralis-warning">
                              <AlertTriangle className="h-3 w-3" /> Reserva urgencias
                            </div>
                          ) : null}
                        </td>
                      );
                    })}

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editing ? (
                          <>
                            <Button
                              size="sm"
                              variant="glow"
                              onClick={() => saveRow(osId)}
                              disabled={saving}
                            >
                              {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelEdit(osId)}
                              disabled={saving}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(osId)}
                              disabled={saving}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <button
                              type="button"
                              onClick={() => removeRow(osId)}
                              disabled={saving}
                              aria-label="Quitar"
                              className="text-stone-500 hover:text-pyralis-danger transition-colors disabled:opacity-50 p-1.5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {rowIds.length === 0 && (
                <tr>
                  <td
                    colSpan={servicios.length + 2}
                    className="text-center p-8 text-stone-400"
                  >
                    Todavía no hay obras sociales con cupos. Usá “Agregar obra social”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Agregar servicio */}
        <div className="mt-6 pt-4 border-t border-stone-800/60 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-caption text-stone-400 uppercase tracking-wide">
            <Layers className="h-3.5 w-3.5" />
            Agregar servicio
          </span>
          <Input
            value={newServicio}
            onChange={(e) => setNewServicio(e.target.value)}
            placeholder="Ej: Mamografía"
            className="h-9 w-48 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") agregarServicio();
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={agregarServicio}
            disabled={addingServicio || !newServicio.trim()}
          >
            {addingServicio ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Agregar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Save,
  X,
  Shield,
  Star,
  Crown,
  ArrowDownToLine,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export interface ObraSocial {
  id: string;
  nombre: string;
  codigo: string | null;
  tiempo_maximo_horas: number;
  prioridad: number;
  es_vip: boolean;
}

interface Draft {
  nombre: string;
  codigo: string;
  tiempo_maximo_horas: number;
  prioridad: number;
}

interface Props {
  vips: ObraSocial[];
  noVips: ObraSocial[];
  conteoPacientes: Record<string, number>;
}

export function ObrasSocialesManager({ vips, noVips, conteoPacientes }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function startEdit(os: ObraSocial) {
    setEditingId(os.id);
    setDraft({
      nombre: os.nombre ?? "",
      codigo: os.codigo ?? "",
      tiempo_maximo_horas: os.tiempo_maximo_horas ?? 0,
      prioridad: os.prioridad ?? 0,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function persist(
    id: string,
    patch: Partial<ObraSocial>,
    successMsg: string,
  ): Promise<boolean> {
    setSavingId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("obras_sociales")
      .update(patch)
      .eq("id", id);
    setSavingId(null);
    if (error) {
      toast.error(`No se pudo guardar: ${error.message}`);
      return false;
    }
    toast.success(successMsg);
    setEditingId(null);
    setDraft(null);
    router.refresh();
    return true;
  }

  async function saveDraft(os: ObraSocial) {
    if (!draft) return;
    if (!draft.nombre.trim()) {
      toast.error("El nombre no puede quedar vacío.");
      return;
    }
    await persist(
      os.id,
      {
        nombre: draft.nombre.trim(),
        codigo: draft.codigo.trim() || null,
        tiempo_maximo_horas: Number(draft.tiempo_maximo_horas) || 0,
        prioridad: Number(draft.prioridad) || 0,
      },
      "Obra social actualizada.",
    );
  }

  async function promoverAVip(os: ObraSocial) {
    const nuevaPrioridad =
      os.prioridad >= 100 || os.prioridad <= 0 ? vips.length + 1 : os.prioridad;
    const nuevoSla = os.tiempo_maximo_horas > 0 ? os.tiempo_maximo_horas : 72;
    await persist(
      os.id,
      { es_vip: true, prioridad: nuevaPrioridad, tiempo_maximo_horas: nuevoSla },
      `${os.nombre} promovida a VIP.`,
    );
  }

  async function quitarVip(os: ObraSocial) {
    await persist(
      os.id,
      { es_vip: false, prioridad: 100 },
      `${os.nombre} pasó a cupos semanales.`,
    );
  }

  const isSaving = (id: string) => savingId === id;

  return (
    <>
      {/* VIP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-pyralis-glowHover fill-pyralis-glow" />
            Obras sociales VIP ({vips.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {vips.map((os) => {
              const editing = editingId === os.id;
              const saving = isSaving(os.id);
              return (
                <div
                  key={os.id}
                  className={`group relative overflow-hidden p-4 rounded-lg border transition-all ${
                    editing
                      ? "border-pyralis-glow/60 bg-stone-900/70 shadow-pyralis-glow"
                      : "border-pyralis-glow/25 bg-gradient-to-br from-pyralis-glow/[0.08] to-stone-900/40 hover:border-pyralis-glow/50 hover:shadow-pyralis-glow"
                  }`}
                >
                  <span className="absolute left-0 top-0 h-full w-1 bg-pyralis-glow/70" />

                  {editing && draft ? (
                    <div className="space-y-2 pl-1.5">
                      <Input
                        value={draft.nombre}
                        onChange={(e) => updateDraft("nombre", e.target.value)}
                        placeholder="Nombre"
                        className="h-8 text-sm font-semibold"
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase tracking-wide text-stone-400">
                            SLA (hs)
                          </label>
                          <Input
                            type="number"
                            min={0}
                            value={draft.tiempo_maximo_horas}
                            onChange={(e) =>
                              updateDraft("tiempo_maximo_horas", Number(e.target.value))
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="w-20">
                          <label className="text-[10px] uppercase tracking-wide text-stone-400">
                            Prioridad
                          </label>
                          <Input
                            type="number"
                            min={1}
                            value={draft.prioridad}
                            onChange={(e) =>
                              updateDraft("prioridad", Number(e.target.value))
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="glow"
                          onClick={() => saveDraft(os)}
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
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancelar
                        </Button>
                        <button
                          type="button"
                          onClick={() => quitarVip(os)}
                          disabled={saving}
                          className="ml-auto inline-flex items-center gap-1 text-xs text-stone-400 hover:text-lumen-flag transition-colors disabled:opacity-50"
                        >
                          <ArrowDownToLine className="h-3.5 w-3.5" />
                          Quitar VIP
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-2 mb-2 pl-1.5">
                        <h3 className="font-semibold text-stone-100 leading-snug">
                          {os.nombre}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(os)}
                            aria-label="Editar"
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-stone-400 hover:text-pyralis-glow transition-all"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <Badge variant="vip">P{os.prioridad}</Badge>
                        </div>
                      </div>
                      <p className="text-caption font-medium uppercase tracking-wide text-pyralis-glow/90 pl-1.5">
                        SLA {os.tiempo_maximo_horas}hs
                      </p>
                      <p className="text-caption text-stone-400 mt-1 pl-1.5">
                        {conteoPacientes[os.id] ?? 0} pacientes activos
                      </p>
                    </>
                  )}
                </div>
              );
            })}
            {vips.length === 0 && (
              <div className="col-span-full text-center text-stone-400 py-8">
                Ninguna obra social está marcada como VIP.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No-VIP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-stone-400" />
            Obras sociales con cupos semanales ({noVips.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Tiempo máximo</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Pacientes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {noVips.map((os) => {
                const editing = editingId === os.id;
                const saving = isSaving(os.id);

                if (editing && draft) {
                  const dias = Math.round((draft.tiempo_maximo_horas || 0) / 24);
                  return (
                    <TableRow key={os.id} className="bg-stone-800/40">
                      <TableCell>
                        <Input
                          value={draft.nombre}
                          onChange={(e) => updateDraft("nombre", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={draft.codigo}
                          onChange={(e) => updateDraft("codigo", e.target.value)}
                          className="h-8 w-24 text-sm font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            value={dias}
                            onChange={(e) =>
                              updateDraft(
                                "tiempo_maximo_horas",
                                Number(e.target.value) * 24,
                              )
                            }
                            className="h-8 w-16 text-sm"
                          />
                          <span className="text-xs text-stone-400">días</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={draft.prioridad}
                          onChange={(e) =>
                            updateDraft("prioridad", Number(e.target.value))
                          }
                          className="h-8 w-20 text-sm"
                        />
                      </TableCell>
                      <TableCell>{conteoPacientes[os.id] ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="glow"
                            onClick={() => saveDraft(os)}
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
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={os.id}>
                    <TableCell className="font-medium">{os.nombre}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {os.codigo ?? "—"}
                    </TableCell>
                    <TableCell>
                      {Math.round(os.tiempo_maximo_horas / 24)} días
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">P{os.prioridad}</Badge>
                    </TableCell>
                    <TableCell>{conteoPacientes[os.id] ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(os)}
                          disabled={saving}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => promoverAVip(os)}
                          disabled={saving}
                          className="text-pyralis-glow hover:text-pyralis-glowHover"
                        >
                          {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Crown className="h-3.5 w-3.5" />
                          )}
                          Promover a VIP
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {noVips.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-stone-400 py-8">
                    No hay obras sociales con cupos semanales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

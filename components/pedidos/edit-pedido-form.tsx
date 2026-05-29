"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Save,
  Stethoscope,
  Shield,
  User,
  IdCard,
  FileText,
  Calendar,
  AlertTriangle,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface InitialData {
  /** Array de prácticas. La primera es la principal. */
  practicas_array: string[];
  /** Cantidad de estudios por práctica, alineada por índice con practicas_array. */
  cantidades_array: number[];
  obra_social_detectada: string;
  medico_solicitante: string;
  matricula_medico: string;
  diagnostico_presunto: string;
  numero_afiliado: string;
  fecha_pedido: string;
  urgencia_indicada: boolean;
}

interface Props {
  pedidoId: string;
  initial: InitialData;
  obrasSociales: Array<{ id: string; nombre: string }>;
  practicas: Array<{ id: string; nombre: string; servicio: string | null }>;
}

export function EditPedidoForm({ pedidoId, initial, obrasSociales, practicas }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<InitialData>(initial);

  function update<K extends keyof InitialData>(key: K, value: InitialData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updatePractica(index: number, value: string) {
    setForm((prev) => {
      const next = [...prev.practicas_array];
      next[index] = value;
      return { ...prev, practicas_array: next };
    });
  }

  function updateCantidad(index: number, value: number) {
    setForm((prev) => {
      const next = [...prev.cantidades_array];
      next[index] = Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
      return { ...prev, cantidades_array: next };
    });
  }

  function addPractica() {
    setForm((prev) => ({
      ...prev,
      practicas_array: [...prev.practicas_array, ""],
      cantidades_array: [...prev.cantidades_array, 1],
    }));
  }

  function removePractica(index: number) {
    setForm((prev) => {
      const next = prev.practicas_array.filter((_, i) => i !== index);
      const nextCant = prev.cantidades_array.filter((_, i) => i !== index);
      // Siempre tener al menos un input visible (vacío)
      return {
        ...prev,
        practicas_array: next.length > 0 ? next : [""],
        cantidades_array: nextCant.length > 0 ? nextCant : [1],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Emparejar nombre + cantidad por índice, luego descartar vacíos
      const items = form.practicas_array
        .map((nombre, i) => ({
          nombre: nombre.trim(),
          cantidad: Math.max(1, Math.round(Number(form.cantidades_array[i]) || 1)),
        }))
        .filter((it) => it.nombre.length > 0);

      const payload = {
        ...form,
        // Campo legacy: primera práctica (para compat con código viejo)
        practica_detectada: items[0]?.nombre ?? "",
        // Array completo con cantidades
        practicas_array: items,
      };

      const res = await fetch(`/api/pedidos/${pedidoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `Error ${res.status}`);
      }
      toast.success("Datos actualizados", {
        description: "Los cambios reemplazan la extracción de la IA.",
      });
      router.push(`/pedidos/${pedidoId}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error("No se pudo guardar", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  // Agrupar prácticas por servicio para el <select>
  const practicasPorServicio = practicas.reduce<Record<string, typeof practicas>>(
    (acc, p) => {
      const s = p.servicio || "Otros";
      if (!acc[s]) acc[s] = [];
      acc[s].push(p);
      return acc;
    },
    {},
  );

  return (
    <form onSubmit={handleSubmit}>
      <Card className="rounded-lg border-stone-800 bg-stone-900/40">
        <CardHeader className="bg-stone-900/60 border-b border-stone-800">
          <CardTitle className="text-stone-100 text-base">Campos extraídos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {/* Prácticas solicitadas — múltiples (un pedido puede pedir varios estudios) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-stone-200">
              <Stethoscope className="h-3.5 w-3.5 text-amber-300" />
              Prácticas solicitadas
              <span className="text-xs text-stone-500 font-normal ml-1">
                ({form.practicas_array.length} {form.practicas_array.length === 1 ? "práctica" : "prácticas"} · {practicas.length} en catálogo)
              </span>
            </Label>

            <div className="space-y-2">
              {form.practicas_array.map((practica, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <span className="text-stone-500 text-sm font-medium select-none">x</span>
                    <Input
                      type="number"
                      min={1}
                      value={form.cantidades_array[idx] ?? 1}
                      onChange={(e) => updateCantidad(idx, Number(e.target.value))}
                      className="w-14 text-center font-semibold"
                      title="Cantidad de estudios"
                      aria-label="Cantidad de estudios"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <Input
                      list="practicas-list"
                      value={practica}
                      onChange={(e) => updatePractica(idx, e.target.value)}
                      placeholder={
                        idx === 0
                          ? "Práctica principal (ej: TAC tórax)…"
                          : "Práctica adicional…"
                      }
                      autoComplete="off"
                    />
                    {idx === 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-wider text-amber-300/80 font-semibold bg-stone-950/80 px-1.5 py-0.5 rounded pointer-events-none">
                        Principal
                      </span>
                    )}
                  </div>
                  {form.practicas_array.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePractica(idx)}
                      className="flex-shrink-0 h-9 w-9 p-0 text-stone-500 hover:text-red-400 hover:bg-red-400/10"
                      title="Quitar práctica"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addPractica}
              className="text-amber-300 hover:bg-amber-400/10 hover:text-amber-200 font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar otra práctica
            </Button>

            <datalist id="practicas-list">
              {Object.entries(practicasPorServicio).map(([servicio, items]) =>
                items.map((p) => (
                  <option key={p.id} value={p.nombre}>
                    {servicio}
                  </option>
                )),
              )}
            </datalist>
          </div>

          {/* Obra Social — idem */}
          <div className="space-y-1.5">
            <Label htmlFor="os" className="flex items-center gap-2 text-stone-200">
              <Shield className="h-3.5 w-3.5 text-amber-300" />
              Obra social
              <span className="text-xs text-stone-500 font-normal ml-1">
                ({obrasSociales.length} en catálogo)
              </span>
            </Label>
            <Input
              id="os"
              list="obras-sociales-list"
              value={form.obra_social_detectada}
              onChange={(e) => update("obra_social_detectada", e.target.value)}
              placeholder="Empezá a escribir o elegí del catálogo…"
              autoComplete="off"
            />
            <datalist id="obras-sociales-list">
              {obrasSociales.map((os) => (
                <option key={os.id} value={os.nombre} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="medico" className="flex items-center gap-2 text-stone-200">
                <User className="h-3.5 w-3.5 text-stone-400" />
                Médico solicitante
              </Label>
              <Input
                id="medico"
                value={form.medico_solicitante}
                onChange={(e) => update("medico_solicitante", e.target.value)}
                placeholder="Dr. Apellido"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="matricula" className="flex items-center gap-2 text-stone-200">
                <IdCard className="h-3.5 w-3.5 text-stone-400" />
                Matrícula
              </Label>
              <Input
                id="matricula"
                value={form.matricula_medico}
                onChange={(e) => update("matricula_medico", e.target.value)}
                placeholder="Mat: 12345"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dx" className="flex items-center gap-2 text-stone-200">
              <FileText className="h-3.5 w-3.5 text-stone-400" />
              Diagnóstico presunto
            </Label>
            <Input
              id="dx"
              value={form.diagnostico_presunto}
              onChange={(e) => update("diagnostico_presunto", e.target.value)}
              placeholder="Motivo clínico del estudio"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="afiliado" className="flex items-center gap-2 text-stone-200">
                <IdCard className="h-3.5 w-3.5 text-stone-400" />
                N° de afiliado
              </Label>
              <Input
                id="afiliado"
                value={form.numero_afiliado}
                onChange={(e) => update("numero_afiliado", e.target.value)}
                placeholder="000-00-0000-00-0"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fecha" className="flex items-center gap-2 text-stone-200">
                <Calendar className="h-3.5 w-3.5 text-stone-400" />
                Fecha del pedido
              </Label>
              <Input
                id="fecha"
                type="date"
                value={form.fecha_pedido}
                onChange={(e) => update("fecha_pedido", e.target.value)}
              />
            </div>
          </div>

          {/* Urgencia */}
          <label className="flex items-center gap-3 p-3 rounded-md border border-stone-700 bg-stone-900/60 cursor-pointer hover:border-amber-400/40 transition-colors">
            <input
              type="checkbox"
              checked={form.urgencia_indicada}
              onChange={(e) => update("urgencia_indicada", e.target.checked)}
              className="h-4 w-4 accent-amber-400"
            />
            <AlertTriangle
              className={`h-4 w-4 ${form.urgencia_indicada ? "text-red-400" : "text-stone-500"}`}
            />
            <span className={form.urgencia_indicada ? "text-red-300 text-sm font-medium" : "text-stone-300 text-sm"}>
              Marcado como urgente por el médico
            </span>
          </label>

          {/* Acciones */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-stone-800">
            <Button asChild variant="ghost" disabled={loading}>
              <Link href={`/pedidos/${pedidoId}`}>Cancelar</Link>
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-400 text-stone-950 hover:bg-amber-300 font-semibold shadow-lumen-glow"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

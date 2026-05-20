"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, X, Check, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

import { asignarTurno, confirmarTurno, cancelarTurno } from "@/lib/api/edge-functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFecha } from "@/lib/utils";
import type { AsignarTurnoResponse } from "@/lib/types/database";

interface Props {
  pedidoId: string;
  matchingOk: boolean;
}

export function PedidoDetailActions({ pedidoId, matchingOk }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [propuesta, setPropuesta] = useState<AsignarTurnoResponse | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number | null>(null);

  async function handleAsignar() {
    setLoading(true);
    try {
      const result = await asignarTurno({ pedido_medico_id: pedidoId });
      setPropuesta(result);

      // Countdown del hold
      const expiraEn = new Date(result.hold.hold_expira_en).getTime();
      const interval = setInterval(() => {
        const segundos = Math.max(0, Math.floor((expiraEn - Date.now()) / 1000));
        setHoldSecondsLeft(segundos);
        if (segundos === 0) {
          clearInterval(interval);
          setPropuesta(null);
          toast.warning("El hold expiró. Intentá asignar de nuevo.");
        }
      }, 1000);

      toast.success("Turno propuesto", {
        description: "Tenés 10 minutos para confirmar.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error("No se pudo asignar el turno", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmar() {
    if (!propuesta) return;
    setLoading(true);
    try {
      await confirmarTurno({
        turno_id: propuesta.hold.turno_id,
        canal_confirmacion: "admin",
      });
      toast.success("Turno confirmado", {
        description: "Le avisamos al paciente por WhatsApp.",
      });
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      toast.error("No se pudo confirmar", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleDescartar() {
    if (!propuesta) return;
    setLoading(true);
    try {
      await cancelarTurno({
        turno_id: propuesta.hold.turno_id,
        motivo: "Operador buscó otro horario",
      });
      setPropuesta(null);
      toast.info("Hold liberado. Podés buscar otro turno.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      toast.error("No se pudo cancelar", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  // ============ Estado: Matching falló — necesita revisión manual ============
  if (!matchingOk) {
    return (
      <Card className="rounded-lumen-lg border-lumen-ember/30 bg-gradient-to-br from-lumen-ember/5 to-transparent shadow-lumen-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lumen-ember text-lumen-display-sm">
            <AlertTriangle className="h-4 w-4" />
            Necesita revisión humana
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-700">
            La IA no pudo encontrar la obra social o práctica en tu base de datos. Revisá
            los datos extraídos antes de asignar.
          </p>
          <Button variant="secondary" size="sm">
            Editar datos manualmente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ============ Estado: Turno propuesto (hold activo) ============
  if (propuesta) {
    const p = propuesta.propuesta;
    return (
      <Card className="relative overflow-hidden rounded-lumen-lg border-lumen-glow/40 shadow-lumen-glow animate-fade-in-up">
        {/* Gradient background con glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-lumen-glow/8 via-transparent to-lumen-ember/5 pointer-events-none" />

        <CardHeader className="relative">
          <CardTitle className="flex items-center justify-between text-lumen-display-sm">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-lumen-glow" />
              Turno propuesto por IA
            </span>
            {holdSecondsLeft !== null && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-lumen-ember">
                <Clock className="h-3 w-3" />
                <span>
                  {Math.floor(holdSecondsLeft / 60)}:
                  {(holdSecondsLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="relative space-y-4">
          {/* Fecha grande tipo Vercel */}
          <div>
            <div className="font-display font-bold text-3xl text-stone-900 tracking-tight leading-tight">
              {formatFecha(p.fecha_hora, "EEEE d 'de' MMMM")}
            </div>
            <div className="flex items-center gap-2 mt-1 text-stone-600">
              <Clock className="h-4 w-4" />
              <span className="font-mono font-semibold">{formatFecha(p.fecha_hora, "HH:mm")} hs</span>
              <span className="text-stone-300">·</span>
              <span>{p.sede_nombre}</span>
            </div>
          </div>

          {/* Tags informativos */}
          <div className="flex flex-wrap gap-2">
            {p.fue_vip && <Badge variant="vip">⭐ VIP</Badge>}
            <Badge variant="default" className="font-mono">
              en {p.horas_hasta_turno}hs
            </Badge>
          </div>

          {/* Motivo */}
          <p className="text-sm text-stone-600 leading-relaxed">{p.motivo_asignacion}</p>

          {/* Acciones */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="glow"
              onClick={handleConfirmar}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirmar y notificar paciente
                </>
              )}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={handleAsignar}
                disabled={loading}
                size="sm"
              >
                Buscar otro horario
              </Button>
              <Button
                variant="ghost"
                onClick={handleDescartar}
                disabled={loading}
                size="sm"
              >
                <X className="h-3.5 w-3.5" />
                Descartar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============ Estado: Pedido listo para asignar ============
  return (
    <Card className="relative overflow-hidden rounded-lumen-lg border-stone-200 shadow-lumen-1">
      {/* Aurora glow ambiente */}
      <div
        className="absolute -top-20 -right-20 h-48 w-48 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #A78BFA 0%, transparent 70%)" }}
      />

      <CardContent className="relative pt-6 space-y-4">
        <div>
          <h3 className="text-lumen-display-sm mb-1">Asignar turno automáticamente</h3>
          <p className="text-sm text-stone-600">
            El motor de reglas va a encontrar el mejor cupo respetando obra social y SLA.
          </p>
        </div>

        <div className="space-y-2">
          <Button
            variant="glow"
            onClick={handleAsignar}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="lumen-text-aurora font-semibold">Procesando con motor IA…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Asignar turno automáticamente
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" className="w-full">
            Asignar manualmente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

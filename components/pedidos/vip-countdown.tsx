"use client";

import { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";

interface Props {
  /** Fecha de creación del pedido (ISO string) */
  creadoEn: string;
  /** Horas máximas para responder (default 12) */
  slaHoras?: number;
  /** Prioridad VIP (1=máxima) */
  prioridad?: number | null;
}

/**
 * Countdown del SLA de respuesta para pedidos VIP.
 * Visual:
 *  - Verde: > 50% del tiempo restante
 *  - Amber: 25-50%
 *  - Rojo + pulse: < 25% o vencido
 */
export function VipCountdown({ creadoEn, slaHoras = 12, prioridad }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Tick cada 30s — el SLA es de 12hs, no necesita precisión de segundos
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const creadoMs = new Date(creadoEn).getTime();
  const limiteMs = creadoMs + slaHoras * 60 * 60 * 1000;
  const restanteMs = limiteMs - now;
  const restanteHoras = restanteMs / (60 * 60 * 1000);
  const porcentaje = Math.max(0, Math.min(1, restanteMs / (slaHoras * 60 * 60 * 1000)));

  const vencido = restanteMs <= 0;
  const critico = !vencido && porcentaje < 0.25;
  const medio = !critico && porcentaje < 0.5;

  // Formato legible
  let texto: string;
  if (vencido) {
    const venciHace = Math.abs(restanteHoras);
    texto = venciHace >= 1
      ? `vencido hace ${Math.floor(venciHace)}h`
      : `vencido hace ${Math.floor(venciHace * 60)}m`;
  } else if (restanteHoras >= 1) {
    const h = Math.floor(restanteHoras);
    const m = Math.floor((restanteHoras - h) * 60);
    texto = m > 0 ? `${h}h ${m}m` : `${h}h`;
  } else {
    texto = `${Math.max(0, Math.floor(restanteHoras * 60))}m`;
  }

  const colorClasses = vencido
    ? "border-red-500/60 bg-red-500/15 text-red-300"
    : critico
      ? "border-red-400/50 bg-red-400/10 text-red-300 animate-pulse"
      : medio
        ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
        : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-mono font-semibold ${colorClasses}`}
      title={`SLA respuesta VIP: ${slaHoras}h${prioridad ? ` · prioridad ${prioridad}` : ""}`}
    >
      {vencido ? (
        <AlertCircle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      <span>{texto}</span>
    </div>
  );
}

/**
 * Badge ⭐ VIP con prioridad opcional.
 */
export function VipBadge({ prioridad }: { prioridad?: number | null }) {
  const isTop3 = prioridad && prioridad <= 3;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider ${
        isTop3
          ? "bg-gradient-to-r from-amber-300 to-amber-400 text-stone-950 shadow-[0_0_10px_rgba(251,191,36,0.45)]"
          : "bg-amber-400/15 text-amber-300 border border-amber-400/40"
      }`}
      title={prioridad ? `Prioridad VIP #${prioridad}` : "VIP"}
    >
      <span className="text-[11px] leading-none">⭐</span>
      VIP
      {prioridad && <span className="font-mono opacity-80">#{prioridad}</span>}
    </span>
  );
}

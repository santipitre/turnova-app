"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./animated-counter";

interface KpiCardProps {
  label: string;
  value: number;
  format?: "number" | "percent" | "currency" | "duration";
  change?: { value: string; trend: "up" | "down"; isPositive: boolean };
  /** Pasar como ReactNode renderizado (ej: <Calendar className="h-4 w-4" />)
   *  para evitar el error "Functions cannot be passed to Client Components". */
  icon: ReactNode;
  accent?: "glow" | "ember" | "aurora" | "tide" | "pulse";
  className?: string;
}

/**
 * Pyralis Lumen — KPI Card v2.
 *
 * Mejoras vs v1:
 * - Animated counter (cuenta de 0 al valor)
 * - Gradient soft top-right
 * - Hover lift sutil
 * - Mejor jerarquía visual
 * - Mono font para el número
 */
export function KpiCard({
  label,
  value,
  format = "number",
  change,
  icon,
  accent = "glow",
  className,
}: KpiCardProps) {
  const TrendIcon = change?.trend === "up" ? TrendingUp : TrendingDown;

  const accentBg = {
    glow: "bg-lumen-glow/10",
    ember: "bg-lumen-ember/10",
    aurora: "bg-lumen-aurora/10",
    tide: "bg-lumen-tide/10",
    pulse: "bg-lumen-pulse/10",
  }[accent];

  const accentText = {
    glow: "text-lumen-glow",
    ember: "text-lumen-ember",
    aurora: "text-lumen-aurora",
    tide: "text-lumen-tide",
    pulse: "text-lumen-pulse",
  }[accent];

  const accentGradient = {
    glow: "from-lumen-glow/8 via-transparent",
    ember: "from-lumen-ember/8 via-transparent",
    aurora: "from-lumen-aurora/10 via-transparent",
    tide: "from-lumen-tide/10 via-transparent",
    pulse: "from-lumen-pulse/8 via-transparent",
  }[accent];

  const trendColor = change?.isPositive ? "text-lumen-pulse" : "text-lumen-flag";

  // Formatters
  const formatProps = {
    number: {},
    percent: { suffix: "%", decimals: 1 },
    currency: { prefix: "$" },
    duration: { suffix: "s" },
  }[format];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lumen-lg border border-stone-800/60",
        "bg-stone-900/40 p-5 transition-all duration-fast ease-lumen-out",
        "hover:-translate-y-0.5 hover:shadow-lumen-3-dark hover:border-stone-700",
        "animate-fade-in-up",
        className,
      )}
    >
      {/* Gradient overlay decorativo */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br pointer-events-none",
          accentGradient,
          "to-transparent",
        )}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <span className="text-overline text-stone-400 uppercase">{label}</span>
          <div
            className={cn(
              "h-9 w-9 rounded-lumen-sm flex items-center justify-center",
              accentBg,
              accentText,
            )}
          >
            {icon}
          </div>
        </div>

        <div className="font-mono font-semibold tracking-tight text-3xl leading-tight text-stone-100">
          <AnimatedCounter value={value} {...formatProps} />
        </div>

        {change && (
          <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span>{change.value}</span>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ConfidenceBarProps {
  /** Valor entre 0 y 1 */
  value: number;
  /** Mostrar el porcentaje numérico al lado */
  showLabel?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Pyralis Lumen — Confidence Bar.
 * Visualización elegante de % de confianza IA.
 * Gradiente que va de flag (rojo) a pulse (verde) según el valor.
 */
export function ConfidenceBar({
  value,
  showLabel = true,
  className,
  size = "md",
}: ConfidenceBarProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const percentage = Math.max(0, Math.min(100, value * 100));

  useEffect(() => {
    const t = setTimeout(() => setAnimatedValue(percentage), 50);
    return () => clearTimeout(t);
  }, [percentage]);

  const fillColor =
    percentage < 60
      ? "lumen-confidence-low"
      : percentage < 85
        ? "lumen-confidence-medium"
        : "lumen-confidence-high";

  const labelColor =
    percentage < 60
      ? "text-lumen-flag"
      : percentage < 85
        ? "text-lumen-ember"
        : "text-lumen-pulse";

  const heightClass = size === "sm" ? "h-1" : size === "lg" ? "h-2.5" : "h-1.5";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("lumen-confidence-bar flex-1", heightClass)}>
        <div
          className={cn("lumen-confidence-fill", fillColor)}
          style={{ width: `${animatedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("font-mono text-sm font-semibold tabular-nums", labelColor)}>
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

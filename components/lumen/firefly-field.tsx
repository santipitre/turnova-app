"use client";

import { useMemo } from "react";

interface FireflyFieldProps {
  count?: number;
  className?: string;
}

/**
 * Enjambre de luciérnagas animadas para el hero de Turnova.
 * Cada luciérnaga es un punto con glow radial que deriva y parpadea.
 * 100% CSS — sin canvas, sin librerías.
 *
 * El ADN Pyralis: pequeños puntos de luz biológica en la oscuridad.
 */
export function FireflyField({ count = 35, className = "" }: FireflyFieldProps) {
  const fireflies = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: -Math.random() * 14,
        duration: 9 + Math.random() * 12,
        size: 2 + Math.random() * 3.5,
        // Drift offsets aleatorios para que cada luciérnaga tenga su patrón único
        driftX: (Math.random() - 0.5) * 80,
        driftY: -Math.random() * 60 - 20,
      })),
    [count],
  );

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {fireflies.map((f) => (
        <div
          key={f.id}
          className="firefly"
          style={
            {
              top: `${f.top}%`,
              left: `${f.left}%`,
              width: `${f.size}px`,
              height: `${f.size}px`,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`,
              "--drift-x": `${f.driftX}px`,
              "--drift-y": `${f.driftY}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

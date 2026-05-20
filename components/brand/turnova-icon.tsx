import { cn } from "@/lib/utils";

interface TurnovaIconProps {
  size?: number;
  className?: string;
}

/**
 * Turnova Icon — Sigue el sistema Pyralis (Dictom, Lumen, etc):
 * marco redondeado con borde blanco + letra T + punto amber bioluminiscente.
 *
 * Cada producto Pyralis tiene su letra inicial.
 * Cada producto tiene un punto amber (la luciérnaga Pyralis) posicionado
 * de forma única dentro del marco.
 */
export function TurnovaIcon({ size = 64, className }: TurnovaIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("flex-shrink-0", className)}
      role="img"
      aria-label="Turnova"
    >
      {/* Marco redondeado */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="14"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
      />

      {/* Letra T */}
      <text
        x="22"
        y="44"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="36"
        fontWeight="700"
        fill="white"
        letterSpacing="-0.02em"
      >
        T
      </text>

      {/* Punto amber Pyralis (la luciérnaga) — en la zona derecha de la T */}
      <circle cx="44" cy="38" r="7" fill="#FBBF24" opacity="0.12" />
      <circle cx="44" cy="38" r="4.5" fill="#FBBF24" opacity="0.45" />
      <circle cx="44" cy="38" r="2.6" fill="#FFF8E1" />
    </svg>
  );
}

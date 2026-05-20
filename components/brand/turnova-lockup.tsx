import { cn } from "@/lib/utils";
import { TurnovaIcon } from "./turnova-icon";

interface TurnovaLockupProps {
  /** Tamaño del icono. Default 40. */
  iconSize?: number;
  /** Mostrar el wordmark "Turnova". Default true. */
  showWordmark?: boolean;
  /** Mostrar el subtítulo "— BY — Pyralis". Default true. */
  showAttribution?: boolean;
  /** Tamaño del wordmark. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Lockup oficial de Turnova siguiendo el sistema Pyralis.
 * Estructura: [Icono] [Wordmark "Turnova"]
 *                     [— BY — Pyralis]
 *
 * Inspirado en cómo Dictom y Lumen se presentan en el ecosistema.
 */
export function TurnovaLockup({
  iconSize = 40,
  showWordmark = true,
  showAttribution = true,
  size = "md",
  className,
}: TurnovaLockupProps) {
  const wordmarkSize = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  }[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <TurnovaIcon size={iconSize} />
      {showWordmark && (
        <div className="flex flex-col gap-0.5">
          <span
            className={cn(
              "font-display font-bold tracking-tight text-white leading-none",
              wordmarkSize,
            )}
          >
            Turnova
          </span>
          {showAttribution && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500 font-medium leading-none">
              <span className="text-stone-600">—</span> by{" "}
              <span className="text-stone-600">—</span>{" "}
              <span className="text-stone-400">Pyralis</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

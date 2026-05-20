/**
 * Pyralis Lumen — Gradient Orbs.
 * Esferas de color difuminadas que flotan en el background.
 * Usar como decoración en hero sections oscuras.
 *
 * Performance: cada orbe es un div con CSS animation y filter:blur,
 * GPU-accelerado. No usa JS.
 */
import { cn } from "@/lib/utils";

interface GradientOrbsProps {
  variant?: "default" | "subtle" | "intense";
  className?: string;
}

export function GradientOrbs({ variant = "default", className }: GradientOrbsProps) {
  const sizeClasses = {
    subtle: "w-64 h-64 opacity-40",
    default: "w-96 h-96 opacity-60",
    intense: "w-[32rem] h-[32rem] opacity-80",
  };

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <div
        className={cn("lumen-orb lumen-orb-glow", sizeClasses[variant])}
        style={{ top: "10%", left: "10%" }}
      />
      <div
        className={cn("lumen-orb lumen-orb-ember", sizeClasses[variant])}
        style={{ top: "30%", right: "5%" }}
      />
      <div
        className={cn("lumen-orb lumen-orb-aurora", sizeClasses[variant])}
        style={{ bottom: "10%", left: "30%" }}
      />
    </div>
  );
}

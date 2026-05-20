import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "light" | "dark";
}

/**
 * Pyralis Lumen — Glass Card.
 * Card con efecto glassmorphism (backdrop-blur).
 * Usar sobre fondos con color/imagen para crear cards "flotantes" sofisticadas.
 */
export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "light", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lumen-lg p-6 transition-all duration-fast ease-lumen-out",
          variant === "light" ? "lumen-glass" : "lumen-glass-dark",
          className,
        )}
        {...props}
      />
    );
  },
);
GlassCard.displayName = "GlassCard";

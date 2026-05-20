import { cn } from "@/lib/utils";

interface StatusDotProps {
  variant: "pulse" | "ember" | "flag" | "aurora" | "muted";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
  label?: string;
}

/**
 * Pyralis Lumen — Status Dot.
 * Indicador circular sutil, opcionalmente con pulse animation.
 */
export function StatusDot({
  variant,
  size = "md",
  animated = true,
  className,
  label,
}: StatusDotProps) {
  const variantClasses = {
    pulse: "bg-lumen-pulse",
    ember: "bg-lumen-ember",
    flag: "bg-lumen-flag",
    aurora: "bg-lumen-aurora",
    muted: "bg-slate-400",
  };

  const sizeClasses = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  };

  const dot = (
    <span className="relative inline-flex">
      {animated && variant !== "muted" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75",
            variantClasses[variant],
          )}
          style={{ animation: "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full",
          sizeClasses[size],
          variantClasses[variant],
        )}
      />
    </span>
  );

  if (!label) return <span className={className}>{dot}</span>;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {dot}
      <span className="text-sm font-medium">{label}</span>
    </span>
  );
}

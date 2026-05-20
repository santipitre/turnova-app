import { cn } from "@/lib/utils";

interface PyralisLogoProps {
  variant?: "default" | "white" | "compact";
  className?: string;
  productName?: string;
}

/**
 * Logo Pyralis: la palabra "pyralis" seguida del punto glow.
 * Si se pasa productName, se muestra el producto + "powered by pyralis·"
 */
export function PyralisLogo({
  variant = "default",
  className,
  productName,
}: PyralisLogoProps) {
  const isWhite = variant === "white";

  if (productName) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div
          className={cn(
            "text-display-sm font-bold tracking-tight",
            isWhite ? "text-white" : "text-lumen-glow",
          )}
        >
          {productName}
        </div>
        <div
          className={cn(
            "text-overline lowercase",
            isWhite ? "text-stone-400" : "text-slate-500",
          )}
        >
          by pyralis<span className="text-lumen-glow">·</span>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("inline-flex items-center", className)}>
        <span
          className={cn(
            "text-2xl font-bold lowercase tracking-tight",
            isWhite ? "text-white" : "text-lumen-glow",
          )}
        >
          p
        </span>
        <span className="text-pyralis-glow text-2xl font-bold">·</span>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-baseline gap-0.5", className)}>
      <span
        className={cn(
          "text-2xl font-bold lowercase tracking-tight",
          isWhite ? "text-white" : "text-lumen-glow",
        )}
      >
        pyralis
      </span>
      <span className="text-pyralis-glow text-3xl leading-none">·</span>
    </div>
  );
}

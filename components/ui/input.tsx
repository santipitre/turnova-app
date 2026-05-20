import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded border border-stone-800 bg-stone-900/60 text-stone-100 px-3 py-2 text-sm",
          "placeholder:text-stone-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumen-glow focus-visible:border-lumen-glow focus-visible:ring-offset-1 focus-visible:ring-offset-stone-950",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

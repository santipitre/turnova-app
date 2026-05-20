import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-stone-800 text-stone-300",
        vip: "bg-gradient-to-r from-lumen-glow/30 to-lumen-glow/80 text-stone-950 shadow-lumen-1-dark",
        success: "bg-lumen-pulse/15 text-lumen-pulse border border-lumen-pulse/20",
        warning: "bg-lumen-glow/15 text-lumen-glow border border-lumen-glow/20",
        danger: "bg-lumen-flag/15 text-lumen-flag border border-lumen-flag/20",
        info: "bg-lumen-tag/15 text-lumen-tag border border-lumen-tag/20",
        outline: "border border-stone-700 text-stone-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

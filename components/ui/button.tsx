import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pyralis-glow focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-stone-100 text-stone-950 hover:bg-white shadow-lumen-1-dark",
        glow: "bg-lumen-glow text-stone-950 hover:bg-lumen-glowHover hover:shadow-lumen-glow shadow-lumen-1-dark font-semibold",
        secondary: "bg-stone-900 text-stone-100 border border-stone-800 hover:bg-stone-800 hover:border-stone-700 shadow-lumen-1-dark",
        ghost: "text-stone-300 hover:bg-white/5 hover:text-stone-100",
        destructive: "bg-lumen-flag text-white hover:bg-red-500 shadow-lumen-1-dark",
        link: "text-lumen-glow underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

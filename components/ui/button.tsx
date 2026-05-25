"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/src/lib/utils";

const buttonVariants = cva(
  "group inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plasma/70 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border border-plasma/40 bg-plasma text-void shadow-[0_0_28px_rgba(24,245,210,0.26)] hover:-translate-y-0.5 hover:bg-[#5effe8]",
        secondary:
          "border border-white/12 bg-white/[0.07] text-white backdrop-blur-xl hover:border-plasma/35 hover:bg-white/[0.12]",
        ghost: "text-slate-300 hover:bg-white/[0.08] hover:text-white",
        danger: "border border-alarm/40 bg-alarm/15 text-alarm hover:bg-alarm/25"
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-5 text-base"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  readonly asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

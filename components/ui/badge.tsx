import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-200",
        className
      )}
      {...props}
    />
  );
}

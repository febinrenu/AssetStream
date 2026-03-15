import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap leading-none",
  {
    variants: {
      variant: {
        default:     "bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/15",
        active:      "bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/15",
        leased:      "bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/15",
        available:   "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        paid:        "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        pending:     "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
        overdue:     "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
        defaulted:   "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
        destructive: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
        warning:     "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
        completed:   "bg-slate-50 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10",
        draft:       "bg-slate-50 text-slate-500 border border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10",
        maintenance: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
        remarketed:  "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
        issued:      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
        outline:     "bg-transparent text-[var(--text-primary)] border border-[var(--border)] dark:border-white/10",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

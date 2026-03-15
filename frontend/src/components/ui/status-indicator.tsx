"use client";

import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "online" | "warning" | "error" | "offline";
  label?: string;
  className?: string;
}

const STATUS_COLORS = {
  online: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  offline: "bg-slate-400",
};

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            STATUS_COLORS[status]
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            STATUS_COLORS[status]
          )}
        />
      </span>
      {label && <span className="text-[11px] font-medium text-[var(--text-muted)]">{label}</span>}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, X, XCircle, Info } from "lucide-react";
import { toastEmitter, type ToastItem } from "@/lib/toast";

const STYLES: Record<
  ToastItem["variant"],
  { icon: React.ReactNode; border: string }
> = {
  success: {
    icon: <CheckCircle2 size={15} className="text-emerald-500" />,
    border: "border-emerald-500/25",
  },
  error: {
    icon: <XCircle size={15} className="text-[var(--destructive)]" />,
    border: "border-[var(--destructive)]/25",
  },
  warning: {
    icon: <AlertTriangle size={15} className="text-amber-500" />,
    border: "border-amber-500/25",
  },
  info: {
    icon: <Info size={15} className="text-[var(--accent)]" />,
    border: "border-[var(--accent)]/25",
  },
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toastEmitter.subscribe(setToasts);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 right-5 z-[200] flex flex-col items-end gap-2.5">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = STYLES[t.variant];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 28, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`pointer-events-auto flex w-full max-w-[340px] items-start gap-3 rounded-2xl border bg-[var(--surface)] p-4 shadow-[0_8px_40px_rgba(0,0,0,0.18)] ${s.border}`}
            >
              <div className="mt-0.5 shrink-0">{s.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {t.title}
                </p>
                {t.description && (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => toastEmitter.remove(t.id)}
                className="mt-0.5 shrink-0 text-[var(--text-faint)] transition-colors hover:text-[var(--text-primary)]"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

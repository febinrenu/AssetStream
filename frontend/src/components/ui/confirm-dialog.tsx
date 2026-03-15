"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "default",
  loading,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl focus:outline-none">
          <div className="mb-5 flex items-start gap-3.5">
            {variant === "danger" && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--destructive-subtle)]">
                <AlertTriangle size={18} className="text-[var(--destructive)]" />
              </div>
            )}
            <div className="min-w-0">
              <Dialog.Title className="text-[15px] font-bold text-[var(--text-primary)]">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
                {description}
              </Dialog.Description>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant={variant === "danger" ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={loading}
              className="gap-1.5"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

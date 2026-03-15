"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, Plus, RefreshCw, Wallet, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePayments, useDunningRules, useReconciliations,
  useGenerateReconciliation, useCreateDunningRule, useUpdateDunningRule, useDeleteDunningRule,
} from "@/hooks/usePayments";
import { useIsAdmin } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_BADGE: Record<string, "draft" | "issued" | "paid" | "overdue"> = {
  completed: "paid",
  failed: "overdue",
  pending: "issued",
  processing: "draft",
  refunded: "draft",
};

const TABS = ["payments", "reconciliation", "dunning"] as const;
type Tab = typeof TABS[number];

type DunningForm = {
  name: string;
  days_overdue: string;
  action: "email" | "sms" | "suspend" | "flag";
  message_template: string;
};

function ReconDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ period_start: "", period_end: "" });
  const generate = useGenerateReconciliation();

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="fixed left-1/2 top-1/2 z-[81] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-[15px] font-bold text-[var(--text-primary)]">Generate Reconciliation</p>
          <button onClick={onClose}><X size={15} className="text-[var(--text-faint)] hover:text-[var(--text-primary)]" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Period Start</label>
            <Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
          </div>
          <div>
            <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Period End</label>
            <Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
          </div>
        </div>
        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={!form.period_start || !form.period_end || generate.isPending}
            onClick={() =>
              generate.mutate(form, {
                onSuccess: () => { toast.success("Report generated", "Reconciliation complete."); onClose(); },
                onError: () => toast.error("Failed", "Please try again."),
              })
            }
          >
            {generate.isPending ? "Generating…" : "Generate"}
          </Button>
        </div>
      </motion.div>
    </>
  );
}

export default function PaymentsPage() {
  const [tab, setTab] = useState<Tab>("payments");
  const [showRecon, setShowRecon] = useState(false);
  const [newDunning, setNewDunning] = useState<DunningForm>({ name: "", days_overdue: "", action: "email", message_template: "" });

  const { data: payments = [], isLoading: loadingPayments } = usePayments();
  const { data: dunningRules = [], isLoading: loadingDunning } = useDunningRules();
  const { data: recons = [], isLoading: loadingRecons } = useReconciliations();
  const createDunning = useCreateDunningRule();
  const updateDunning = useUpdateDunningRule();
  const deleteDunning = useDeleteDunningRule();
  const isAdmin = useIsAdmin();

  const totalReceived = payments.filter((p) => p.status === "completed").reduce((s, p) => s + parseFloat(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Total Received", value: formatCurrency(String(totalReceived)), color: "text-emerald-400" },
          { label: "Completed Payments", value: String(payments.filter((p) => p.status === "completed").length), color: "text-[var(--text-primary)]" },
          { label: "Failed Payments", value: String(payments.filter((p) => p.status === "failed").length), color: "text-red-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)] mb-1">{s.label}</p>
              <p className={`font-mono text-[26px] font-extrabold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-[var(--border)] pb-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-xl px-4 py-2.5 text-[12px] font-semibold capitalize transition-all ${
              tab === t
                ? "border border-b-[var(--surface)] border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] -mb-px"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Payments Tab */}
      {tab === "payments" && (
        <Card>
          <CardContent className="p-0">
            {loadingPayments ? (
              <div className="space-y-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border-b border-[var(--border)] px-6 py-4">
                    <Skeleton className="h-4 w-2/3 rounded mb-2" /><Skeleton className="h-3 w-1/3 rounded" />
                  </div>
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-muted)]"><Wallet size={28} className="text-[var(--text-faint)]" /></div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">No payment records</p>
                <p className="text-[12px] text-[var(--text-muted)]">Payments are recorded when invoices are paid via the Invoices page.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {["Ref", "Invoice", "Amount", "Method", "Status", "By", "Date"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)] transition-colors">
                        <td className="px-5 py-4 font-mono text-[11px] font-bold text-[var(--accent)]">{p.payment_ref}</td>
                        <td className="px-5 py-4 text-[12px] text-[var(--text-muted)]">{p.invoice_number}</td>
                        <td className="px-5 py-4 font-mono text-[13px] font-bold text-[var(--text-primary)]">{formatCurrency(p.amount)}</td>
                        <td className="px-5 py-4 text-[12px] capitalize text-[var(--text-muted)]">{p.payment_method.replace("_", " ")}</td>
                        <td className="px-5 py-4"><Badge variant={(STATUS_BADGE[p.status] ?? "draft") as never}>{p.status}</Badge></td>
                        <td className="px-5 py-4 text-[12px] text-[var(--text-muted)]">{p.initiated_by_username ?? "—"}</td>
                        <td className="px-5 py-4 text-[12px] text-[var(--text-muted)]">{formatDate(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reconciliation Tab */}
      {tab === "reconciliation" && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button size="sm" className="gap-2" onClick={() => setShowRecon(true)}>
                <RefreshCw size={13} /> Generate Report
              </Button>
            </div>
          )}
          {loadingRecons ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : recons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16">
                <CalendarRange size={28} className="text-[var(--text-faint)]" />
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">No reconciliation reports</p>
                <p className="text-[12px] text-[var(--text-muted)]">Generate a report for a billing period to reconcile payments.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recons.map((r) => (
                <Card key={r.id}>
                  <CardContent className="px-5 py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{formatDate(r.period_start)} — {formatDate(r.period_end)}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">Generated {formatDate(r.generated_at)}</p>
                      </div>
                      <Badge variant={r.status === "reconciled" ? "paid" : r.status === "discrepancy" ? "overdue" : "draft"}>
                        {r.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Invoiced", value: r.total_invoiced },
                        { label: "Received", value: r.total_received },
                        { label: "Outstanding", value: r.total_outstanding, danger: parseFloat(r.total_outstanding) > 0 },
                      ].map((s) => (
                        <div key={s.label}>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] mb-0.5">{s.label}</p>
                          <p className={`font-mono text-[16px] font-extrabold ${s.danger ? "text-red-400" : "text-[var(--text-primary)]"}`}>
                            {formatCurrency(s.value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dunning Rules Tab */}
      {tab === "dunning" && (
        <div className="space-y-4">
          {loadingDunning ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : (
            <div className="space-y-3">
              {dunningRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{rule.name}</p>
                      <p className="text-[12px] text-[var(--text-muted)]">
                        +{rule.days_overdue}d overdue → <span className="font-medium capitalize">{rule.action}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.active ? "paid" : "draft"}>{rule.active ? "active" : "inactive"}</Badge>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => updateDunning.mutate({ id: rule.id, active: !rule.active }, {
                            onSuccess: () => toast.success("Rule updated", rule.name),
                          })}
                        >
                          {rule.active ? "Disable" : "Enable"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {isAdmin && (
            <Card>
              <CardContent className="px-5 py-5">
                <p className="text-[12px] font-bold text-[var(--text-primary)] mb-3">Add Dunning Rule</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Name</label>
                    <Input placeholder="e.g. First reminder" value={newDunning.name} onChange={(e) => setNewDunning({ ...newDunning, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Days Overdue</label>
                    <Input type="number" placeholder="7" value={newDunning.days_overdue} onChange={(e) => setNewDunning({ ...newDunning, days_overdue: e.target.value })} />
                  </div>
                  <div>
                    <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Action</label>
                    <select value={newDunning.action} onChange={(e) => setNewDunning({ ...newDunning, action: e.target.value as DunningForm["action"] })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                      {["email", "sms", "suspend", "flag"].map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={!newDunning.name || !newDunning.days_overdue || createDunning.isPending}
                  onClick={() =>
                    createDunning.mutate(
                      { ...newDunning, days_overdue: Number(newDunning.days_overdue) },
                      {
                        onSuccess: () => {
                          toast.success("Dunning rule created", newDunning.name);
                          setNewDunning({ name: "", days_overdue: "", action: "email", message_template: "" });
                        },
                      }
                    )
                  }
                >
                  <Plus size={13} /> Add Rule
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AnimatePresence>
        {showRecon && <ReconDialog onClose={() => setShowRecon(false)} />}
      </AnimatePresence>
    </div>
  );
}

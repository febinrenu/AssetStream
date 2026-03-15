"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock, Plus, Ticket, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTickets, useTicketStats, useCreateTicket, useResolveTicket } from "@/hooks/useTickets";
import { useAssets } from "@/hooks/useAssets";
import { useIsAdmin } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import type { ServiceTicket, TicketPriority, TicketStatus } from "@/types";

const STATUS_FILTERS = ["all", "open", "in_progress", "escalated", "pending_parts", "resolved", "closed"] as const;

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: "bg-emerald-500/15 text-emerald-400",
  medium: "bg-sky-500/15 text-sky-400",
  high: "bg-amber-500/15 text-amber-400",
  critical: "bg-red-500/15 text-red-400",
};

const STATUS_BADGE: Record<TicketStatus, "draft" | "issued" | "paid" | "overdue" | "warning"> = {
  open: "issued",
  in_progress: "warning",
  pending_parts: "draft",
  resolved: "paid",
  escalated: "overdue",
  closed: "draft",
};

function SlaCountdown({ dueAt, breached }: { dueAt: string | null; breached: boolean }) {
  if (!dueAt) return null;
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);

  if (breached) {
    return <span className="text-[10px] font-bold text-red-400">SLA BREACHED</span>;
  }
  if (diffMs < 0) {
    return <span className="text-[10px] font-bold text-red-400">SLA BREACHED</span>;
  }
  return (
    <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${diffH < 4 ? "text-red-400" : diffH < 8 ? "text-amber-400" : "text-[var(--text-faint)]"}`}>
      <Clock size={9} /> {diffH}h {diffM}m
    </span>
  );
}

function CreateTicketDrawer({
  onClose,
  assets,
}: {
  onClose: () => void;
  assets: { id: number; name: string }[];
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "maintenance",
    priority: "medium",
    asset: "",
  });
  const create = useCreateTicket();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.asset) return;
    create.mutate(
      { ...form, asset: Number(form.asset) },
      {
        onSuccess: () => {
          toast.success("Ticket created", form.title);
          onClose();
        },
        onError: () => toast.error("Failed to create ticket", "Please try again."),
      }
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed right-0 top-0 z-[81] flex h-full w-full max-w-[440px] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <p className="text-[15px] font-bold text-[var(--text-primary)]">New Service Ticket</p>
          <button onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Title *</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief description of the issue" required />
          </div>
          <div>
            <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Asset *</label>
            <select
              value={form.asset}
              onChange={(e) => setForm({ ...form, asset: e.target.value })}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="">Select asset…</option>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                {["maintenance", "incident", "breakdown", "inspection", "software", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                {["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Detailed description…"
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create Ticket"}
            </Button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [resolving, setResolving] = useState<ServiceTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const params: Record<string, string> = {};
  if (statusFilter !== "all") params.status = statusFilter;

  const { data: tickets = [], isLoading } = useTickets(params);
  const { data: stats } = useTicketStats();
  const { data: assetsData } = useAssets({ page: "1" });
  const resolve = useResolveTicket();
  const isAdmin = useIsAdmin();

  const assets = (assetsData?.results ?? []).map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Open", value: stats.by_status.open ?? 0, color: "text-sky-400" },
            { label: "In Progress", value: stats.by_status.in_progress ?? 0, color: "text-amber-400" },
            { label: "SLA Breached", value: stats.sla_breached, color: "text-red-400" },
            { label: "Critical", value: stats.by_priority.critical ?? 0, color: "text-red-500" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)] mb-1">{s.label}</p>
                <p className={`font-mono text-[28px] font-extrabold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[var(--text-muted)]">
          <span className="font-mono font-bold text-[var(--text-primary)]">{tickets.length}</span> tickets
        </p>
        <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Ticket
        </Button>
      </div>

      {/* Filter Tabs */}
      <Card>
        <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--border)] px-5 py-3">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-semibold capitalize transition-all ${
                statusFilter === s
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-b border-[var(--border)] px-6 py-4">
                <Skeleton className="h-4 w-2/3 rounded mb-2" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
            ))
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
                <Ticket size={28} className="text-[var(--text-faint)]" />
              </div>
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">No tickets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["Ticket", "Asset", "Category", "Priority", "SLA", "Status", "Reported", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)] transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-mono text-[11px] font-bold text-[var(--accent)]">{t.ticket_number}</p>
                        <p className="text-[13px] font-medium text-[var(--text-primary)] truncate max-w-[180px]">{t.title}</p>
                      </td>
                      <td className="px-5 py-4 text-[12px] text-[var(--text-muted)] max-w-[120px] truncate">{t.asset_name}</td>
                      <td className="px-5 py-4 text-[12px] capitalize text-[var(--text-muted)]">{t.category}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_COLORS[t.priority]}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <SlaCountdown dueAt={t.sla_due_at} breached={t.sla_breached} />
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={(STATUS_BADGE[t.status] ?? "draft") as never}>{t.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-5 py-4 text-[12px] text-[var(--text-muted)]">{formatDate(t.created_at)}</td>
                      <td className="px-5 py-4">
                        {isAdmin && !["resolved", "closed"].includes(t.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-[11px] whitespace-nowrap"
                            onClick={() => { setResolving(t); setResolutionNotes(""); }}
                          >
                            <CheckCircle2 size={11} /> Resolve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve dialog */}
      <AnimatePresence>
        {resolving && (
          <>
            <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" onClick={() => setResolving(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-1/2 z-[81] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
            >
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-1">Resolve Ticket</h3>
              <p className="text-[12px] text-[var(--text-muted)] mb-4">{resolving.ticket_number} — {resolving.title}</p>
              <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Resolution Notes *</label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
                placeholder="Describe how the issue was resolved…"
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setResolving(null)}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={!resolutionNotes.trim() || resolve.isPending}
                  onClick={() => {
                    resolve.mutate(
                      { id: resolving.id, resolution_notes: resolutionNotes },
                      {
                        onSuccess: () => { toast.success("Ticket resolved", resolving.ticket_number); setResolving(null); },
                        onError: () => toast.error("Failed", "Please try again."),
                      }
                    );
                  }}
                >
                  {resolve.isPending ? "Resolving…" : "Mark Resolved"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create drawer */}
      <AnimatePresence>
        {showCreate && <CreateTicketDrawer onClose={() => setShowCreate(false)} assets={assets} />}
      </AnimatePresence>
    </div>
  );
}

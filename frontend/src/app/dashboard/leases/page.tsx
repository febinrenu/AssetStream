"use client";

import { useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Download, Paperclip, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useLeases, useTerminateLease, useRenewLease, useUploadLeaseDocument, useDeleteLeaseDocument } from "@/hooks/useLeases";
import api from "@/lib/axios";
import { useIsAdmin, useCanExport, useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { toast } from "@/lib/toast";

type SortDir = "asc" | "desc";

function SortTh({
  label, col, sort, onSort, align = "left",
}: {
  label: string; col: string;
  sort: { col: string; dir: SortDir } | null;
  onSort: (col: string) => void;
  align?: "left" | "right";
}) {
  const active = sort?.col === col;
  return (
    <th className={`px-6 py-3.5 text-${align}`}>
      <button
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)] transition-colors hover:text-[var(--text-primary)]"
      >
        {label}
        {active ? (
          sort!.dir === "asc" ? <ChevronUp size={11} className="text-[var(--accent)]" /> : <ChevronDown size={11} className="text-[var(--accent)]" />
        ) : (
          <ArrowUpDown size={10} className="opacity-30" />
        )}
      </button>
    </th>
  );
}

const STATUS_FILTERS = ["all", "active", "pending", "completed", "defaulted"] as const;

export default function LeasesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const isAdmin = useIsAdmin();
  const canExport = useCanExport();
  const { data: currentUser } = useAuth();
  const terminateLease = useTerminateLease();
  const renewLease = useRenewLease();
  const [confirmTerminateId, setConfirmTerminateId] = useState<number | null>(null);
  const [renewTarget, setRenewTarget] = useState<{ id: number; contract: string } | null>(null);
  const [renewMonths, setRenewMonths] = useState<string>("12");
  const [renewNotes, setRenewNotes] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [sort, setSort] = useState<{ col: string; dir: SortDir } | null>(null);
  const uploadDoc = useUploadLeaseDocument();
  const deleteDoc = useDeleteLeaseDocument();

  function handleDocUpload(leaseId: number, file: File) {
    uploadDoc.mutate({ id: leaseId, file }, {
      onSuccess: () => toast.success("Document uploaded", "Lease document saved."),
      onError: () => toast.error("Upload failed", "Could not upload document."),
    });
  }

  function handleDocDelete(leaseId: number) {
    deleteDoc.mutate(leaseId, {
      onSuccess: () => toast.success("Document removed", "Lease document deleted."),
      onError: () => toast.error("Delete failed", "Could not remove document."),
    });
  }

  function toggleSort(col: string) {
    setSort((prev) =>
      prev?.col === col
        ? prev.dir === "asc"
          ? { col, dir: "desc" }
          : null
        : { col, dir: "asc" }
    );
  }

  const params: Record<string, string> = { page: String(page) };
  if (statusFilter !== "all") params.status = statusFilter;
  if (sort) params.ordering = sort.dir === "asc" ? sort.col : `-${sort.col}`;

  const { data, isLoading } = useLeases(params);
  const leases = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  async function handleExportCSV() {
    setExporting(true);
    try {
      const response = await api.get("/export/leases/", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leases.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready", "leases.csv downloaded.");
    } catch {
      toast.error("Export failed", "Could not generate CSV.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
        <p className="text-[13px] text-[var(--text-muted)]">
          <span className="font-mono font-bold text-[var(--text-primary)]">{totalCount}</span> total contracts
        </p>
        {canExport && (
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV} disabled={exporting}>
            <Download size={14} />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        )}
      </div>

      <Card>
        <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--border)] px-6 py-3.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-all duration-150 ${
                statusFilter === s
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <SortTh label="Contract #" col="contract_number" sort={sort} onSort={toggleSort} />
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">Asset</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">Lessee</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">Period</th>
                  <SortTh label="Monthly Fee" col="monthly_base_fee" sort={sort} onSort={toggleSort} align="right" />
                  <SortTh label="Status" col="status" sort={sort} onSort={toggleSort} />
                  <SortTh label="Days Left" col="end_date" sort={sort} onSort={toggleSort} align="right" />
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <Skeleton className="h-4 w-full rounded-lg" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : leases.map((lease) => {
                      const days = daysUntil(lease.end_date);
                      return (
                        <tr key={lease.id} className="border-b border-[var(--border)] transition-colors duration-150 hover:bg-[var(--surface-muted)] last:border-0">
                          <td className="px-6 py-4 font-mono text-[12px] font-semibold text-[var(--text-primary)]">{lease.contract_number}</td>
                          <td className="px-6 py-4">
                            <p className="text-[13px] font-semibold text-[var(--text-primary)]">{lease.asset_detail?.name || `Asset #${lease.asset}`}</p>
                          </td>
                          <td className="px-6 py-4 text-[12px] text-[var(--text-muted)]">{lease.lessee_detail?.company_name || lease.lessee_detail?.username}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-[12px] text-[var(--text-muted)]">
                            {formatDate(lease.start_date)} &ndash; {formatDate(lease.end_date)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">{formatCurrency(lease.monthly_base_fee)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={lease.status as "active" | "pending" | "completed" | "defaulted"}>{lease.status}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {days > 0 ? (
                              <span
                                className={`rounded-lg px-2.5 py-1 font-mono text-[12px] font-bold ${
                                  days < 30
                                    ? "bg-[var(--destructive-subtle)] text-[var(--destructive)]"
                                    : days < 60
                                    ? "bg-[var(--warning-subtle)] text-[var(--warning)]"
                                    : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                                }`}
                              >
                                {days}d
                              </span>
                            ) : (
                              <span className="text-[12px] text-[var(--text-faint)]">&mdash;</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {(lease.status === "active" || lease.status === "pending" || lease.status === "completed") &&
                                (isAdmin || (currentUser?.role === "lessee" && lease.lessee === currentUser?.id)) && (
                                <button
                                  onClick={() => { setRenewTarget({ id: lease.id, contract: lease.contract_number }); setRenewMonths("12"); setRenewNotes(""); }}
                                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] bg-opacity-10 px-3 py-1.5 text-[11px] font-bold text-[var(--accent)] transition-all hover:bg-opacity-20"
                                >
                                  <RefreshCw size={11} />
                                  Renew
                                </button>
                              )}
                              {isAdmin && lease.status === "active" && (
                                <button
                                  onClick={() => setConfirmTerminateId(lease.id)}
                                  className="rounded-xl bg-[var(--destructive-subtle)] px-3 py-1.5 text-[11px] font-bold text-[var(--destructive)] transition-all hover:bg-[var(--destructive)] hover:text-white"
                                >
                                  Terminate
                                </button>
                              )}
                              {/* Document upload / view — admin or lessee who owns this lease */}
                              {(isAdmin || (currentUser?.role === "lessee" && lease.lessee === currentUser?.id)) && (
                                lease.document_url ? (
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={lease.document_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-xl bg-[var(--success-subtle)] px-2.5 py-1.5 text-[var(--success)] transition-colors hover:bg-[var(--success)]  hover:text-white"
                                      title="View document"
                                    >
                                      <Paperclip size={12} />
                                    </a>
                                    <button
                                      onClick={() => handleDocDelete(lease.id)}
                                      className="rounded-xl bg-[var(--surface-muted)] p-1.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--destructive-subtle)] hover:text-[var(--destructive)]"
                                      title="Remove document"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                ) : (
                                  <label
                                    className="cursor-pointer rounded-xl bg-[var(--surface-muted)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
                                    title="Attach document"
                                  >
                                    <Paperclip size={12} />
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.doc,.docx"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleDocUpload(lease.id, file);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {!isLoading && leases.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
                <RefreshCw size={28} className="text-[var(--text-faint)]" />
              </div>
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">No leases found</p>
              <p className="text-[13px] text-[var(--text-muted)]">
                {statusFilter !== "all" ? `No ${statusFilter} leases at the moment.` : "Lease contracts will appear here once created."}
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-col gap-2 border-t border-[var(--border)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[var(--text-muted)]">
                Page <span className="font-mono font-semibold text-[var(--text-primary)]">{page}</span> of{" "}
                <span className="font-mono font-semibold text-[var(--text-primary)]">{totalPages}</span>
                {" "}&middot; {totalCount} results
              </p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="gap-1" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={14} />
                  Prev
                </Button>
                <Button variant="outline" size="sm" className="gap-1" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmTerminateId !== null}
        onOpenChange={(open) => !open && setConfirmTerminateId(null)}
        title="Terminate Lease Contract"
        description="This will immediately end the lease and mark the asset as available. This action cannot be undone."
        confirmLabel="Terminate"
        variant="danger"
        loading={terminateLease.isPending}
        onConfirm={() => {
          if (confirmTerminateId === null) return;
          terminateLease.mutate(confirmTerminateId, {
            onSuccess: () => {
              toast.success("Lease terminated", "The contract has been ended and the asset is now available.");
              setConfirmTerminateId(null);
            },
            onError: () => {
              toast.error("Failed to terminate lease", "Please try again.");
              setConfirmTerminateId(null);
            },
          });
        }}
      />

      {/* Renew modal */}
      {renewTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setRenewTarget(null); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-8 shadow-2xl">
            <h2 className="mb-1 text-[16px] font-bold text-[var(--text-primary)]">Renew Lease</h2>
            <p className="mb-6 text-[13px] text-[var(--text-muted)]">
              Contract <span className="font-mono font-semibold">{renewTarget.contract}</span>
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="renew-months" className="mb-1.5 block text-[12px] font-semibold">Extension Duration (months)</Label>
                <Input id="renew-months" type="number" min="1" max="120" value={renewMonths} onChange={(e) => setRenewMonths(e.target.value)} className="font-mono" />
                <p className="mt-1 text-[11px] text-[var(--text-faint)]">1&ndash;120 months added to the current end date</p>
              </div>
              <div>
                <Label htmlFor="renew-notes" className="mb-1.5 block text-[12px] font-semibold">
                  Notes <span className="font-normal text-[var(--text-faint)]">(optional)</span>
                </Label>
                <Input id="renew-notes" value={renewNotes} onChange={(e) => setRenewNotes(e.target.value)} placeholder="e.g. Renewal agreed on call with client" />
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <Button
                className="flex-1"
                onClick={() => {
                  const months = parseInt(renewMonths, 10);
                  if (!months || months < 1 || months > 120) {
                    toast.error("Invalid duration", "Enter a value between 1 and 120 months.");
                    return;
                  }
                  renewLease.mutate(
                    { id: renewTarget!.id, duration_months: months, notes: renewNotes },
                    {
                      onSuccess: () => {
                        toast.success("Lease renewed", `Extended by ${months} month${months !== 1 ? "s" : ""}.`);
                        setRenewTarget(null);
                      },
                      onError: () => {
                        toast.error("Renewal failed", "Please check the details and try again.");
                      },
                    }
                  );
                }}
                disabled={renewLease.isPending}
              >
                {renewLease.isPending ? "Renewing…" : "Confirm Renewal"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setRenewTarget(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

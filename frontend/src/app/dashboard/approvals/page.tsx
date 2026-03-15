"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck,
  Clock, Filter, XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovals, useApprovalStats, useApproveRequest, useRejectRequest, useCancelApproval } from "@/hooks/useApprovals";
import { useIsAdmin, useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import type { ApprovalRequest, ApprovalStatus } from "@/types";

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "cancelled"] as const;

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: "warning",
  approved: "paid",
  rejected: "overdue",
  cancelled: "draft",
  expired: "draft",
};

const TYPE_LABELS: Record<string, string> = {
  lease_renew: "Lease Renewal",
  lease_terminate: "Lease Termination",
  lease_discount: "Lease Discount",
  write_off: "Invoice Write-Off",
  asset_disposal: "Asset Disposal",
  lease_create: "Lease Creation",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-emerald-400",
  medium: "text-sky-400",
  high: "text-amber-400",
  urgent: "text-red-500",
};

function ReviewDialog({
  approval,
  action,
  onConfirm,
  onClose,
  loading,
}: {
  approval: ApprovalRequest;
  action: "approve" | "reject";
  onConfirm: (notes: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [notes, setNotes] = useState("");
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed left-1/2 top-1/2 z-[81] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
      >
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-1">
          {action === "approve" ? "Approve Request" : "Reject Request"}
        </h3>
        <p className="text-[12px] text-[var(--text-muted)] mb-4">
          {approval.request_number} — {approval.request_type_display}
        </p>
        <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
          Reviewer Notes {action === "reject" && <span className="text-red-400">(required)</span>}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={action === "approve" ? "Optional notes…" : "Reason for rejection…"}
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => onConfirm(notes)}
            disabled={loading || (action === "reject" && !notes.trim())}
            className={action === "reject" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            {loading ? "Processing…" : action === "approve" ? "Approve" : "Reject"}
          </Button>
        </div>
      </motion.div>
    </>
  );
}

export default function ApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [dialog, setDialog] = useState<{ approval: ApprovalRequest; action: "approve" | "reject" } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const params: Record<string, string> = {};
  if (statusFilter !== "all") params.status = statusFilter;

  const { data: approvals = [], isLoading } = useApprovals(params);
  const { data: stats } = useApprovalStats();
  const { data: user } = useAuth();
  const isAdmin = useIsAdmin();
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const cancel = useCancelApproval();

  function handleReview(notes: string) {
    if (!dialog) return;
    const { approval, action } = dialog;
    const mutation = action === "approve" ? approve : reject;
    mutation.mutate(
      { id: approval.id, reviewer_notes: notes },
      {
        onSuccess: () => {
          toast.success(
            action === "approve" ? "Request approved" : "Request rejected",
            `${approval.request_number} has been ${action}d.`
          );
          setDialog(null);
        },
        onError: () => {
          toast.error("Action failed", "Please try again.");
          setDialog(null);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Pending", value: stats.by_status.pending ?? 0, color: "text-amber-400" },
            { label: "Approved", value: stats.by_status.approved ?? 0, color: "text-emerald-400" },
            { label: "Rejected", value: stats.by_status.rejected ?? 0, color: "text-red-400" },
            { label: "Total", value: Object.values(stats.by_status).reduce((a, b) => a + b, 0), color: "text-[var(--text-primary)]" },
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

      {/* Filter Tabs */}
      <Card>
        <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--border)] px-5 py-3">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-all duration-150 ${
                statusFilter === s
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {s === "all" ? "All" : s}
              {s === "pending" && stats?.by_status.pending ? (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white font-bold">
                  {stats.by_status.pending}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border-b border-[var(--border)] px-6 py-4">
                  <Skeleton className="h-4 w-2/3 rounded-lg mb-2" />
                  <Skeleton className="h-3 w-1/3 rounded-lg" />
                </div>
              ))}
            </div>
          ) : approvals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
                <ClipboardCheck size={28} className="text-[var(--text-faint)]" />
              </div>
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">No requests found</p>
              <p className="text-[13px] text-[var(--text-muted)]">
                {statusFilter !== "all" ? `No ${statusFilter} approval requests.` : "No approval requests yet."}
              </p>
            </div>
          ) : (
            <div>
              {approvals.map((req) => {
                const isExpanded = expandedId === req.id;
                return (
                  <div key={req.id} className="border-b border-[var(--border)] last:border-0">
                    <div
                      className="flex cursor-pointer items-start justify-between gap-4 px-6 py-4 hover:bg-[var(--surface-muted)] transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-[12px] font-bold text-[var(--accent)]">{req.request_number}</span>
                          <Badge variant={(STATUS_COLORS[req.status] ?? "draft") as never}>
                            {req.status}
                          </Badge>
                          <span className={`text-[11px] font-semibold uppercase ${PRIORITY_COLORS[req.priority]}`}>
                            {req.priority}
                          </span>
                        </div>
                        <p className="mt-1 text-[13px] font-semibold text-[var(--text-primary)]">
                          {req.request_type_display}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                          By <span className="font-medium text-[var(--text-primary)]">{req.requested_by_name}</span>
                          {" · "}{formatDate(req.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isAdmin && req.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 gap-1.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={(e) => { e.stopPropagation(); setDialog({ approval: req, action: "approve" }); }}
                            >
                              <CheckCircle2 size={12} /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1.5 text-[11px] text-red-400 border-red-500/30 hover:bg-red-500/10"
                              onClick={(e) => { e.stopPropagation(); setDialog({ approval: req, action: "reject" }); }}
                            >
                              <XCircle size={12} /> Reject
                            </Button>
                          </>
                        )}
                        {req.status === "pending" && req.requested_by === user?.id && !isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancel.mutate(req.id, {
                                onSuccess: () => toast.success("Request cancelled", req.request_number),
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        {isExpanded ? <ChevronUp size={14} className="text-[var(--text-faint)]" /> : <ChevronDown size={14} className="text-[var(--text-faint)]" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-[var(--border)] bg-[var(--surface-muted)]"
                        >
                          <div className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-2">
                            {req.resource_type && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] mb-1">Resource</p>
                                <p className="text-[12px] text-[var(--text-primary)] capitalize">
                                  {req.resource_type} #{req.resource_id}
                                </p>
                              </div>
                            )}
                            {Object.keys(req.payload).length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] mb-1">Payload</p>
                                <pre className="text-[11px] text-[var(--text-muted)] font-mono overflow-x-auto">
                                  {JSON.stringify(req.payload, null, 2)}
                                </pre>
                              </div>
                            )}
                            {req.requester_notes && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] mb-1">Requester Notes</p>
                                <p className="text-[12px] text-[var(--text-muted)]">{req.requester_notes}</p>
                              </div>
                            )}
                            {req.reviewer_notes && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] mb-1">Reviewer Notes</p>
                                <p className="text-[12px] text-[var(--text-muted)]">{req.reviewer_notes}</p>
                              </div>
                            )}
                            {req.reviewed_at && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] mb-1">Reviewed</p>
                                <p className="text-[12px] text-[var(--text-muted)]">
                                  {formatDate(req.reviewed_at)} by {req.reviewed_by_username}
                                </p>
                              </div>
                            )}
                            {req.expires_at && req.status === "pending" && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] mb-1 flex items-center gap-1">
                                  <Clock size={10} /> Expires
                                </p>
                                <p className="text-[12px] text-amber-400">{formatDate(req.expires_at)}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review dialog */}
      <AnimatePresence>
        {dialog && (
          <ReviewDialog
            approval={dialog.approval}
            action={dialog.action}
            onConfirm={handleReview}
            onClose={() => setDialog(null)}
            loading={approve.isPending || reject.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

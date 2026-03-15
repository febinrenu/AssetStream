"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpDown, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, Receipt, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useInvoices, useMarkInvoicePaid } from "@/hooks/useInvoices";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import api from "@/lib/axios";
import { useIsAdmin, useCanExport } from "@/hooks/useAuth";
import type { Invoice } from "@/types";

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

function InvoiceDrawer({
  invoice,
  onClose,
  onMarkPaid,
  markingPaid,
  canMarkPaid,
}: {
  invoice: Invoice;
  onClose: () => void;
  onMarkPaid: (id: number) => void;
  markingPaid: boolean;
  canMarkPaid: boolean;
}) {
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
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <p className="font-mono text-[15px] font-bold text-[var(--text-primary)]">{invoice.invoice_number}</p>
            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
              {formatDate(invoice.billing_period_start)} &ndash; {formatDate(invoice.billing_period_end)}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Badge variant={invoice.status as "paid" | "issued" | "overdue" | "draft"}>{invoice.status}</Badge>
            <button onClick={onClose} className="text-[var(--text-faint)] transition-colors hover:text-[var(--text-primary)]">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Dates */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] divide-y divide-[var(--border)]">
            {[
              ["Issued", formatDate(invoice.issued_at)],
              ["Due Date", formatDate(invoice.due_date)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
                <span className="font-mono text-[12px] font-semibold text-[var(--text-primary)]">{value}</span>
              </div>
            ))}
          </div>

          {/* Line Items */}
          <div>
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">
              Charge Breakdown
            </p>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full">
                <tbody>
                  {[
                    ["Base Fee", invoice.base_fee],
                    ["Usage Fee", invoice.usage_fee],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{label}</td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] text-[var(--text-primary)]">
                        {formatCurrency(value as string)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[var(--surface-muted)]">
                    <td className="px-4 py-3 text-[12px] font-bold text-[var(--text-primary)]">Total</td>
                    <td className="px-4 py-3 text-right font-mono text-[15px] font-extrabold text-[var(--text-primary)]">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-6 py-4">
          {canMarkPaid && invoice.status !== "paid" ? (
            <Button
              className="w-full gap-1.5"
              onClick={() => onMarkPaid(invoice.id)}
              disabled={markingPaid}
            >
              <CheckCircle2 size={14} />
              Mark as Paid
            </Button>
          ) : invoice.status === "paid" ? (
            <p className="text-center text-[12px] font-semibold text-emerald-500">✓ Invoice Paid</p>
          ) : (
            <p className="text-center text-[12px] text-[var(--text-faint)]">Payment processing managed by admin</p>
          )}
        </div>
      </motion.div>
    </>
  );
}

const STATUS_FILTERS = ["all", "draft", "issued", "paid", "overdue"] as const;

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [confirmPay, setConfirmPay] = useState<Invoice | null>(null);
  const [sort, setSort] = useState<{ col: string; dir: SortDir } | null>(null);

  function toggleSort(col: string) {
    setSort((prev) =>
      prev?.col === col
        ? prev.dir === "asc" ? { col, dir: "desc" } : null
        : { col, dir: "asc" }
    );
  }

  const params: Record<string, string> = { page: String(page) };
  if (statusFilter !== "all") params.status = statusFilter;
  if (sort) params.ordering = sort.dir === "asc" ? sort.col : `-${sort.col}`;

  const { data, isLoading } = useInvoices(params);
  const markPaid = useMarkInvoicePaid();
  const isAdmin = useIsAdmin();
  const canExport = useCanExport();

  const invoices = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  const [exporting, setExporting] = useState(false);
  async function handleExportCSV() {
    setExporting(true);
    try {
      const response = await api.get("/export/invoices/", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "invoices.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready", "invoices.csv downloaded.");
    } catch {
      toast.error("Export failed", "Could not generate CSV.");
    } finally {
      setExporting(false);
    }
  }

  const outstanding = invoices
    .filter((inv) => inv.status === "issued" || inv.status === "overdue")
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);

  const paidThisMonth = invoices
    .filter((inv) => {
      if (inv.status !== "paid") return false;
      const issued = new Date(inv.issued_at);
      const now = new Date();
      return issued.getMonth() === now.getMonth() && issued.getFullYear() === now.getFullYear();
    })
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);

  const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[var(--text-muted)]">
          <span className="font-mono font-bold text-[var(--text-primary)]">{totalCount}</span> total invoices
        </p>
        {canExport && (
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV} disabled={exporting}>
            <Download size={14} />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Outstanding", value: formatCurrency(outstanding), danger: false },
          { label: "Paid This Month", value: formatCurrency(paidThisMonth), danger: false },
          { label: "Overdue Count", value: String(overdueCount), danger: overdueCount > 0 },
        ].map((s) => (
          <Card key={s.label} className="group transition-shadow duration-200 hover:shadow-[var(--card-shadow-hover)]">
            <CardContent className="px-6 py-5">
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">{s.label}</p>
              <p className={`font-mono text-[28px] font-extrabold tracking-tight ${s.danger ? "text-[var(--destructive)]" : "text-[var(--text-primary)]"}`}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
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
            <table className="w-full min-w-[1080px]">
                      <thead>
                <tr className="border-b border-[var(--border)]">
                  <SortTh label="Invoice #" col="invoice_number" sort={sort} onSort={toggleSort} />
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">Period</th>
                  <SortTh label="Base Fee" col="base_fee" sort={sort} onSort={toggleSort} align="right" />
                  <SortTh label="Usage Fee" col="usage_fee" sort={sort} onSort={toggleSort} align="right" />
                  <SortTh label="Total" col="total_amount" sort={sort} onSort={toggleSort} align="right" />
                  <SortTh label="Status" col="status" sort={sort} onSort={toggleSort} />
                  <SortTh label="Due Date" col="due_date" sort={sort} onSort={toggleSort} />
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <Skeleton className="h-4 w-full rounded-lg" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : invoices.map((invoice) => (
                      <tr key={invoice.id} onClick={() => setSelectedInvoice(invoice)} className="cursor-pointer border-b border-[var(--border)] transition-colors duration-150 hover:bg-[var(--surface-muted)] last:border-0">
                        <td className="px-6 py-4 font-mono text-[12px] font-semibold text-[var(--text-primary)]">{invoice.invoice_number}</td>
                        <td className="px-6 py-4 text-[12px] text-[var(--text-muted)]">
                          {formatDate(invoice.billing_period_start)} &ndash; {formatDate(invoice.billing_period_end)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-[12px] text-[var(--text-muted)]">{formatCurrency(invoice.base_fee)}</td>
                        <td className="px-6 py-4 text-right font-mono text-[12px] text-[var(--text-muted)]">{formatCurrency(invoice.usage_fee)}</td>
                        <td className="px-6 py-4 text-right font-mono text-[13px] font-bold text-[var(--text-primary)]">{formatCurrency(invoice.total_amount)}</td>
                        <td className="px-6 py-4">
                          <Badge variant={invoice.status as "paid" | "issued" | "overdue" | "draft"}>{invoice.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-[12px] text-[var(--text-muted)]">{formatDate(invoice.due_date)}</td>
                        <td className="px-6 py-4">
                          {isAdmin && invoice.status !== "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1.5 whitespace-nowrap text-[11px]"
                              onClick={(e) => { e.stopPropagation(); setConfirmPay(invoice); }}
                              disabled={markPaid.isPending}
                            >
                              <CheckCircle2 size={12} />
                              Mark Paid
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {!isLoading && invoices.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
                <Receipt size={28} className="text-[var(--text-faint)]" />
              </div>
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">No invoices found</p>
              <p className="text-[13px] text-[var(--text-muted)]">
                {statusFilter !== "all" ? `No ${statusFilter} invoices at the moment.` : "Invoices are generated automatically at end of billing cycle."}
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


      {/* Invoice detail drawer */}
      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceDrawer
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onMarkPaid={(id) => setConfirmPay(invoices.find((i) => i.id === id) ?? selectedInvoice)}
            markingPaid={markPaid.isPending}
            canMarkPaid={isAdmin}
          />
        )}
      </AnimatePresence>

      {/* Mark paid confirmation */}
      <ConfirmDialog
        open={confirmPay !== null}
        onOpenChange={(open) => !open && setConfirmPay(null)}
        title="Mark Invoice as Paid"
        description={`Record payment of ${confirmPay ? formatCurrency(confirmPay.total_amount) : ""} for ${confirmPay?.invoice_number ?? ""}?`}
        confirmLabel="Mark Paid"
        loading={markPaid.isPending}
        onConfirm={() => {
          if (!confirmPay) return;
          markPaid.mutate(confirmPay.id, {
            onSuccess: () => {
              toast.success("Invoice marked as paid", `${confirmPay.invoice_number} has been recorded.`);
              setConfirmPay(null);
              setSelectedInvoice(null);
            },
            onError: () => {
              toast.error("Failed to mark paid", "Please try again.");
              setConfirmPay(null);
            },
          });
        }}
      />
    </div>
  );
}

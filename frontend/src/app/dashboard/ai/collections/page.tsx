"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  RefreshCw,
  TrendingUp,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollectionsList } from "@/hooks/useAI";
import { formatCurrency } from "@/lib/utils";

function urgencyVariant(score: number): "destructive" | "pending" | "active" {
  if (score > 70) return "destructive";
  if (score > 40) return "pending";
  return "active";
}

function escalationLabel(daysOverdue: number): { text: string; variant: "destructive" | "pending" | "active" } {
  if (daysOverdue > 60) return { text: "High", variant: "destructive" };
  if (daysOverdue > 30) return { text: "Medium", variant: "pending" };
  return { text: "Low", variant: "active" };
}

function DraftMessagePanel({ subject, body }: { subject: string; body: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mx-6 mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)]">
            Draft Communication
          </p>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {copied ? (
              <>
                <Check size={11} className="text-[var(--success)]" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardCopy size={11} />
                Copy
              </>
            )}
          </button>
        </div>
        <p className="mb-2 text-[12px] font-semibold text-[var(--accent)]">{subject}</p>
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-primary)]">
          {body}
        </p>
      </div>
    </motion.div>
  );
}

export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useCollectionsList();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["ai", "collections"] });
    setTimeout(() => setRefreshing(false), 600);
  }

  const results = data?.results ?? [];
  const totalOverdue = data?.total_overdue ?? 0;
  const totalAmount = data?.total_amount ?? 0;
  const highEscalationCount = results.filter((r) => r.days_overdue > 60).length;

  const stats = [
    {
      label: "Total Overdue",
      value: String(totalOverdue),
      icon: <AlertCircle size={15} />,
      color: "text-[var(--destructive)]",
      bg: "bg-red-500/10",
    },
    {
      label: "Total Amount",
      value: formatCurrency(totalAmount),
      icon: <DollarSign size={15} />,
      color: "text-[var(--warning)]",
      bg: "bg-amber-500/10",
    },
    {
      label: "High Escalation Risk",
      value: String(highEscalationCount),
      icon: <AlertTriangle size={15} />,
      color: "text-[var(--destructive)]",
      bg: "bg-red-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">AI Collections Assistant</h1>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
            AI-prioritised overdue invoices with suggested next best actions
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[90px] rounded-2xl" />
            ))
          : stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}
                >
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-[20px] font-bold tabular-nums text-[var(--text-primary)]">
                    {stat.value}
                  </p>
                </div>
              </motion.div>
            ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-semibold">Overdue Invoice Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 px-5 pb-5 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <TrendingUp size={32} className="mb-3 text-[var(--success)]" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                No overdue invoices — portfolio is healthy!
              </p>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                All invoices are up to date.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {[
                      "Lessee",
                      "Asset",
                      "Invoice",
                      "Days Overdue",
                      "Amount",
                      "Urgency",
                      "Next Best Action",
                      "Escalation",
                      "Draft",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, i) => {
                    const esc = escalationLabel(item.days_overdue);
                    return (
                      <motion.tr
                        key={item.invoice_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-muted)]"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                            {item.lessee_name}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-[12px] text-[var(--text-muted)]">{item.asset_name}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[12px] text-[var(--text-faint)]">
                            {item.invoice_number}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`font-mono text-[13px] font-bold ${
                              item.days_overdue > 60
                                ? "text-[var(--destructive)]"
                                : item.days_overdue > 30
                                ? "text-[var(--warning)]"
                                : "text-[var(--text-primary)]"
                            }`}
                          >
                            {item.days_overdue}d
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                            {formatCurrency(item.total_amount)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={urgencyVariant(item.urgency_score)}>
                            {item.urgency_score.toFixed(1)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant="outline">{item.nba_action}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={esc.variant}>{esc.text}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() =>
                              setExpandedId(expandedId === item.invoice_id ? null : item.invoice_id)
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          >
                            View
                            {expandedId === item.invoice_id ? (
                              <ChevronUp size={11} />
                            ) : (
                              <ChevronDown size={11} />
                            )}
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                  {results.map((item) => (
                    <AnimatePresence key={`draft-wrap-${item.invoice_id}`}>
                      {expandedId === item.invoice_id && (
                        <tr key={`draft-${item.invoice_id}`} className="border-b border-[var(--border)]">
                          <td colSpan={9} className="p-0">
                            <DraftMessagePanel subject={item.draft_subject} body={item.draft_body} />
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ScanSearch,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAnomalyAlerts,
  useRunAnomalyScan,
  useResolveAnomaly,
} from "@/hooks/useAI";
import type { AnomalyAlert, AnomalySeverity } from "@/types/ai";

type TabFilter = "all" | "unresolved" | "critical";

const SEVERITY_BADGE: Record<
  AnomalySeverity,
  "destructive" | "pending" | "warning" | "active"
> = {
  critical: "destructive",
  high: "pending",
  medium: "warning",
  low: "active",
};

const TAB_FILTERS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unresolved", label: "Unresolved" },
  { key: "critical", label: "Critical" },
];

function formatAlertType(type: string) {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function StatCard({
  label,
  value,
  danger,
}: {
  label: string;
  value: number | string;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">
        {label}
      </p>
      <p
        className={`font-mono text-[26px] font-extrabold tabular-nums ${
          danger ? "text-[var(--destructive)]" : "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function AnomalyDetectionPage() {
  const [tab, setTab] = useState<TabFilter>("all");
  const [scanBanner, setScanBanner] = useState<string | null>(null);

  const resolvedFilter =
    tab === "unresolved" ? false : undefined;

  const { data, isLoading, error } = useAnomalyAlerts(resolvedFilter);
  const runScan = useRunAnomalyScan();
  const resolveAnomaly = useResolveAnomaly();

  const allAlerts: AnomalyAlert[] = data?.results ?? [];

  const displayAlerts =
    tab === "critical"
      ? allAlerts.filter((a) => a.severity === "critical")
      : allAlerts;

  const unresolvedCount = data?.unresolved_count ?? 0;
  const criticalCount = allAlerts.filter((a) => a.severity === "critical").length;
  const totalCount = data?.count ?? 0;

  function handleScan() {
    setScanBanner(null);
    runScan.mutate(undefined, {
      onSuccess: (res) => {
        setScanBanner(res.detail);
      },
      onError: (err) => {
        setScanBanner(`Error: ${err.message}`);
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
            <ShieldAlert size={18} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-[var(--text-primary)]">
              Invoice Anomaly Detection
            </h1>
            <p className="text-[12px] text-[var(--text-muted)]">
              AI-detected billing irregularities across your lease portfolio
            </p>
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={runScan.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {runScan.isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <ScanSearch size={14} />
              Run Scan
            </>
          )}
        </button>
      </div>

      {/* Scan result banner */}
      {scanBanner && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${
            scanBanner.startsWith("Error:")
              ? "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
              : "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
          }`}
        >
          {scanBanner.startsWith("Error:") ? (
            <AlertTriangle
              size={14}
              className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
            />
          ) : (
            <CheckCircle2
              size={14}
              className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            />
          )}
          <p
            className={`text-[12px] font-medium ${
              scanBanner.startsWith("Error:")
                ? "text-red-700 dark:text-red-400"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {scanBanner}
          </p>
        </motion.div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
          <AlertTriangle
            size={14}
            className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
          />
          <p className="text-[12px] text-red-700 dark:text-red-400">
            {error.message}
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[90px] rounded-2xl" />
            ))
          : [
              { label: "Total Alerts", value: totalCount, danger: false },
              { label: "Unresolved", value: unresolvedCount, danger: unresolvedCount > 0 },
              { label: "Critical", value: criticalCount, danger: criticalCount > 0 },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <StatCard label={stat.label} value={stat.value} danger={stat.danger} />
              </motion.div>
            ))}
      </div>

      {/* Table card */}
      <Card>
        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--border)] px-6 py-3.5">
          {TAB_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTab(f.key)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-150 ${
                tab === f.key
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {[
                    "Asset",
                    "Invoice",
                    "Type",
                    "Severity",
                    "Score",
                    "Explanation",
                    "Status",
                    "Action",
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
                  : displayAlerts.map((alert, i) => (
                      <motion.tr
                        key={alert.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-muted)]"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                            {alert.asset_name}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[12px] text-[var(--text-muted)]">
                          {alert.invoice_number}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-lg bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                            {formatAlertType(alert.alert_type)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={SEVERITY_BADGE[alert.severity]}>
                            {alert.severity}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                          {alert.anomaly_score.toFixed(2)}
                        </td>
                        <td className="max-w-[220px] px-5 py-3.5">
                          <p
                            className="truncate text-[12px] text-[var(--text-muted)]"
                            title={alert.explanation}
                          >
                            {alert.explanation}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          {alert.resolved ? (
                            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-500">
                              <CheckCircle2 size={13} />
                              Resolved
                            </span>
                          ) : (
                            <Badge variant="pending">Unresolved</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {!alert.resolved && (
                            <button
                              onClick={() => resolveAnomaly.mutate(alert.id)}
                              disabled={resolveAnomaly.isPending}
                              className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
              </tbody>
            </table>
          </div>

          {!isLoading && displayAlerts.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                No data yet.
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                Click refresh to run AI analysis.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

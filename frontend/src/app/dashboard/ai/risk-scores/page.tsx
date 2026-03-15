"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRiskScores, useRefreshRiskScores } from "@/hooks/useAI";
import { formatDate } from "@/lib/utils";
import type { AIRiskScore, RiskBand } from "@/types/ai";

type BandFilter = "all" | RiskBand;

const BAND_BADGE: Record<
  RiskBand,
  "destructive" | "pending" | "outline" | "active"
> = {
  critical: "destructive",
  high: "pending",
  medium: "outline",
  low: "active",
};

const BAND_FILTERS: { key: BandFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "critical", label: "Critical" },
];

function ProbabilityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 75
      ? "bg-red-500"
      : pct >= 50
      ? "bg-amber-500"
      : pct >= 25
      ? "bg-yellow-400"
      : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[12px] tabular-nums text-[var(--text-primary)]">
        {pct}%
      </span>
    </div>
  );
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

export default function RiskScoresPage() {
  const [bandFilter, setBandFilter] = useState<BandFilter>("all");
  const [banner, setBanner] = useState<string | null>(null);

  const apiParam = bandFilter !== "all" ? bandFilter : undefined;
  const { data, isLoading, error } = useRiskScores(apiParam);
  const refresh = useRefreshRiskScores();

  const scores: AIRiskScore[] = data?.results ?? [];

  const criticalCount = scores.filter((s) => s.risk_band === "critical").length;
  const highCount = scores.filter((s) => s.risk_band === "high").length;
  const avgProbability =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + s.probability, 0) / scores.length
      : 0;

  function handleRefresh() {
    setBanner(null);
    refresh.mutate(undefined, {
      onSuccess: (res) => setBanner(res.detail),
      onError: (err) => setBanner(`Error: ${err.message}`),
    });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
            <ShieldCheck size={18} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-[var(--text-primary)]">
              Default Risk Scores
            </h1>
            <p className="text-[12px] text-[var(--text-muted)]">
              AI-computed default probability scores across active lease contracts
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refresh.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {refresh.isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Refreshing…
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              Refresh Scores
            </>
          )}
        </button>
      </div>

      {/* Banner */}
      {banner && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${
            banner.startsWith("Error:")
              ? "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
              : "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
          }`}
        >
          {banner.startsWith("Error:") ? (
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
              banner.startsWith("Error:")
                ? "text-red-700 dark:text-red-400"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {banner}
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[90px] rounded-2xl" />
            ))
          : [
              { label: "Total Scored", value: data?.count ?? 0, danger: false },
              { label: "Critical Count", value: criticalCount, danger: criticalCount > 0 },
              { label: "High Count", value: highCount, danger: highCount > 0 },
              {
                label: "Avg Probability",
                value: `${(avgProbability * 100).toFixed(1)}%`,
                danger: false,
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <StatCard
                  label={stat.label}
                  value={stat.value}
                  danger={stat.danger}
                />
              </motion.div>
            ))}
      </div>

      {/* Table card */}
      <Card>
        {/* Filter buttons */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--border)] px-6 py-3.5">
          {BAND_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setBandFilter(f.key)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-150 ${
                bandFilter === f.key
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
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {[
                    "Contract",
                    "Asset",
                    "Lessee",
                    "Risk Band",
                    "Probability",
                    "Top Drivers",
                    "Scored At",
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
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <Skeleton className="h-4 w-full rounded-lg" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : scores.map((score, i) => (
                      <motion.tr
                        key={score.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-muted)]"
                      >
                        <td className="px-5 py-3.5 font-mono text-[12px] font-semibold text-[var(--text-primary)]">
                          {score.contract_number}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-[var(--text-primary)]">
                          {score.asset_name}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-[var(--text-muted)]">
                          {score.lessee_name}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={BAND_BADGE[score.risk_band]}>
                            {score.risk_band}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <ProbabilityBar value={score.probability} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {score.top_drivers.slice(0, 2).map((d, di) => (
                              <span
                                key={di}
                                className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]"
                                title={`Impact: ${d.impact.toFixed(2)} (${d.direction})`}
                              >
                                {d.factor}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-[var(--text-faint)]">
                          {formatDate(score.scored_at)}
                        </td>
                      </motion.tr>
                    ))}
              </tbody>
            </table>
          </div>

          {!isLoading && scores.length === 0 && (
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

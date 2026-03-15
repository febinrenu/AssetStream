"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMaintenancePredictions,
  useRefreshMaintenancePredictions,
} from "@/hooks/useAI";
import { getChartColors } from "@/lib/chart-colors";
import type { MaintenancePrediction, MaintenanceRiskLevel } from "@/types/ai";

type LevelFilter = "all" | MaintenanceRiskLevel;

const LEVEL_BADGE: Record<
  MaintenanceRiskLevel,
  "destructive" | "pending" | "outline" | "active"
> = {
  critical: "destructive",
  alert: "pending",
  watch: "outline",
  safe: "active",
};

const LEVEL_FILTERS: { key: LevelFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "safe", label: "Safe" },
  { key: "watch", label: "Watch" },
  { key: "alert", label: "Alert" },
  { key: "critical", label: "Critical" },
];

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

function barColorForProb(prob: number, isDark: boolean): string {
  if (prob >= 0.75) return isDark ? "#F87171" : "#DC2626";
  if (prob >= 0.5) return isDark ? "#FBBF24" : "#D97706";
  if (prob >= 0.25) return isDark ? "#60A5FA" : "#3B82F6";
  return isDark ? "#2DD4BF" : "#0D9488";
}

export default function MaintenancePredictionPage() {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [banner, setBanner] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const c = getChartColors(isDark);

  const apiParam = levelFilter !== "all" ? levelFilter : undefined;
  const { data, isLoading, error } = useMaintenancePredictions(apiParam);
  const refresh = useRefreshMaintenancePredictions();

  const predictions: MaintenancePrediction[] = data?.results ?? [];

  const criticalCount = data?.critical_count ?? 0;
  const highCount = predictions.filter((p) => p.risk_level === "alert").length;
  const avgFailureProb =
    predictions.length > 0
      ? predictions.reduce((sum, p) => sum + p.failure_probability, 0) /
        predictions.length
      : 0;

  // Top 8 for bar chart
  const chartData = [...predictions]
    .sort((a, b) => b.failure_probability - a.failure_probability)
    .slice(0, 8)
    .map((p) => ({
      name: p.asset_name.split(" ").slice(0, 2).join(" "),
      probability: Math.round(p.failure_probability * 100),
      raw: p.failure_probability,
    }));

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
            <Wrench size={18} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-[var(--text-primary)]">
              Maintenance Failure Prediction
            </h1>
            <p className="text-[12px] text-[var(--text-muted)]">
              AI-predicted equipment failure risks based on telemetry and usage patterns
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
              Refresh Predictions
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
              { label: "Total Assets", value: data?.count ?? 0, danger: false },
              {
                label: "Critical Count",
                value: criticalCount,
                danger: criticalCount > 0,
              },
              {
                label: "High Risk Count",
                value: highCount,
                danger: highCount > 0,
              },
              {
                label: "Avg Failure Prob",
                value: `${(avgFailureProb * 100).toFixed(1)}%`,
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

      {/* Bar chart: top 8 by failure probability */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-semibold">
            Failure Probability by Asset — Top 8
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-5 sm:px-4">
          {isLoading ? (
            <Skeleton className="h-56 rounded-xl" />
          ) : chartData.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-[13px] text-[var(--text-muted)]">
                No data yet. Click refresh to run AI analysis.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={c.border}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: c.text }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 10, fill: c.text }}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "Failure Probability"]}
                  contentStyle={{
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="probability" radius={[0, 6, 6, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={barColorForProb(entry.raw, isDark)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {/* Filter buttons */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--border)] px-6 py-3.5">
          {LEVEL_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setLevelFilter(f.key)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-150 ${
                levelFilter === f.key
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
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {[
                    "Asset",
                    "Category",
                    "Risk Level",
                    "Failure Prob",
                    "Days to Failure",
                    "Signals",
                    "Recommendation",
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
                  : predictions.map((pred, i) => {
                      const rec =
                        pred.recommendation.length > 80
                          ? pred.recommendation.slice(0, 80) + "…"
                          : pred.recommendation;
                      return (
                        <motion.tr
                          key={pred.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-muted)]"
                        >
                          <td className="px-5 py-3.5">
                            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                              {pred.asset_name}
                            </p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="rounded-lg bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-medium capitalize text-[var(--text-muted)]">
                              {pred.category.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={LEVEL_BADGE[pred.risk_level]}>
                              {pred.risk_level}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[13px] font-bold text-[var(--text-primary)]">
                            {(pred.failure_probability * 100).toFixed(1)}%
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[13px] text-[var(--text-muted)]">
                            {pred.days_to_predicted_failure !== null
                              ? `~${pred.days_to_predicted_failure} days`
                              : "Unknown"}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {pred.top_signals.slice(0, 2).map((sig, si) => (
                                <span
                                  key={si}
                                  className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]"
                                  title={`Value: ${sig.value}`}
                                >
                                  {sig.signal}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <p
                              className="text-[12px] text-[var(--text-muted)]"
                              title={pred.recommendation}
                            >
                              {rec}
                            </p>
                          </td>
                        </motion.tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {!isLoading && predictions.length === 0 && (
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

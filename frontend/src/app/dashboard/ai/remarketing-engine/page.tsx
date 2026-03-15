"use client";

import { Fragment, useState } from "react";
import { useTheme } from "next-themes";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useRemarketingRecommendations,
  useRefreshRemarketing,
  useRemarketingDetail,
} from "@/hooks/useAI";
import type { AIRemarketingRecommendation, RemarketingAction } from "@/types/ai";
import { formatCurrency } from "@/lib/utils";
import { getChartColors } from "@/lib/chart-colors";

type FilterAction = "all" | RemarketingAction;

const ACTION_BADGE: Record<RemarketingAction, "destructive" | "pending" | "active" | "outline"> = {
  sell_now: "destructive",
  refurbish: "pending",
  hold: "active",
  re_lease: "outline",
};

const ACTION_LABEL: Record<RemarketingAction, string> = {
  sell_now: "Sell Now",
  refurbish: "Refurbish",
  hold: "Hold",
  re_lease: "Re-Lease",
};

const FILTER_BUTTONS: { key: FilterAction; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hold", label: "Hold" },
  { key: "sell_now", label: "Sell Now" },
  { key: "refurbish", label: "Refurbish" },
  { key: "re_lease", label: "Re-Lease" },
];

function DetailPanel({
  assetId,
  onClose,
}: {
  assetId: number;
  onClose: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const c = getChartColors(isDark);
  const { data, isLoading } = useRemarketingDetail(assetId);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden"
    >
      <div className="mx-5 mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
        {isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : !data ? (
          <p className="text-[13px] text-[var(--text-muted)]">No detail data available.</p>
        ) : (
          <>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[14px] font-bold text-[var(--text-primary)]">{data.asset_name}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
                  {data.rationale}
                </p>
              </div>
              <button
                onClick={onClose}
                className="ml-4 rounded-lg p-1.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            </div>

            {data.final_rois && Object.keys(data.final_rois).length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {Object.entries(data.final_rois).map(([action, roi]) => (
                  <div
                    key={action}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-faint)]">
                      {ACTION_LABEL[action as RemarketingAction] ?? action}
                    </span>
                    <p
                      className={`font-mono text-[13px] font-bold ${roi >= 0 ? "text-[var(--success)]" : "text-[var(--destructive)]"}`}
                    >
                      {roi >= 0 ? "+" : ""}{Number(roi).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            )}

            {data.roi_curve && data.roi_curve.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={data.roi_curve}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 9, fill: c.text }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: c.text }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "Value"]}
                    contentStyle={{
                      background: c.surface,
                      border: `1px solid ${c.border}`,
                      borderRadius: 12,
                      fontSize: 11,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative_value"
                    stroke={c.accent}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function RemarketingEnginePage() {
  const [activeFilter, setActiveFilter] = useState<FilterAction>("all");
  const [expandedAssetId, setExpandedAssetId] = useState<number | null>(null);
  const [refreshBanner, setRefreshBanner] = useState<string | null>(null);

  const { data, isLoading } = useRemarketingRecommendations(
    activeFilter !== "all" ? activeFilter : undefined
  );
  const refreshMutation = useRefreshRemarketing();

  async function handleRefresh() {
    const result = await refreshMutation.mutateAsync();
    setRefreshBanner(
      result.detail ?? `Analyzed ${result.assets_analyzed} assets.`
    );
    setTimeout(() => setRefreshBanner(null), 5000);
  }

  const results = data?.results ?? [];
  const byAction = data?.by_action ?? {};
  const totalAssets = data?.count ?? 0;

  const actionStats = [
    { key: "sell_now" as RemarketingAction, label: "Sell Now" },
    { key: "hold" as RemarketingAction, label: "Hold" },
    { key: "refurbish" as RemarketingAction, label: "Refurbish" },
    { key: "re_lease" as RemarketingAction, label: "Re-Lease" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">
            Remarketing Decision Engine
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
            AI-powered recommendations for end-of-lease asset disposition
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshMutation.isPending}
          className="gap-2"
        >
          <RefreshCw size={13} className={refreshMutation.isPending ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Refresh Banner */}
      <AnimatePresence>
        {refreshBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-4 py-3 text-[13px] font-medium text-[var(--accent)]"
          >
            <TrendingUp size={14} />
            {refreshBanner}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] rounded-2xl" />
          ))
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-2 flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:col-span-1"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                <BarChart2 size={15} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                  Total Assets
                </p>
                <p className="mt-0.5 text-[20px] font-bold tabular-nums text-[var(--text-primary)]">
                  {totalAssets}
                </p>
              </div>
            </motion.div>
            {actionStats.map((s, i) => (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i + 1) * 0.07 }}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                    {s.label}
                  </p>
                  <p className="mt-0.5 text-[20px] font-bold tabular-nums text-[var(--text-primary)]">
                    {byAction[s.key] ?? 0}
                  </p>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {FILTER_BUTTONS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setActiveFilter(f.key);
              setExpandedAssetId(null);
            }}
            className={`rounded-xl border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
              activeFilter === f.key
                ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-faint)] hover:text-[var(--text-primary)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-semibold">Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 px-5 pb-5 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="py-14 text-center text-[13px] text-[var(--text-muted)]">
              No recommendations found for this filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {[
                      "Asset",
                      "Category",
                      "Recommendation",
                      "Sell Estimate",
                      "Refurb Cost",
                      "Net ROI 12m",
                      "Rationale",
                      "Details",
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
                  {results.map((rec, i) => (
                    <Fragment key={rec.id}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-muted)]"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                            {rec.asset_name}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-lg bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-medium capitalize text-[var(--text-muted)]">
                            {rec.category?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={ACTION_BADGE[rec.recommended_action]}>
                            {ACTION_LABEL[rec.recommended_action]}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[12px] text-[var(--text-primary)]">
                            {formatCurrency(rec.sell_price_estimate)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[12px] text-[var(--text-primary)]">
                            {formatCurrency(rec.refurbish_cost_estimate)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`font-mono text-[13px] font-bold ${
                              rec.net_roi_12m >= 0
                                ? "text-[var(--success)]"
                                : "text-[var(--destructive)]"
                            }`}
                          >
                            {rec.net_roi_12m >= 0 ? "+" : ""}{rec.net_roi_12m.toFixed(1)}%
                          </span>
                        </td>
                        <td className="max-w-[200px] px-5 py-3.5">
                          <p className="truncate text-[12px] text-[var(--text-muted)]">
                            {rec.rationale}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() =>
                              setExpandedAssetId(
                                expandedAssetId === rec.asset_id ? null : rec.asset_id
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          >
                            Details
                            {expandedAssetId === rec.asset_id ? (
                              <ChevronUp size={11} />
                            ) : (
                              <ChevronDown size={11} />
                            )}
                          </button>
                        </td>
                      </motion.tr>
                      <AnimatePresence>
                        {expandedAssetId === rec.asset_id && (
                          <tr
                            key={`detail-${rec.asset_id}`}
                            className="border-b border-[var(--border)]"
                          >
                            <td colSpan={8} className="p-0">
                              <DetailPanel
                                assetId={rec.asset_id}
                                onClose={() => setExpandedAssetId(null)}
                              />
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
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

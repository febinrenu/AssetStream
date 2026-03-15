"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { Activity, Brain, TrendingDown, TrendingUp, Triangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBatchValuations, useDepreciationForecast } from "@/hooks/useDashboard";
import { useUtilizationHeatmap, type HeatmapDay } from "@/hooks/useAssets";
import { formatCurrency } from "@/lib/utils";
import { getChartColors } from "@/lib/chart-colors";

const RECO_BADGE: Record<string, "active" | "pending" | "destructive"> = {
  success: "active",
  warning: "pending",
  danger: "destructive",
};

const RECO_LABEL: Record<string, string> = {
  success: "HOLD",
  warning: "REMARKET",
  danger: "CRITICAL",
};

export default function InsightsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const c = getChartColors(isDark);

  const { data: batch, isLoading: batchLoading } = useBatchValuations();
  const { data: forecast, isLoading: forecastLoading } = useDepreciationForecast();
  const { data: heatmap, isLoading: heatmapLoading } = useUtilizationHeatmap(84);

  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const riskData = (batch?.results || []).map((v) => ({
    name: v.asset_name.split(" ").slice(0, 2).join(" "),
    retention: Math.round(v.retention_ratio),
  }));

  // Build 12×7 grid: group days into weeks (Mon–Sun columns)
  const heatmapDays = heatmap?.days ?? [];
  const maxTotal = heatmap?.max_total ?? 1;

  // Pad to a full 12 weeks (84 days) aligned to weeks starting Monday
  const weeks: (HeatmapDay | null)[][] = [];
  if (heatmapDays.length > 0) {
    // Find the weekday of the first day (0=Mon, 6=Sun)
    const firstDate = new Date(heatmapDays[0].date);
    const firstDow = (firstDate.getDay() + 6) % 7; // JS getDay is 0=Sun
    const padded: (HeatmapDay | null)[] = [
      ...Array.from({ length: firstDow }, () => null),
      ...heatmapDays,
    ];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7).concat(Array(Math.max(0, 7 - (padded.length - i))).fill(null)));
    }
  }

  function intensityClass(total: number): string {
    if (total === 0) return isDark ? "bg-[#1e2433]" : "bg-[#eaf0f6]";
    const pct = total / maxTotal;
    if (pct < 0.25) return "bg-[#93c5fd]";
    if (pct < 0.55) return "bg-[#3b82f6]";
    if (pct < 0.8) return "bg-[#1d4ed8]";
    return "bg-[#1e3a8a]";
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {batchLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[90px] rounded-2xl" />)
          : [
              {
                label: "Portfolio Value",
                value: formatCurrency(batch?.total_portfolio_value ?? 0),
                icon: <TrendingUp size={15} />,
                color: "text-[var(--success)]",
                bg: "bg-[var(--success-subtle)]",
              },
              {
                label: "Avg Retention",
                value: `${(batch?.avg_retention_ratio ?? 0).toFixed(1)}%`,
                icon: <Brain size={15} />,
                color: "text-[var(--accent)]",
                bg: "bg-[var(--accent-subtle)]",
              },
              {
                label: "Assets Valuated",
                value: String(batch?.asset_count ?? 0),
                icon: <Triangle size={15} />,
                color: "text-[var(--info)]",
                bg: "bg-[var(--info-subtle)]",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">{stat.label}</p>
                  <p className="mt-0.5 text-[20px] font-bold tabular-nums text-[var(--text-primary)]">{stat.value}</p>
                </div>
              </motion.div>
            ))}
      </div>

      {/* Utilization Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-[var(--accent)]" />
            <CardTitle className="text-[13px] font-semibold">Asset Utilization Heatmap — Last 12 Weeks</CardTitle>
          </div>
          <p className="text-[11px] text-[var(--text-faint)]">Daily usage hours across all equipment categories. Darker = more active.</p>
        </CardHeader>
        <CardContent className="pb-5">
          {heatmapLoading ? (
            <Skeleton className="h-28 rounded-xl" />
          ) : weeks.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--text-muted)]">No utilization data yet</p>
          ) : (
            <div className="relative overflow-x-auto">
              {/* Day labels */}
              <div className="mb-1 flex">
                <div className="mr-1 w-7 shrink-0" />
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="flex-1 text-center text-[9px] font-medium text-[var(--text-faint)]">
                    {d}
                  </div>
                ))}
              </div>
              {/* Grid */}
              <div className="flex gap-1">
                {weeks.map((week, wi) => {
                  // Derive approximate month label from first non-null day
                  const firstDay = week.find((d) => d);
                  const monthLabel = firstDay
                    ? new Date(firstDay.date).toLocaleString("default", { month: "short" })
                    : "";
                  return (
                    <div key={wi} className="flex flex-1 flex-col gap-1">
                      <div className="mb-0.5 text-center text-[8px] font-medium text-[var(--text-faint)]">
                        {wi === 0 || (firstDay && new Date(firstDay.date).getDate() <= 7) ? monthLabel : ""}
                      </div>
                      {week.map((day, di) => (
                        <div
                          key={di}
                          className={`aspect-square w-full cursor-default rounded-[3px] transition-opacity hover:opacity-80 ${
                            day ? intensityClass(day.total) : "bg-transparent"
                          }`}
                          onMouseEnter={(e) => {
                            if (day) {
                              setHoveredDay(day);
                              setTooltipPos({ x: e.clientX, y: e.clientY });
                            }
                          }}
                          onMouseLeave={() => setHoveredDay(null)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--text-faint)]">
                <span>Less</span>
                {["bg-[#eaf0f6]", "bg-[#93c5fd]", "bg-[#3b82f6]", "bg-[#1d4ed8]", "bg-[#1e3a8a]"].map((cls) => (
                  <div key={cls} className={`h-3 w-3 rounded-[2px] ${cls}`} />
                ))}
                <span>More</span>
              </div>
              {/* Tooltip */}
              {hoveredDay && (
                <div
                  className="pointer-events-none fixed z-50 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-xl"
                  style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 40 }}
                >
                  <p className="text-[11px] font-semibold text-[var(--text-primary)]">{hoveredDay.date}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    Total: <span className="font-bold text-[var(--accent)]">{hoveredDay.total.toFixed(1)} hrs</span>
                  </p>
                  {(["heavy_equipment", "fleet", "medical", "industrial"] as const).map((cat) =>
                    hoveredDay[cat] > 0 ? (
                      <p key={cat} className="text-[10px] text-[var(--text-faint)] capitalize">
                        {cat.replace(/_/g, " ")}: {hoveredDay[cat].toFixed(1)} hrs
                      </p>
                    ) : null
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset Valuation Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-semibold">Asset Valuations &amp; AI Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {batchLoading ? (
            <div className="space-y-3 px-5 pb-5 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : (batch?.results || []).length === 0 ? (
            <p className="py-14 text-center text-[13px] text-[var(--text-muted)]">No valuations available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["Asset", "Category", "Resale Value", "Retention", "Recommendation"].map((col) => (
                      <th
                        key={col}
                        className={`px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)] ${
                          ["Resale Value", "Retention"].includes(col) ? "text-right" : "text-left"
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(batch?.results || []).map((v, i) => (
                    <motion.tr
                      key={v.asset_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-muted)]"
                    >
                      <td className="px-6 py-3.5">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{v.asset_name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--text-faint)]">{v.serial_number}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="rounded-lg bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-medium capitalize text-[var(--text-muted)]">
                          {v.category?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                          {formatCurrency(v.predicted_resale_value)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {v.retention_ratio >= 65 ? (
                            <TrendingUp size={12} className="text-[var(--success)]" />
                          ) : (
                            <TrendingDown size={12} className="text-[var(--destructive)]" />
                          )}
                          <span
                            className={`font-mono text-[13px] font-bold ${
                              v.retention_ratio >= 65
                                ? "text-[var(--success)]"
                                : v.retention_ratio >= 45
                                ? "text-[var(--warning)]"
                                : "text-[var(--destructive)]"
                            }`}
                          >
                            {v.retention_ratio.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge variant={RECO_BADGE[v.recommendation_color] ?? "pending"}>
                          {RECO_LABEL[v.recommendation_color] ?? "MONITOR"}
                        </Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Retention Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[13px] font-semibold">Portfolio Retention Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-5 sm:px-4">
            {batchLoading ? (
              <Skeleton className="h-56 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={riskData.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={false} />
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
                    width={100}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, "Retention"]}
                    contentStyle={{
                      background: c.surface,
                      border: `1px solid ${c.border}`,
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="retention" radius={[0, 6, 6, 0]} fill={c.accent} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 12-Month Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[13px] font-semibold">12-Month Value Forecast</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-5 sm:px-4">
            {forecastLoading ? (
              <Skeleton className="h-56 rounded-xl" />
            ) : !forecast || forecast.forecasts.length === 0 ? (
              <p className="py-12 text-center text-[13px] text-[var(--text-muted)]">No forecast data</p>
            ) : (
              (() => {
                const first = forecast.forecasts.slice(0, 3);
                const months = first[0]?.forecast.map((f) => f.label) || [];
                const chartData = months.map((label) => {
                  const row: Record<string, string | number> = { month: label };
                  first.forEach((f, idx) => {
                    const pt = f.forecast.find((p) => p.label === label);
                    row[`asset${idx}`] = pt?.value ?? 0;
                  });
                  return row;
                });
                const COLORS = [c.accent, "#f59e0b", "#8b5cf6"];
                return (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: c.text }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fontSize: 9, fill: c.text }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        formatter={(v: number, key: string) => {
                          const idx = parseInt(key.replace("asset", ""));
                          return [formatCurrency(v), first[idx]?.asset_name || `Asset ${idx + 1}`];
                        }}
                        contentStyle={{
                          background: c.surface,
                          border: `1px solid ${c.border}`,
                          borderRadius: 12,
                          fontSize: 11,
                        }}
                      />
                      {first.map((_, idx) => (
                        <Area
                          key={idx}
                          type="monotone"
                          dataKey={`asset${idx}`}
                          stroke={COLORS[idx]}
                          fill={`${COLORS[idx]}22`}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

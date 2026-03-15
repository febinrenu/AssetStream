"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Play,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRunSimulation } from "@/hooks/useAI";
import type { SimulationParams, SimulationResult } from "@/types/ai";
import { formatCurrency } from "@/lib/utils";
import { getChartColors } from "@/lib/chart-colors";

const MONTH_OPTIONS = [3, 6, 12, 18, 24];

const DEFAULT_PARAMS: SimulationParams = {
  utilization_change_pct: 0,
  monthly_rate_change_pct: 0,
  default_rate_override: 2,
  new_lease_count: 0,
  simulation_months: 12,
};

function estimateImpact(label: string, value: number): string | null {
  if (label === "Utilization Change (%)" && value !== 0) {
    const sign = value > 0 ? "+" : "";
    const impact = (value / 100) * 8500;
    return `Revenue impact: ~${sign}$${Math.round(impact).toLocaleString()}/mo`;
  }
  if (label === "Monthly Rate Change (%)" && value !== 0) {
    const sign = value > 0 ? "+" : "";
    const impact = (value / 100) * 12000;
    return `Rate impact: ~${sign}$${Math.round(impact).toLocaleString()}/mo`;
  }
  if (label === "New Leases" && value > 0) {
    const impact = value * 2800;
    return `New income: ~+$${Math.round(impact).toLocaleString()}/mo`;
  }
  if (label === "Default Rate Override (%)" && value > 5) {
    const loss = (value / 100) * 15000;
    return `Est. loss: ~-$${Math.round(loss).toLocaleString()}/mo`;
  }
  return null;
}

function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const hint = estimateImpact(label, value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-semibold text-[var(--text-muted)]">{label}</label>
        {hint && (
          <span
            className={`text-[10px] font-mono font-semibold transition-opacity ${
              hint.includes("-") ? "text-[var(--destructive)]" : "text-[var(--success)]"
            }`}
          >
            {hint}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-[var(--accent)]"
        />
        <div className="flex w-20 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
            className="w-full bg-transparent px-2 py-1.5 text-center font-mono text-[12px] text-[var(--text-primary)] focus:outline-none"
          />
          {unit && (
            <span className="pr-2 text-[11px] text-[var(--text-faint)]">{unit}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SimulatorPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const c = getChartColors(isDark);

  const [params, setParams] = useState<SimulationParams>({ ...DEFAULT_PARAMS });
  const [result, setResult] = useState<SimulationResult | null>(null);

  const simulationMutation = useRunSimulation();

  function setParam<K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRun() {
    const res = await simulationMutation.mutateAsync(params);
    setResult(res);
  }

  const summary = result?.summary;
  const monthly = result?.monthly ?? [];

  const baselineRevenue = summary?.baseline_12m_revenue ?? 0;
  const revenueAboveBaseline = summary ? summary.total_revenue > baselineRevenue : false;

  const summaryStats = summary
    ? [
        {
          label: "Total Revenue",
          value: formatCurrency(summary.total_revenue),
          icon: <DollarSign size={15} />,
          color: "text-[var(--success)]",
          bg: "bg-[var(--success-subtle)]",
          cardTint: revenueAboveBaseline ? "border-[var(--success)]/30 bg-[var(--success-subtle)]" : "",
        },
        {
          label: "Total Cashflow",
          value: formatCurrency(summary.total_cashflow),
          icon: <TrendingUp size={15} />,
          color: summary.total_cashflow >= 0 ? "text-[var(--accent)]" : "text-[var(--destructive)]",
          bg: summary.total_cashflow >= 0 ? "bg-[var(--accent-subtle)]" : "bg-[var(--destructive-subtle)]",
          cardTint: summary.total_cashflow >= 0
            ? "border-[var(--accent)]/30 bg-[var(--accent-subtle)]"
            : "border-[var(--destructive)]/30 bg-[var(--destructive-subtle)]",
        },
        {
          label: "Break-even Month",
          value: summary.break_even_month != null ? `Month ${summary.break_even_month}` : "N/A",
          icon: <Activity size={15} />,
          color: "text-[var(--info)]",
          bg: "bg-[var(--info-subtle)]",
          cardTint: "",
        },
        {
          label: "Delta vs Baseline",
          value: `${summary.delta_vs_baseline_pct >= 0 ? "+" : ""}${summary.delta_vs_baseline_pct.toFixed(1)}%`,
          icon:
            summary.delta_vs_baseline_pct >= 0 ? (
              <ArrowUpRight size={15} />
            ) : (
              <ArrowDownRight size={15} />
            ),
          color:
            summary.delta_vs_baseline_pct >= 0
              ? "text-[var(--success)]"
              : "text-[var(--destructive)]",
          bg:
            summary.delta_vs_baseline_pct >= 0
              ? "bg-[var(--success-subtle)]"
              : "bg-red-500/10",
          cardTint:
            summary.delta_vs_baseline_pct >= 0
              ? "border-[var(--success)]/30 bg-[var(--success-subtle)]"
              : "border-[var(--destructive)]/30 bg-[var(--destructive-subtle)]",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">Scenario Simulator</h1>
        <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
          Model &ldquo;what-if&rdquo; scenarios for revenue and cash flow
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Parameters Panel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-[var(--accent)]" />
              <CardTitle className="text-[13px] font-semibold">Simulation Parameters</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <NumberInput
              label="Utilization Change (%)"
              value={params.utilization_change_pct}
              min={-50}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => setParam("utilization_change_pct", v)}
            />
            <NumberInput
              label="Monthly Rate Change (%)"
              value={params.monthly_rate_change_pct}
              min={-30}
              max={50}
              step={0.5}
              unit="%"
              onChange={(v) => setParam("monthly_rate_change_pct", v)}
            />
            <NumberInput
              label="Default Rate Override (%)"
              value={params.default_rate_override}
              min={0}
              max={100}
              step={0.5}
              unit="%"
              onChange={(v) => setParam("default_rate_override", v)}
            />
            <NumberInput
              label="New Leases"
              value={params.new_lease_count}
              min={0}
              max={20}
              step={1}
              onChange={(v) => setParam("new_lease_count", v)}
            />

            {/* Simulation Period */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-[var(--text-muted)]">
                Simulation Period
              </label>
              <div className="flex flex-wrap gap-2">
                {MONTH_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setParam("simulation_months", m)}
                    className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      params.simulation_months === m
                        ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-faint)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleRun}
              disabled={simulationMutation.isPending}
              className="mt-2 w-full gap-2"
            >
              {simulationMutation.isPending ? (
                <>
                  <Activity size={14} className="animate-pulse" />
                  Running…
                </>
              ) : (
                <>
                  <Play size={14} />
                  Run Simulation
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="space-y-5">
          {simulationMutation.isPending ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[80px] rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-2xl" />
            </>
          ) : !result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
              <TrendingUp size={32} className="mb-3 text-[var(--text-faint)]" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                No simulation run yet
              </p>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                Configure parameters above and click Run Simulation
              </p>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-3">
                {summaryStats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 24 }}
                    className={`flex items-center gap-3 rounded-2xl border p-4 ${
                      stat.cardTint || "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}
                    >
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                        {stat.label}
                      </p>
                      <p
                        className={`mt-0.5 font-mono text-[15px] font-bold tabular-nums ${stat.color}`}
                      >
                        {stat.value}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[13px] font-semibold">
                    Revenue &amp; Cashflow Projection
                  </CardTitle>
                  <div className="flex items-center gap-4 pt-1">
                    {[
                      { color: "#0D9488", label: "Revenue" },
                      { color: "#f59e0b", label: "Cashflow" },
                      { color: "#8b5cf6", label: "Cumulative" },
                    ].map((l) => (
                      <div key={l.label} className="flex items-center gap-1.5">
                        <div
                          className="h-2 w-4 rounded-full"
                          style={{ background: l.color }}
                        />
                        <span className="text-[10px] font-medium text-[var(--text-faint)]">
                          {l.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="px-2 pb-5 sm:px-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart
                        data={monthly}
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
                          formatter={(v: number, key: string) => [
                            formatCurrency(v),
                            key.charAt(0).toUpperCase() + key.slice(1),
                          ]}
                          contentStyle={{
                            background: c.surface,
                            border: `1px solid ${c.border}`,
                            borderRadius: 12,
                            fontSize: 11,
                          }}
                        />
                        {summary?.baseline_12m_revenue != null && (
                          <ReferenceLine
                            y={summary.baseline_12m_revenue / 12}
                            stroke={c.border}
                            strokeDasharray="4 4"
                            label={{
                              value: "Baseline",
                              fontSize: 9,
                              fill: c.text,
                              position: "right",
                            }}
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#0D9488"
                          fill="#0D948822"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="cashflow"
                          stroke="#f59e0b"
                          fill="#f59e0b22"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="cumulative"
                          stroke="#8b5cf6"
                          fill="#8b5cf622"
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

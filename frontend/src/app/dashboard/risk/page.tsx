"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle, ShieldAlert, TrendingDown, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolioRisk } from "@/hooks/useRisk";
import { formatCurrency } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  heavy_equipment: "#0D9488",
  medical: "#0ea5e9",
  fleet: "#8b5cf6",
  industrial: "#f59e0b",
};

const RISK_COLORS = { under: "#f59e0b", normal: "#10b981", over: "#ef4444" };

function SignalBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/15 text-red-500 border-red-500/30",
    warning: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    info: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${map[severity] ?? map.info}`}>
      {severity === "critical" && <ShieldAlert size={9} />}
      {severity === "warning" && <AlertTriangle size={9} />}
      {severity}
    </span>
  );
}

function GaugeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function RiskPage() {
  const { data, isLoading } = usePortfolioRisk();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="px-5 py-5"><Skeleton className="h-24 w-full rounded-xl" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  const { default_risk, utilization_risk, concentration_risk, revenue_at_risk, early_warning_signals } = data;

  const catPieData = Object.entries(concentration_risk.by_category).map(([cat, pct]) => ({
    name: cat.replace("_", " "),
    value: pct,
    color: CATEGORY_COLORS[cat] ?? "#64748b",
  }));

  return (
    <div className="space-y-6">
      {/* Early Warning Banner */}
      {early_warning_signals.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={15} className="text-amber-400" />
            <p className="text-[13px] font-bold text-amber-400">Early Warning Signals</p>
          </div>
          {early_warning_signals.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <SignalBadge severity={s.severity} />
              <p className="text-[12px] text-[var(--text-muted)]">{s.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card className="group transition-shadow hover:shadow-[var(--card-shadow-hover)]">
          <CardContent className="px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)] mb-2">Default Rate</p>
            <p className={`font-mono text-[32px] font-extrabold ${default_risk.rate > 15 ? "text-red-400" : default_risk.rate > 5 ? "text-amber-400" : "text-emerald-400"}`}>
              {default_risk.rate}%
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">{default_risk.overdue_lessees} of {default_risk.total_lessees} lessees overdue</p>
            <GaugeBar value={default_risk.rate} max={30} color={default_risk.rate > 15 ? "#ef4444" : "#f59e0b"} />
          </CardContent>
        </Card>

        <Card className="group transition-shadow hover:shadow-[var(--card-shadow-hover)]">
          <CardContent className="px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)] mb-2">Overdue ARR</p>
            <p className="font-mono text-[28px] font-extrabold text-red-400">{formatCurrency(String(default_risk.overdue_amount))}</p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">Avg {default_risk.avg_days_overdue}d past due</p>
            <GaugeBar value={default_risk.overdue_amount} max={default_risk.overdue_amount * 3 || 10000} color="#ef4444" />
          </CardContent>
        </Card>

        <Card className="group transition-shadow hover:shadow-[var(--card-shadow-hover)]">
          <CardContent className="px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)] mb-2">Concentration HHI</p>
            <p className={`font-mono text-[28px] font-extrabold ${concentration_risk.hhi > 2500 ? "text-red-400" : concentration_risk.hhi > 1500 ? "text-amber-400" : "text-emerald-400"}`}>
              {concentration_risk.hhi.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">{concentration_risk.hhi_label} concentration</p>
            <GaugeBar value={concentration_risk.hhi} max={5000} color={concentration_risk.hhi > 2500 ? "#ef4444" : "#f59e0b"} />
          </CardContent>
        </Card>

        <Card className="group transition-shadow hover:shadow-[var(--card-shadow-hover)]">
          <CardContent className="px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)] mb-2">Revenue at Risk (90d)</p>
            <p className="font-mono text-[28px] font-extrabold text-amber-400">{formatCurrency(String(revenue_at_risk.expiring_90d_arr))}</p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">{revenue_at_risk.expiring_90d_count} leases expiring</p>
            <GaugeBar value={revenue_at_risk.expiring_90d_arr} max={revenue_at_risk.total_active_arr || 1} color="#f59e0b" />
          </CardContent>
        </Card>
      </div>

      {/* Concentration + Utilization */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Concentration Pie */}
        <Card>
          <CardContent className="px-5 py-5">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">ARR by Asset Category</p>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={catPieData} cx={65} cy={65} innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={2}>
                    {catPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {catPieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-[12px] capitalize text-[var(--text-muted)]">{d.name}</span>
                    <span className="font-mono text-[12px] font-bold text-[var(--text-primary)]">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Lessees */}
        <Card>
          <CardContent className="px-5 py-5">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">Top Lessee Exposure</p>
            <div className="space-y-3">
              {concentration_risk.top_lessees.map((l, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-[var(--text-primary)] truncate max-w-[150px]">{l.lessee}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-[var(--text-muted)]">{formatCurrency(String(l.monthly_arr))}/mo</span>
                      <span className={`text-[11px] font-bold ${l.share_pct > 30 ? "text-red-400" : "text-[var(--text-faint)]"}`}>{l.share_pct}%</span>
                    </div>
                  </div>
                  <GaugeBar value={l.share_pct} max={100} color={l.share_pct > 30 ? "#ef4444" : "#0D9488"} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Risk Table */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-[var(--border)] px-5 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Asset Utilization Risk
              {utilization_risk.under_utilized_count > 0 && (
                <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400">
                  {utilization_risk.under_utilized_count} under-utilized
                </span>
              )}
              {utilization_risk.over_utilized_count > 0 && (
                <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-red-400">
                  {utilization_risk.over_utilized_count} over-utilized
                </span>
              )}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Asset", "Category", "Hours (30d)", "Utilization", "Risk"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {utilization_risk.assets.map((a) => (
                  <tr key={a.asset_id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)] transition-colors">
                    <td className="px-5 py-3.5 text-[13px] font-medium text-[var(--text-primary)]">{a.asset_name}</td>
                    <td className="px-5 py-3.5 text-[12px] capitalize text-[var(--text-muted)]">{a.category.replace("_", " ")}</td>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-[var(--text-muted)]">{a.hours_30d}h</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <GaugeBar value={a.utilization_pct} max={150} color={RISK_COLORS[a.risk]} />
                        <span className="font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">{a.utilization_pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        a.risk === "under" ? "bg-amber-500/15 text-amber-400" :
                        a.risk === "over" ? "bg-red-500/15 text-red-400" :
                        "bg-emerald-500/15 text-emerald-400"
                      }`}>
                        {a.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Activity, AlertTriangle, Clock, DollarSign, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedCounter, AnimatedCurrency } from "@/components/ui/animated-counter";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getChartColors } from "@/lib/chart-colors";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

const TOOLTIP_STYLE = (c: ReturnType<typeof getChartColors>) => ({
  background: c.surface,
  border: `1px solid ${c.border}`,
  borderRadius: 14,
  fontSize: 12,
  color: c.text,
  boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
  padding: "10px 14px",
});

/* ─── KPI Card ─────────────────────────────────────────────── */
function KPICard({
  title, value, subtitle, icon: Icon, variant = "default",
}: {
  title: string; value: React.ReactNode; subtitle?: string;
  icon: React.ElementType; variant?: "default" | "danger";
}) {
  const isDanger = variant === "danger";
  return (
    <motion.div variants={fadeUp} className="h-full">
      <Card className="group h-full">
        <CardContent className="px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--text-faint)]">
                {title}
              </p>
              <p className={`font-mono text-[32px] font-extrabold leading-none tracking-tight ${isDanger ? "text-[var(--destructive)]" : "text-[var(--text-primary)]"}`}>
                {value}
              </p>
              {subtitle && <p className="mt-2 text-[12px] text-[var(--text-muted)]">{subtitle}</p>}
            </div>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110 ${isDanger ? "bg-[var(--destructive-subtle)]" : "bg-[var(--accent-subtle)]"}`}>
              <Icon size={22} className={isDanger ? "text-[var(--destructive)]" : "text-[var(--accent)]"} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Live Indicator ────────────────────────────────────────── */
function LiveDot() {
  return (
    <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-[var(--success)] animate-pulse-glow">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
      </span>
      Live
    </span>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const c = getChartColors(isDark);

  const { data: summary, isLoading } = useDashboardSummary();
  const { data: user } = useAuth();
  const isAdmin = useIsAdmin();

  const fleetStatusData = summary ? [
    { name: "Leased",      value: summary.fleet_status.leased },
    { name: "Available",   value: summary.fleet_status.available },
    { name: "Maintenance", value: summary.fleet_status.maintenance },
    { name: "Remarketed",  value: summary.fleet_status.remarketed },
  ] : [];

  // Format telemetry for chart (use last 30 days, show every 3rd label)
  const telemetryData = summary?.telemetry_30d ?? [];
  const chartData = telemetryData.map((d, i) => ({
    ...d,
    label: i % 5 === 0 ? d.date.slice(5) : "", // MM-DD every 5 days
  }));

  return (
    <div className="space-y-6">

      {/* ── Header Row ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[22px] font-extrabold text-[var(--text-primary)]">
            {isAdmin ? "Operations Overview" : `Welcome back${user?.first_name ? `, ${user.first_name}` : ""}`}
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
            {isAdmin ? "Real-time fleet & finance dashboard" : "Your lease portfolio at a glance"}
          </p>
        </div>
        <LiveDot />
      </div>

      {/* ── KPI Cards ── */}
      <motion.div variants={stagger} initial="hidden" animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-2xl" />)
        ) : isAdmin ? (
          // Admin view: full fleet KPIs
          <>
            <KPICard
              title="Active Leases"
              value={<AnimatedCounter value={summary?.active_leases_count ?? 0} />}
              subtitle={`${summary?.total_assets_count ?? 0} total assets in fleet`}
              icon={TrendingUp}
            />
            <KPICard
              title="Portfolio Revenue"
              value={<AnimatedCurrency value={summary?.monthly_revenue ?? 0} />}
              subtitle="Base + usage fees billed"
              icon={DollarSign}
            />
            <KPICard
              title="IoT Hours (30d)"
              value={<AnimatedCounter value={summary?.total_hours_30d ?? 0} />}
              subtitle="Hours logged across fleet"
              icon={Activity}
            />
            <KPICard
              title="Attention Required"
              value={<AnimatedCounter value={summary?.overdue_invoices_count ?? 0} />}
              subtitle="Overdue invoices"
              icon={AlertTriangle}
              variant={(summary?.overdue_invoices_count ?? 0) > 0 ? "danger" : "default"}
            />
          </>
        ) : (
          // Lessee view: personal lease KPIs
          <>
            <KPICard
              title="My Active Leases"
              value={<AnimatedCounter value={summary?.active_leases_count ?? 0} />}
              subtitle="Currently active contracts"
              icon={TrendingUp}
            />
            <KPICard
              title="Monthly Commitment"
              value={<AnimatedCurrency value={summary?.monthly_revenue ?? 0} />}
              subtitle="Total monthly lease fees"
              icon={DollarSign}
            />
            <KPICard
              title="Usage Hours (30d)"
              value={<AnimatedCounter value={summary?.total_hours_30d ?? 0} />}
              subtitle="Across all your assets"
              icon={Activity}
            />
            <KPICard
              title="Overdue Invoices"
              value={<AnimatedCounter value={summary?.overdue_invoices_count ?? 0} />}
              subtitle="Requires immediate attention"
              icon={AlertTriangle}
              variant={(summary?.overdue_invoices_count ?? 0) > 0 ? "danger" : "default"}
            />
          </>
        )}
      </motion.div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

        {/* Real Telemetry Area Chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>IoT Usage Telemetry — Last 30 Days</CardTitle>
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--accent-subtle)] px-2.5 py-1">
              <Zap size={11} className="text-[var(--accent)]" />
              <span className="text-[11px] font-semibold text-[var(--accent)]">Live data</span>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-5">
            {isLoading ? <Skeleton className="h-64 rounded-xl" /> : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <defs>
                      {c.series.map((color, i) => (
                        <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={color} stopOpacity={0.22} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: c.text }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: c.text }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE(c)} formatter={(v: number, name: string) => [`${v.toFixed(1)}h`, name.replace("_", " ")]} />
                    {(["heavy_equipment","medical","fleet","industrial"] as const).map((key, i) => (
                      <Area key={key} type="monotone" dataKey={key} stroke={c.series[i]} fill={`url(#grad${i})`} strokeWidth={2} dot={false} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-4 flex flex-wrap gap-5 px-1">
                  {[["Heavy Equipment","heavy_equipment"],["Medical","medical"],["Fleet","fleet"],["Industrial","industrial"]].map(([label], i) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: c.series[i] }} />
                      <span className="text-[11px] font-medium text-[var(--text-muted)]">{label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Fleet Status Pie */}
        <Card>
          <CardHeader><CardTitle>Fleet Status</CardTitle></CardHeader>
          <CardContent className="px-4 pb-5">
            {isLoading ? <Skeleton className="h-52 rounded-xl" /> : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={fleetStatusData} innerRadius={54} outerRadius={80} paddingAngle={4}
                      dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                      {fleetStatusData.map((_, i) => <Cell key={i} fill={c.series[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE(c)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
                  {fleetStatusData.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.series[i] }} />
                      <span className="text-[12px] text-[var(--text-muted)]">
                        {s.name}
                        <span className="ml-1.5 font-mono font-bold text-[var(--text-primary)]">{s.value}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Lists ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        {/* Recent Invoices */}
        <Card>
          <CardHeader><CardTitle>Recent Invoices</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 px-6 pb-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : (summary?.recent_invoices ?? []).length === 0 ? (
              <p className="py-14 text-center text-[13px] text-[var(--text-muted)]">No invoices yet</p>
            ) : (
              <div>
                {(summary?.recent_invoices ?? []).map((inv, i, arr) => (
                  <div key={inv.id} className={`flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-[var(--surface-muted)] sm:flex-row sm:items-center sm:justify-between ${i < arr.length - 1 ? "border-b border-[var(--border)]" : "pb-6"}`}>
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">{inv.invoice_number}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-faint)]">{formatDate(inv.billing_period_end)}</p>
                    </div>
                    <div className="flex items-center gap-3 sm:justify-end">
                      <span className="font-mono text-[14px] font-bold text-[var(--text-primary)]">{formatCurrency(inv.total_amount)}</span>
                      <Badge variant={inv.status as "paid"|"issued"|"overdue"|"draft"}>{inv.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Lease Expirations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Upcoming Lease Expirations</CardTitle>
            <Clock size={15} className="text-[var(--text-faint)]" />
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 px-6 pb-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : (summary?.upcoming_expirations ?? []).length === 0 ? (
              <p className="py-14 text-center text-[13px] text-[var(--text-muted)]">No active leases</p>
            ) : (
              <div>
                {(summary?.upcoming_expirations ?? []).map((exp, i, arr) => (
                  <div key={exp.id} className={`flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-[var(--surface-muted)] ${i < arr.length - 1 ? "border-b border-[var(--border)]" : "pb-6"}`}>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{exp.asset_name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--text-faint)]">{exp.lessee_company}</p>
                    </div>
                    <div className={`shrink-0 rounded-lg px-3 py-1.5 font-mono text-[13px] font-bold tabular-nums ${exp.days_left < 30 ? "bg-[var(--destructive-subtle)] text-[var(--destructive)]" : exp.days_left < 60 ? "bg-[var(--warning-subtle)] text-[var(--warning)]" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}>
                      {exp.days_left}d left
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

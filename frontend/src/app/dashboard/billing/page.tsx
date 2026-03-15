"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { RefreshCw, TrendingUp, Zap } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useLeases } from "@/hooks/useLeases";
import { useTriggerBilling, useTriggerIoT } from "@/hooks/useNotifications";
import { useIsAdmin } from "@/hooks/useAuth";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency } from "@/lib/utils";
import { getChartColors } from "@/lib/chart-colors";
import { toast } from "@/lib/toast";
import {
  Bar,
  BarChart,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function BillingPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const c = getChartColors(isDark);
  const isAdmin = useIsAdmin();
  const [confirmTrigger, setConfirmTrigger] = useState<"billing" | "iot" | null>(null);

  const { data: invoicesData, isLoading } = useInvoices();
  const { data: leasesData } = useLeases({ status: "active" });
  const { data: summary } = useDashboardSummary();
  const triggerBilling = useTriggerBilling();
  const triggerIoT = useTriggerIoT();

  const invoices = invoicesData?.results || [];
  const activeLeases = leasesData?.results || [];

  const totalBilled = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);
  const totalCollected = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

  const monthlyData = invoices.reduce<Record<string, number>>((acc, inv) => {
    const month = inv.billing_period_end.slice(0, 7);
    acc[month] = (acc[month] || 0) + parseFloat(inv.total_amount);
    return acc;
  }, {});

  const chartData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month: month.slice(5), total }));

  // Revenue forecast: historical + projected
  const projectedMonthlyRevenue = activeLeases.reduce(
    (sum, l) => sum + parseFloat(l.monthly_base_fee), 0
  );
  const historicalForecast = (summary?.monthly_revenue_breakdown ?? [])
    .slice(-6)
    .map((h) => ({ month: h.month.slice(5), actual: h.revenue, forecast: null as number | null }));
  const today = new Date();
  const projectedForecast = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i + 1, 1);
    return {
      month: `${String(d.getMonth() + 1).padStart(2, "0")}`,
      actual: null as number | null,
      forecast: Math.round(projectedMonthlyRevenue * Math.pow(1.02, i)),
    };
  });
  const forecastData = [...historicalForecast, ...projectedForecast];

  return (
    <div className="space-y-6">
      {/* Admin controls */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setConfirmTrigger("billing")}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[12px] font-semibold text-[var(--text-muted)] transition-all hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
          >
            <RefreshCw size={13} />
            Trigger Billing Cycle
          </button>
          <button
            onClick={() => setConfirmTrigger("iot")}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[12px] font-semibold text-[var(--text-muted)] transition-all hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
          >
            <Zap size={13} />
            Trigger IoT Ping
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Total Billed", value: formatCurrency(totalBilled) },
          { label: "Total Collected", value: formatCurrency(totalCollected) },
          { label: "Collection Rate", value: `${collectionRate.toFixed(1)}%` },
        ].map((s) => (
          <Card key={s.label} className="group transition-shadow duration-200 hover:shadow-[var(--card-shadow-hover)]">
            <CardContent className="px-6 py-5">
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">{s.label}</p>
              <p className="font-mono text-[28px] font-extrabold tracking-tight text-[var(--text-primary)]">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[13px] font-semibold">Monthly Billing Volume</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-5 sm:px-4">
          {isLoading ? (
            <Skeleton className="h-56 rounded-xl" />
          ) : chartData.length === 0 ? (
            <div className="flex h-56 items-center justify-center">
              <p className="text-[13px] text-[var(--text-muted)]">No billing data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: c.text }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: c.text }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), "Billed"]}
                  contentStyle={{
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  }}
                  labelStyle={{ color: c.text }}
                />
                <Bar dataKey="total" fill={c.accent} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Revenue Forecast */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-[13px] font-semibold">Revenue Forecast — Next 6 Months</CardTitle>
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--accent-subtle)] px-2.5 py-1">
            <TrendingUp size={11} className="text-[var(--accent)]" />
            <span className="text-[11px] font-semibold text-[var(--accent)]">Projected</span>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-5 sm:px-4">
          {activeLeases.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-[var(--text-muted)]">No active leases to project</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={forecastData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: c.text }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: c.text }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatCurrency(v), name === "actual" ? "Actual" : "Forecast"]}
                    contentStyle={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                    labelStyle={{ color: c.text }}
                  />
                  {historicalForecast.length > 0 && (
                    <ReferenceLine
                      x={historicalForecast[historicalForecast.length - 1]?.month}
                      stroke={c.border}
                      strokeDasharray="5 3"
                      label={{ value: "Now", fill: c.text, fontSize: 10, position: "insideTopRight" }}
                    />
                  )}
                  <Bar dataKey="actual" fill={c.series[0]} radius={[5, 5, 0, 0]} />
                  <Bar dataKey="forecast" fill={c.series[2]} opacity={0.65} radius={[5, 5, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: c.series[0] }} />
                  <span className="text-[11px] text-[var(--text-muted)]">Historical</span>
                </div>
                <div className="flex items-center gap-2 opacity-65">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: c.series[2] }} />
                  <span className="text-[11px] text-[var(--text-muted)]">Projected</span>
                </div>
              </div>
              <p className="mt-1.5 text-center text-[11px] text-[var(--text-faint)]">
                {activeLeases.length} active lease{activeLeases.length !== 1 ? "s" : ""} · {formatCurrency(projectedMonthlyRevenue)}/mo base · 2% monthly growth assumed
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmTrigger === "billing"}
        onOpenChange={(open) => !open && setConfirmTrigger(null)}
        title="Trigger Billing Cycle"
        description="This will generate invoices for all active leases for the current billing period. This simulates the monthly billing run."
        confirmLabel="Run Billing"
        loading={triggerBilling.isPending}
        onConfirm={() =>
          triggerBilling.mutate(undefined, {
            onSuccess: (data) => {
              const d = data as { invoices_generated?: number; invoices_skipped?: number };
              toast.success(
                "Billing cycle complete",
                `${d.invoices_generated ?? 0} invoice(s) generated, ${d.invoices_skipped ?? 0} already existed.`
              );
              setConfirmTrigger(null);
            },
            onError: () => {
              toast.error("Billing cycle failed", "Please try again.");
              setConfirmTrigger(null);
            },
          })
        }
      />
      <ConfirmDialog
        open={confirmTrigger === "iot"}
        onOpenChange={(open) => !open && setConfirmTrigger(null)}
        title="Trigger IoT Ping"
        description="This will simulate an IoT usage ping for all actively leased assets, logging usage hours, engine temp, and fuel levels."
        confirmLabel="Run IoT Ping"
        loading={triggerIoT.isPending}
        onConfirm={() =>
          triggerIoT.mutate(undefined, {
            onSuccess: (data) => {
              const d = data as { assets_pinged?: number };
              toast.success(
                "IoT ping complete",
                `Telemetry logged for ${d.assets_pinged ?? 0} active asset(s).`
              );
              setConfirmTrigger(null);
            },
            onError: () => {
              toast.error("IoT ping failed", "Please try again.");
              setConfirmTrigger(null);
            },
          })
        }
      />
    </div>
  );
}

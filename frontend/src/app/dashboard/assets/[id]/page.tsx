"use client";

import { useState, useEffect, useRef, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { ArrowLeft, Brain, CheckCircle2, Clock, Droplets, MapPin, RefreshCw, Thermometer, Wrench } from "lucide-react";
import Link from "next/link";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedCurrency } from "@/components/ui/animated-counter";
import { useAsset, useAssetHealth, useAssetUsageLogs, useMaintenanceLogs, useLogMaintenance, useResolveMaintenance } from "@/hooks/useAssets";
import { useLeases } from "@/hooks/useLeases";
import { useIsAdmin } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getChartColors } from "@/lib/chart-colors";
import { toast } from "@/lib/toast";
import api from "@/lib/axios";
import type { ValuationResult } from "@/types";

const TABS = ["Overview", "Telemetry", "AI Valuation", "Lease History", "Maintenance"] as const;

type SensorStatus = "green" | "amber" | "red";

function getSensorStatus(label: string, value: number): SensorStatus {
  if (label === "Engine Temp") {
    if (value > 88) return "red";
    if (value > 82) return "amber";
    return "green";
  }
  if (label === "Fuel Level") {
    if (value < 20) return "red";
    if (value < 40) return "amber";
    return "green";
  }
  return "green";
}

const STATUS_COLORS: Record<SensorStatus, { bar: string; text: string; icon: string; iconBg: string }> = {
  green: {
    bar: "bg-[var(--success)]",
    text: "text-[var(--text-primary)]",
    icon: "text-[var(--accent)]",
    iconBg: "bg-[var(--accent-subtle)]",
  },
  amber: {
    bar: "bg-[var(--warning)]",
    text: "text-[var(--warning)]",
    icon: "text-[var(--warning)]",
    iconBg: "bg-[var(--warning-subtle)]",
  },
  red: {
    bar: "bg-[var(--destructive)]",
    text: "text-[var(--destructive)]",
    icon: "text-[var(--destructive)]",
    iconBg: "bg-[var(--destructive-subtle)]",
  },
};

function SensorCard({
  icon: Icon,
  label,
  value,
  unit,
  progress,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  unit: string;
  progress?: number;
  danger?: boolean;
}) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      // Animate from 0 to target on mount
      const timer = setTimeout(() => {
        setAnimatedWidth(progress !== undefined ? Math.min(100, progress) : 0);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setAnimatedWidth(progress !== undefined ? Math.min(100, progress) : 0);
    }
  }, [progress]);

  const status = getSensorStatus(label, value);
  const colors = STATUS_COLORS[status];
  const isHighTemp = label === "Engine Temp" && value > 88;

  return (
    <div
      className={`rounded-2xl border bg-[var(--surface-muted)] p-4 transition-all ${
        isHighTemp
          ? "border-[var(--destructive)] sensor-danger-glow"
          : "border-[var(--border)]"
      }`}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colors.iconBg}`}>
          <Icon size={13} className={colors.icon} />
        </div>
        <span className="text-[12px] font-medium text-[var(--text-muted)]">{label}</span>
      </div>
      <p className={`font-mono text-[26px] font-extrabold leading-none ${colors.text}`}>
        {value.toFixed(1)}
        <span className="ml-1 text-[11px] font-normal text-[var(--text-faint)]">{unit}</span>
      </p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className={`h-full rounded-full ${colors.bar}`}
            style={{
              width: `${animatedWidth}%`,
              transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        </div>
      )}
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] py-3 last:border-0">
      <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
      <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function OverviewTab({ assetId }: { assetId: number }) {
  const { data: asset } = useAsset(assetId);
  const { data: health, isLoading } = useAssetHealth(assetId);
  const { data: leases } = useLeases({ asset: String(assetId), status: "active" });
  const activeLease = leases?.results?.[0];

  const latest = health?.latest;
  const engineTemp = latest?.engine_temp_celsius ?? 0;
  const fuelLevel = latest?.fuel_level_percent ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-[13px] font-semibold">Asset Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            {asset ? (
              <>
                <SpecRow label="Manufacture Year" value={asset.manufacture_year} />
                <SpecRow label="Base Monthly Rate" value={formatCurrency(asset.base_monthly_rate)} />
                <SpecRow label="Per Hour Rate" value={formatCurrency(asset.per_hour_rate)} />
                <SpecRow label="Total Hours Logged" value={`${asset.total_hours_logged.toFixed(1)}h`} />
              </>
            ) : (
              <Skeleton className="h-32" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13px] font-semibold">{activeLease ? "Current Lease" : "Lease Status"}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeLease ? (
              <>
                <SpecRow label="Contract #" value={activeLease.contract_number} />
                <SpecRow label="Lessee" value={activeLease.lessee_detail?.company_name || activeLease.lessee_detail?.username || "-"} />
                <SpecRow label="Start Date" value={formatDate(activeLease.start_date)} />
                <SpecRow label="End Date" value={formatDate(activeLease.end_date)} />
              </>
            ) : (
              <div className="flex h-24 items-center justify-center text-sm text-[var(--text-muted)]">No active lease</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-[13px] font-semibold">Live Sensor Data</CardTitle>
            {latest && <span className="text-xs text-[var(--text-muted)]">Last ping: {new Date(latest.timestamp).toLocaleTimeString()}</span>}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : !latest ? (
            <p className="py-4 text-sm text-[var(--text-muted)]">No sensor data available</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SensorCard icon={Thermometer} label="Engine Temp" value={engineTemp} unit="C" progress={engineTemp} danger={engineTemp > 88} />
              <SensorCard icon={Droplets} label="Fuel Level" value={fuelLevel} unit="%" progress={fuelLevel} danger={fuelLevel < 20} />
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-subtle)]">
                    <MapPin size={13} className="text-[var(--accent)]" />
                  </div>
                  <span className="text-[12px] font-medium text-[var(--text-muted)]">GPS Location</span>
                </div>
                <p className="font-mono text-[14px] font-semibold leading-snug text-[var(--text-primary)]">{latest.latitude.toFixed(4)}N</p>
                <p className="font-mono text-[14px] font-semibold text-[var(--text-primary)]">{Math.abs(latest.longitude).toFixed(4)}W</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-subtle)]">
                    <Clock size={13} className="text-[var(--accent)]" />
                  </div>
                  <span className="text-[12px] font-medium text-[var(--text-muted)]">30d Hours</span>
                </div>
                <p className="font-mono text-[26px] font-extrabold leading-none text-[var(--text-primary)]">
                  {health?.stats_30d.total_hours?.toFixed(0) || 0}
                  <span className="ml-1 text-[11px] font-normal text-[var(--text-faint)]">h</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TelemetryTab({ assetId }: { assetId: number }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const c = getChartColors(isDark);
  const { data: logsData, isLoading } = useAssetUsageLogs(assetId);
  const logs = logsData?.results || [];

  const chartData = logs
    .slice(0, 30)
    .reverse()
    .map((log, i) => ({ idx: i + 1, hours: log.hours_used, temp: log.engine_temp_celsius }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-[13px] font-semibold">Daily Hours Usage</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 sm:px-4">
            {isLoading ? (
              <Skeleton className="h-48 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <XAxis dataKey="idx" tick={{ fontSize: 10, fill: c.text }} tickLine={false} axisLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: c.text }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, fontSize: 11, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} />
                  <Line type="monotone" dataKey="hours" stroke={c.accent} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13px] font-semibold">Engine Temperature Trend</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 sm:px-4">
            {isLoading ? (
              <Skeleton className="h-48 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <XAxis dataKey="idx" tick={{ fontSize: 10, fill: c.text }} tickLine={false} axisLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: c.text }} tickLine={false} axisLine={false} domain={[50, 100]} />
                  <Tooltip contentStyle={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, fontSize: 11, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} />
                  <Line type="monotone" dataKey="temp" stroke={c.amber} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="text-[13px] font-semibold">Recent Usage Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Timestamp", "Hours Used", "Engine Temp", "Fuel Level", "Coordinates"].map((col) => (
                    <th key={col} className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  : logs.slice(0, 20).map((log) => (
                      <tr key={log.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-muted)] last:border-0">
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-primary)]">{log.hours_used.toFixed(2)}h</td>
                        <td className={`px-4 py-3 font-mono text-xs ${log.engine_temp_celsius > 90 ? "text-[var(--destructive)]" : "text-[var(--text-primary)]"}`}>
                          {log.engine_temp_celsius.toFixed(1)}C
                        </td>
                        <td className={`px-4 py-3 font-mono text-xs ${log.fuel_level_percent < 20 ? "text-[var(--warning)]" : "text-[var(--text-primary)]"}`}>
                          {log.fuel_level_percent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}</td>
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

function AIValuationTab({ assetId }: { assetId: number }) {
  const queryClient = useQueryClient();
  const { data: valuation, isLoading } = useQuery<ValuationResult>({
    queryKey: ["valuation", assetId],
    queryFn: async () => {
      const { data } = await api.post("/remarketing/valuate/", { asset_id: assetId });
      return data;
    },
  });

  const recalculate = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/remarketing/valuate/", { asset_id: assetId });
      return data as ValuationResult;
    },
    onSuccess: (data) => queryClient.setQueryData(["valuation", assetId], data),
  });

  if (isLoading) return <Skeleton className="h-80 rounded-xl" />;

  const rec = valuation?.recommendation;
  const recVariant = rec === "REMARKET NOW" ? "destructive" : rec === "HOLD 6 MONTHS" ? "warning" : "active";

  const originalValue = valuation?.original_value || 0;
  const predictedValue = valuation?.predicted_resale_value || 0;
  const retentionPct = originalValue > 0 ? (predictedValue / originalValue) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">Estimated Resale Value</p>
              <div className="mb-1 font-mono text-4xl font-extrabold leading-none text-[var(--text-primary)]">
                {valuation ? (
                  <AnimatedCurrency value={predictedValue} className="font-mono text-4xl font-extrabold leading-none text-[var(--text-primary)]" />
                ) : "-"}
              </div>
              {valuation && (
                <div className="mt-2">
                  <p className="mb-1.5 text-[11px] font-medium text-[var(--text-faint)]">Confidence Range</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">
                      {formatCurrency(valuation.confidence_low)}
                    </span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                      {/* Full confidence range background */}
                      <div
                        className="absolute h-full rounded-full bg-[var(--accent)]/20"
                        style={{
                          left: `${originalValue > 0 ? (valuation.confidence_low / originalValue) * 100 : 0}%`,
                          right: `${originalValue > 0 ? Math.max(0, 100 - (valuation.confidence_high / originalValue) * 100) : 0}%`,
                        }}
                      />
                      {/* Predicted value marker */}
                      <div
                        className="absolute top-0 h-full w-1 rounded-full bg-[var(--accent)]"
                        style={{
                          left: `${originalValue > 0 ? Math.min(100, (predictedValue / originalValue) * 100) : 50}%`,
                          transform: "translateX(-50%)",
                        }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">
                      {formatCurrency(valuation.confidence_high)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
              {rec && <Badge variant={recVariant as "destructive" | "warning" | "active"}>{rec}</Badge>}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => recalculate.mutate()} disabled={recalculate.isPending}>
                <RefreshCw size={12} className={recalculate.isPending ? "animate-spin" : ""} />
                Recalculate
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
              <span>Original Value | {formatCurrency(originalValue)}</span>
              <div className="flex items-center gap-2">
                {/* Circular progress indicator */}
                <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
                  <circle cx="14" cy="14" r="11" fill="none" stroke="var(--border)" strokeWidth="3" />
                  <circle
                    cx="14"
                    cy="14"
                    r="11"
                    fill="none"
                    stroke={retentionPct >= 70 ? "var(--success)" : retentionPct >= 40 ? "var(--warning)" : "var(--destructive)"}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(retentionPct / 100) * 69.115} 69.115`}
                    transform="rotate(-90 14 14)"
                    style={{ transition: "stroke-dasharray 1s ease-out" }}
                  />
                </svg>
                <span
                  className={`font-mono text-[13px] font-bold ${
                    retentionPct >= 70 ? "text-[var(--success)]" : retentionPct >= 40 ? "text-[var(--warning)]" : "text-[var(--destructive)]"
                  }`}
                >
                  {retentionPct.toFixed(1)}%
                </span>
                <span className="text-[var(--text-faint)]">retained</span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${retentionPct}%`,
                  backgroundColor: retentionPct >= 70 ? "var(--success)" : retentionPct >= 40 ? "var(--warning)" : "var(--destructive)",
                  transition: "width 1s ease-out, background-color 0.3s ease",
                }}
              />
            </div>
          </div>

          {valuation && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Asset Age", value: `${valuation.asset_age_years} yrs` },
                { label: "Total Hours", value: `${valuation.total_hours.toFixed(0)}h` },
                { label: "Maint. Events", value: String(valuation.maintenance_events) },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="mb-1.5 text-[11px] font-medium text-[var(--text-faint)]">{item.label}</p>
                  <p className="font-mono text-xl font-extrabold text-[var(--text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LeaseHistoryTab({ assetId }: { assetId: number }) {
  const { data: leases, isLoading } = useLeases({ asset: String(assetId) });
  const allLeases = leases?.results || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Lease History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48" />
        ) : allLeases.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">No lease history for this asset</p>
        ) : (
          <div className="relative">
            <div className="absolute bottom-0 left-4 top-0 w-px bg-[var(--border)]" />
            <div className="space-y-4 pl-10">
              {allLeases.map((lease) => (
                <div key={lease.id} className="relative">
                  <div className="absolute -left-6 top-2.5 h-3 w-3 rounded-full bg-[var(--accent)] ring-[3px] ring-[var(--surface)]" />
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <div className="mb-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">{lease.contract_number}</p>
                      <Badge variant={lease.status as "active" | "completed" | "pending" | "defaulted"}>{lease.status}</Badge>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {lease.lessee_detail?.company_name || "-"} | {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{formatCurrency(lease.monthly_base_fee)}/mo</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const PRIORITY_COLOR: Record<string, string> = {
  low: "text-[var(--accent)]",
  medium: "text-[var(--warning)]",
  high: "text-[var(--destructive)]",
  critical: "text-[var(--destructive)] font-extrabold",
};

function MaintenanceTab({ assetId }: { assetId: number }) {
  const isAdmin = useIsAdmin();
  const { data, isLoading } = useMaintenanceLogs(assetId);
  const logMaintenance = useLogMaintenance();
  const resolveMaintenance = useResolveMaintenance();
  const logs = data?.results || [];

  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");

  function handleLog() {
    if (!notes.trim()) {
      toast.error("Notes required", "Describe the maintenance issue.");
      return;
    }
    logMaintenance.mutate(
      { assetId, notes, priority },
      {
        onSuccess: () => {
          toast.success("Maintenance logged", "Asset status set to maintenance.");
          setNotes("");
        },
        onError: () => toast.error("Failed", "Could not log maintenance."),
      }
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[13px] font-semibold">Log Maintenance Issue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="maint-notes" className="mb-1.5 block text-[12px] font-semibold">Notes</Label>
              <Input
                id="maint-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the issue or maintenance required"
              />
            </div>
            <div>
              <Label className="mb-2 block text-[12px] font-semibold">Priority</Label>
              <div className="flex gap-2">
                {["low", "medium", "high", "critical"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-bold capitalize transition-all ${
                      priority === p
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleLog} disabled={logMaintenance.isPending} className="w-full">
              {logMaintenance.isPending ? "Logging…" : "Log Issue & Set to Maintenance"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-[13px] font-semibold">Maintenance History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
                <Wrench size={24} className="text-[var(--text-faint)]" />
              </div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">No maintenance records</p>
              <p className="text-[12px] text-[var(--text-muted)]">This asset has never been logged for maintenance.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${PRIORITY_COLOR[log.priority]}`}>{log.priority}</span>
                      {log.resolved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-subtle,#dcfce7)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success,#16a34a)]">
                          <CheckCircle2 size={10} /> Resolved
                        </span>
                      ) : (
                        <span className="rounded-full bg-[var(--warning-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]">Open</span>
                      )}
                    </div>
                    <p className="text-[13px] text-[var(--text-primary)]">{log.notes}</p>
                    <p className="mt-1 text-[11px] text-[var(--text-faint)]">
                      Logged by {log.logged_by_username} · {formatDate(log.start_date)}
                      {log.resolved_date && ` · Resolved ${formatDate(log.resolved_date)}`}
                    </p>
                  </div>
                  {isAdmin && !log.resolved && (
                    <button
                      onClick={() => resolveMaintenance.mutate({ assetId, logId: log.id }, {
                        onSuccess: () => toast.success("Resolved", "Maintenance issue marked as resolved."),
                        onError: () => toast.error("Failed", "Could not resolve issue."),
                      })}
                      className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const assetId = parseInt(id, 10);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");
  const { data: asset, isLoading } = useAsset(assetId);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <Link href="/dashboard/assets" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">
          <ArrowLeft size={14} />
          Back to Assets
        </Link>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : asset ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[var(--text-primary)]">{asset.name}</h1>
                <Badge variant={asset.status as "available" | "leased" | "maintenance" | "remarketed"}>{asset.status}</Badge>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                <span className="font-mono">{asset.serial_number}</span> | {asset.category.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto border-b border-[var(--border)]">
        <div className="flex min-w-max gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 px-5 py-2.5 text-[13px] font-semibold transition-colors ${
                activeTab === tab
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab === "AI Valuation" && <Brain size={13} />}
              {tab === "Maintenance" && <Wrench size={13} />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "Overview" && <OverviewTab assetId={assetId} />}
      {activeTab === "Telemetry" && <TelemetryTab assetId={assetId} />}
      {activeTab === "AI Valuation" && <AIValuationTab assetId={assetId} />}
      {activeTab === "Lease History" && <LeaseHistoryTab assetId={assetId} />}
      {activeTab === "Maintenance" && <MaintenanceTab assetId={assetId} />}
    </div>
  );
}

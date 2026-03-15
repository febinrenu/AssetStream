"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStructureLease } from "@/hooks/useAI";
import api from "@/lib/axios";
import { formatCurrency } from "@/lib/utils";
import type { LeaseCopilotResult } from "@/types/ai";
import type { Asset, User, PaginatedResponse } from "@/types";

const RISK_APPETITES = ["conservative", "balanced", "aggressive"] as const;
const TERMS = [12, 18, 24, 36, 48] as const;

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 pr-10 text-[13px] font-medium text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">
        {label}
      </p>
      <p className="font-mono text-[20px] font-extrabold text-[var(--text-primary)]">
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-[var(--text-muted)]">{sub}</p>
      )}
    </div>
  );
}

export default function LeaseCopilotPage() {
  const [assetId, setAssetId] = useState<string>("");
  const [lesseeId, setLesseeId] = useState<string>("");
  const [riskAppetite, setRiskAppetite] = useState<string>("balanced");
  const [termMonths, setTermMonths] = useState<string>("24");
  const [result, setResult] = useState<LeaseCopilotResult | null>(null);

  const structureLease = useStructureLease();

  const { data: assetsData, isLoading: assetsLoading } = useQuery<
    PaginatedResponse<Asset>
  >({
    queryKey: ["assets", "all-for-copilot"],
    queryFn: async () => {
      const { data } = await api.get("/assets/");
      return data;
    },
    staleTime: 2 * 60_000,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: ["auth", "users"],
    queryFn: async () => {
      const { data } = await api.get("/auth/users/");
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const assets = assetsData?.results ?? [];
  const users = usersData?.results ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId) return;
    structureLease.mutate(
      {
        asset_id: Number(assetId),
        lessee_id: lesseeId ? Number(lesseeId) : null,
        risk_appetite: riskAppetite,
        requested_term_months: Number(termMonths),
      },
      {
        onSuccess: (data) => setResult(data),
      }
    );
  }

  const dropdownsLoading = assetsLoading || usersLoading;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)]">
          <Bot size={18} className="text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-[18px] font-bold text-[var(--text-primary)]">
            Lease Structuring Copilot
          </h1>
          <p className="text-[12px] text-[var(--text-muted)]">
            AI-powered lease structuring with risk analysis and alternatives
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-semibold">
            Configure Lease Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dropdownsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px] rounded-xl" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Asset"
                  value={assetId}
                  onChange={setAssetId}
                  disabled={structureLease.isPending}
                >
                  <option value="">— Select an asset —</option>
                  {assets.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name} ({a.serial_number})
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Lessee (optional)"
                  value={lesseeId}
                  onChange={setLesseeId}
                  disabled={structureLease.isPending}
                >
                  <option value="">— No specific lessee —</option>
                  {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.first_name} {u.last_name}
                      {u.company_name ? ` · ${u.company_name}` : ""}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Risk Appetite"
                  value={riskAppetite}
                  onChange={setRiskAppetite}
                  disabled={structureLease.isPending}
                >
                  {RISK_APPETITES.map((r) => (
                    <option key={r} value={r} className="capitalize">
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Requested Term"
                  value={termMonths}
                  onChange={setTermMonths}
                  disabled={structureLease.isPending}
                >
                  {TERMS.map((t) => (
                    <option key={t} value={String(t)}>
                      {t} months
                    </option>
                  ))}
                </SelectField>
              </div>

              {structureLease.isError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                  />
                  <p className="text-[12px] text-red-700 dark:text-red-400">
                    {structureLease.error?.message ?? "An error occurred"}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={!assetId || structureLease.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {structureLease.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Structuring…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Structure Lease
                  </>
                )}
              </button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Loading skeleton for result */}
      {structureLease.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-[100px] rounded-2xl" />
          <Skeleton className="h-[80px] rounded-2xl" />
          <Skeleton className="h-[140px] rounded-2xl" />
        </div>
      )}

      {/* Result */}
      {result && !structureLease.isPending && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* Header */}
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[var(--accent)]" />
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
              Recommendation for{" "}
              <span className="text-[var(--accent)]">{result.asset_name}</span>
              {result.lessee_name !== "Unknown" && (
                <>
                  {" "}
                  — <span className="text-[var(--accent)]">{result.lessee_name}</span>
                </>
              )}
            </p>
          </div>

          {/* 1. Summary stats row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Recommended Term",
                value: `${result.recommended_term_months} months`,
              },
              {
                label: "Monthly Rate",
                value: formatCurrency(result.suggested_monthly_rate),
              },
              {
                label: "Deposit",
                value: `${result.deposit_percent.toFixed(1)}%`,
              },
              {
                label: "Credit Score",
                value: `${result.lessee_credit_score} / 100`,
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <StatCard label={stat.label} value={stat.value} />
              </motion.div>
            ))}
          </div>

          {/* 2. Rationale */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] font-semibold">
                Rationale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                {result.rationale}
              </p>
            </CardContent>
          </Card>

          {/* 3. Risk Flags */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] font-semibold">
                Risk Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.risk_flags.length === 0 ? (
                <Badge variant="active">No risk flags</Badge>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {result.risk_flags.map((flag, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Badge variant="destructive">{flag}</Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Alternatives table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] font-semibold">
                Alternative Structures
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {["Term", "Monthly Rate", "Residual Value", "Multiplier"].map(
                        (col) => (
                          <th
                            key={col}
                            className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]"
                          >
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {result.alternatives.map((alt, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-muted)]"
                      >
                        <td className="px-6 py-3.5 font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                          {alt.term_months} mo
                        </td>
                        <td className="px-6 py-3.5 font-mono text-[13px] text-[var(--text-primary)]">
                          {formatCurrency(alt.monthly_rate)}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-[13px] text-[var(--text-muted)]">
                          {formatCurrency(alt.residual_value)}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-[13px] text-[var(--text-muted)]">
                          {alt.rate_multiplier.toFixed(3)}×
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

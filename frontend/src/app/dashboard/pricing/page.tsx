"use client";

import { useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePricingRules, useCreatePricingRule, useUpdatePricingRule, useDeletePricingRule } from "@/hooks/usePricing";
import { useIsAdmin } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import type { PricingRule } from "@/types";

const RULE_TYPES = [
  { value: "seasonal", label: "Seasonal Multiplier", desc: "Adjust rates for specific months" },
  { value: "utilization_tier", label: "Utilization Tier", desc: "Rate per hour based on usage bands" },
  { value: "penalty", label: "Late Payment Penalty", desc: "% fee after N days overdue" },
  { value: "grace_period", label: "Grace Period", desc: "Days before late fees trigger" },
  { value: "volume_discount", label: "Volume Discount", desc: "Discount for long-term leases" },
];

const RULE_TYPE_TEMPLATES: Record<string, Record<string, unknown>> = {
  seasonal: { months: [12, 1, 2], multiplier: 1.15 },
  utilization_tier: { tiers: [{ min: 0, max: 100, rate_per_hour: 45 }, { min: 100, max: 200, rate_per_hour: 40 }, { min: 200, max: 9999, rate_per_hour: 35 }] },
  penalty: { days_overdue_threshold: 30, penalty_percent: 5.0 },
  grace_period: { days: 5 },
  volume_discount: { min_lease_months: 12, discount_percent: 10.0 },
};

const TYPE_COLORS: Record<string, string> = {
  seasonal: "bg-sky-500/15 text-sky-400",
  utilization_tier: "bg-violet-500/15 text-violet-400",
  penalty: "bg-red-500/15 text-red-400",
  grace_period: "bg-emerald-500/15 text-emerald-400",
  volume_discount: "bg-amber-500/15 text-amber-400",
};

function ParamsDisplay({ params }: { params: Record<string, unknown> }) {
  return (
    <pre className="mt-1 rounded-xl bg-[var(--surface-muted)] p-3 text-[11px] font-mono text-[var(--text-muted)] overflow-x-auto">
      {JSON.stringify(params, null, 2)}
    </pre>
  );
}

export default function PricingPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    rule_type: "seasonal",
    asset_category: "",
    description: "",
    params: {} as Record<string, unknown>,
  });

  const { data: rules = [], isLoading } = usePricingRules();
  const create = useCreatePricingRule();
  const update = useUpdatePricingRule();
  const del = useDeletePricingRule();
  const isAdmin = useIsAdmin();

  function handleCreate() {
    create.mutate(
      {
        ...form,
        active: true,
        params: Object.keys(form.params).length ? form.params : RULE_TYPE_TEMPLATES[form.rule_type],
      },
      {
        onSuccess: () => {
          toast.success("Pricing rule created", form.name);
          setShowForm(false);
          setForm({ name: "", rule_type: "seasonal", asset_category: "", description: "", params: {} });
        },
        onError: () => toast.error("Failed to create rule"),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-[var(--text-muted)]">
            <span className="font-mono font-bold text-[var(--text-primary)]">{rules.length}</span> pricing rules
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-2" onClick={() => setShowForm(!showForm)}>
            <Plus size={13} /> {showForm ? "Cancel" : "New Rule"}
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardContent className="px-5 py-5 space-y-4">
            <p className="text-[13px] font-bold text-[var(--text-primary)]">New Pricing Rule</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Name *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Q4 Peak Pricing" />
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Rule Type *</label>
                <select
                  value={form.rule_type}
                  onChange={(e) => setForm({ ...form, rule_type: e.target.value, params: {} })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {RULE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Asset Category (blank = all)</label>
                <select
                  value={form.asset_category}
                  onChange={(e) => setForm({ ...form, asset_category: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <option value="">All Categories</option>
                  <option value="heavy_equipment">Heavy Equipment</option>
                  <option value="medical">Medical</option>
                  <option value="fleet">Fleet</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Description</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes" />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
                Params (JSON) — default template shown
              </label>
              <pre className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-[11px] font-mono text-[var(--text-muted)]">
                {JSON.stringify(RULE_TYPE_TEMPLATES[form.rule_type], null, 2)}
              </pre>
              <p className="mt-1 text-[11px] text-[var(--text-faint)]">Default params will be used. Custom params editor coming soon.</p>
            </div>
            <Button
              size="sm"
              disabled={!form.name || create.isPending}
              onClick={handleCreate}
            >
              {create.isPending ? "Creating…" : "Create Rule"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rule Type Info */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {RULE_TYPES.map((t) => (
          <div key={t.value} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase mb-2 ${TYPE_COLORS[t.value]}`}>
              <Tag size={9} /> {t.value.replace("_", " ")}
            </span>
            <p className="text-[12px] font-semibold text-[var(--text-primary)]">{t.label}</p>
            <p className="text-[11px] text-[var(--text-muted)]">{t.desc}</p>
          </div>
        ))}
      </div>

      {/* Rules List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-b border-[var(--border)] px-5 py-4">
                <Skeleton className="h-4 w-1/2 rounded mb-2" /><Skeleton className="h-3 w-1/3 rounded" />
              </div>
            ))
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Tag size={28} className="text-[var(--text-faint)]" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">No pricing rules configured</p>
              <p className="text-[12px] text-[var(--text-muted)]">Add rules to customize invoice calculations for your fleet.</p>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="border-b border-[var(--border)] last:border-0 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{rule.name}</p>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${TYPE_COLORS[rule.rule_type] ?? ""}`}>
                        {rule.rule_type_display}
                      </span>
                      {rule.asset_category && (
                        <span className="text-[10px] font-medium text-[var(--text-faint)] capitalize">{rule.asset_category.replace("_", " ")} only</span>
                      )}
                      <Badge variant={rule.active ? "paid" : "draft"}>{rule.active ? "active" : "inactive"}</Badge>
                    </div>
                    {rule.description && <p className="text-[12px] text-[var(--text-muted)] mb-2">{rule.description}</p>}
                    <ParamsDisplay params={rule.params} />
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => update.mutate({ id: rule.id, active: !rule.active }, {
                          onSuccess: () => toast.success("Rule updated", rule.name),
                        })}
                      >
                        {rule.active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] text-red-400 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => del.mutate(rule.id, {
                          onSuccess: () => toast.success("Rule deleted", rule.name),
                        })}
                      >
                        <Trash2 size={11} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

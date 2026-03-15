"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Loader2, Package, Plus, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssets, useCreateAsset } from "@/hooks/useAssets";
import { useIsAdmin, useCanExport } from "@/hooks/useAuth";
import { useCreateLease } from "@/hooks/useLeases";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast";
import api from "@/lib/axios";
import type { Asset } from "@/types";

const STATUS_FILTERS = ["all", "available", "leased", "maintenance", "remarketed"] as const;

const CATEGORY_MAP: Record<string, string> = {
  heavy_equipment: "Heavy Equip.",
  medical: "Medical",
  fleet: "Fleet",
  industrial: "Industrial",
};

const DURATIONS = [6, 12, 18, 24, 36];

function LeaseModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const createLease = useCreateLease();
  const [months, setMonths] = useState(12);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLease.mutate(
      { asset_id: asset.id, duration_months: months },
      {
        onSuccess: () => {
          toast.success("Lease created!", `${asset.name} leased for ${months} months.`);
          onClose();
        },
        onError: () => {
          toast.error("Failed to create lease", "Please check your permissions and try again.");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Create Lease</h2>
            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{asset.name}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-2 text-[12px] font-semibold text-[var(--text-muted)]">Asset Details</p>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Serial</span>
                <span className="font-mono font-semibold text-[var(--text-primary)]">{asset.serial_number}</span>
              </div>
              <div className="mt-1.5 flex justify-between">
                <span className="text-[var(--text-muted)]">Monthly Rate</span>
                <span className="font-mono font-semibold text-[var(--text-primary)]">{formatCurrency(asset.base_monthly_rate)}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold text-[var(--text-muted)]">Lease Duration</p>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setMonths(d)}
                  className={`rounded-xl px-3.5 py-2 text-[12px] font-semibold transition-all ${
                    months === d
                      ? "bg-[var(--accent)] text-white shadow-[0_2px_12px_var(--accent-glow)]"
                      : "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] hover:border-[var(--accent)]/40"
                  }`}
                >
                  {d} mo
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-[12px]">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Total Contract Value</span>
              <span className="font-mono text-[14px] font-bold text-[var(--accent)]">
                {formatCurrency(parseFloat(asset.base_monthly_rate) * months)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-1.5" disabled={createLease.isPending}>
              {createLease.isPending && <Loader2 size={13} className="animate-spin" />}
              Confirm Lease
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AddAssetModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createAsset = useCreateAsset();
  const [form, setForm] = useState({
    name: "",
    category: "heavy_equipment",
    serial_number: "",
    manufacture_year: new Date().getFullYear(),
    base_monthly_rate: "",
    per_hour_rate: "",
  });
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.serial_number || !form.base_monthly_rate || !form.per_hour_rate) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      await createAsset.mutateAsync({
        name: form.name,
        category: form.category,
        serial_number: form.serial_number,
        manufacture_year: form.manufacture_year,
        base_monthly_rate: form.base_monthly_rate,
        per_hour_rate: form.per_hour_rate,
        status: "available",
      });
      onClose();
      setForm({
        name: "",
        category: "heavy_equipment",
        serial_number: "",
        manufacture_year: new Date().getFullYear(),
        base_monthly_rate: "",
        per_hour_rate: "",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create asset";
      setError(msg);
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
          >
            <h2 className="mb-4 text-[16px] font-bold text-[var(--text-primary)]">Add New Asset</h2>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Asset Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Caterpillar D6 Bulldozer"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="heavy_equipment">Heavy Equipment</option>
                    <option value="medical">Medical</option>
                    <option value="fleet">Fleet</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                    Manufacture Year *
                  </label>
                  <input
                    type="number"
                    value={form.manufacture_year}
                    onChange={(e) => handleChange("manufacture_year", parseInt(e.target.value) || 2024)}
                    min={2000}
                    max={2030}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Serial Number *
                </label>
                <input
                  type="text"
                  value={form.serial_number}
                  onChange={(e) => handleChange("serial_number", e.target.value)}
                  placeholder="e.g. CAT-D6-2024-001"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                    Monthly Rate ($) *
                  </label>
                  <input
                    type="text"
                    value={form.base_monthly_rate}
                    onChange={(e) => handleChange("base_monthly_rate", e.target.value)}
                    placeholder="5000.00"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                    Per Hour Rate ($) *
                  </label>
                  <input
                    type="text"
                    value={form.per_hour_rate}
                    onChange={(e) => handleChange("per_hour_rate", e.target.value)}
                    placeholder="25.00"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAsset.isPending}
                  className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {createAsset.isPending ? "Creating..." : "Create Asset"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function AssetsPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const canExport = useCanExport();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [leaseAsset, setLeaseAsset] = useState<Asset | null>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);

  const params: Record<string, string> = { page: String(page) };
  if (search) params.search = search;
  if (statusFilter !== "all") params.status = statusFilter;

  const { data, isLoading } = useAssets(params);
  const assets = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  const [exporting, setExporting] = useState(false);
  async function handleExportCSV() {
    setExporting(true);
    try {
      const response = await api.get("/export/assets/", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "assets.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready", "assets.csv downloaded.");
    } catch {
      toast.error("Export failed", "Could not generate CSV.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-[13px] text-[var(--text-muted)]">
          <span className="font-mono font-bold text-[var(--text-primary)]">{totalCount}</span>{" "}
          assets across all categories
        </p>
        <div className="flex items-center gap-2">
          {canExport && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV} disabled={exporting}>
              <Download size={14} />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddAsset(true)}>
              <Plus size={14} />
              Add Asset
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <Input
            placeholder="Search by name or serial number..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-all duration-150 ${
                statusFilter === s
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-faint)] hover:text-[var(--text-primary)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Asset Name", "Category", "Serial No.", "Status", "Monthly Rate", "Hours", ""].map((col) => (
                    <th
                      key={col}
                      className={`px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)] ${
                        ["Monthly Rate", "Hours"].includes(col) ? "text-right" : "text-left"
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <Skeleton className="h-4 w-full rounded-lg" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : assets.map((asset) => (
                      <tr
                        key={asset.id}
                        className="border-b border-[var(--border)] transition-colors duration-150 hover:bg-[var(--surface-muted)] last:border-0"
                      >
                        <td
                          className="cursor-pointer px-5 py-4"
                          onClick={() => router.push(`/dashboard/assets/${asset.id}`)}
                        >
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">{asset.name}</p>
                          <p className="mt-0.5 text-[11px] text-[var(--text-faint)]">{asset.manufacture_year}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                            {CATEGORY_MAP[asset.category] || asset.category}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-[12px] text-[var(--text-muted)]">{asset.serial_number}</span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={asset.status as "available" | "leased" | "maintenance" | "remarketed"}>{asset.status}</Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">{formatCurrency(asset.base_monthly_rate)}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-mono text-[13px] text-[var(--text-muted)]">{asset.total_hours_logged.toFixed(0)}h</span>
                        </td>
                        <td className="px-5 py-4">
                          {asset.status === "available" && isAdmin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setLeaseAsset(asset); }}
                              className="rounded-xl bg-[var(--accent-subtle)] px-3 py-1.5 text-[11px] font-bold text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-white"
                            >
                              Lease Now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {!isLoading && assets.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
                <Package size={28} className="text-[var(--text-faint)]" />
              </div>
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">No assets found</p>
              <p className="text-[13px] text-[var(--text-muted)]">
                {statusFilter !== "all" || search ? "Try adjusting your filters." : "Assets will appear here once added to the fleet."}
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-col gap-2 border-t border-[var(--border)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[var(--text-muted)]">
                Showing page <span className="font-mono font-semibold text-[var(--text-primary)]">{page}</span> of{" "}
                <span className="font-mono font-semibold text-[var(--text-primary)]">{totalPages}</span>
                {" "}&middot; {totalCount} results
              </p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="gap-1" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={14} />
                  Prev
                </Button>
                <Button variant="outline" size="sm" className="gap-1" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lease creation modal */}
      <AnimatePresence>
        {leaseAsset && (
          <LeaseModal asset={leaseAsset} onClose={() => setLeaseAsset(null)} />
        )}
      </AnimatePresence>

      <AddAssetModal open={showAddAsset} onClose={() => setShowAddAsset(false)} />
    </div>
  );
}

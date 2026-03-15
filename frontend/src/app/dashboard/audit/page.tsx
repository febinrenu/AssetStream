"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLogs } from "@/hooks/useAudit";
import { useIsAdmin } from "@/hooks/useAuth";

const RESOURCE_COLORS: Record<string, string> = {
  lease: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  asset: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  invoice: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export default function AuditLogPage() {
  const isAdmin = useIsAdmin();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");

  const { data, isLoading } = useAuditLogs({
    page,
    action: actionFilter || undefined,
    resource_type: resourceFilter || undefined,
  });

  const logs = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / (data?.page_size ?? 40));

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--destructive-subtle)]">
          <ClipboardList size={28} className="text-[var(--destructive)]" />
        </div>
        <p className="text-[15px] font-bold text-[var(--text-primary)]">Access Denied</p>
        <p className="text-[13px] text-[var(--text-muted)]">The audit log is only accessible to administrators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[var(--text-primary)]">
          Audit Log
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          <span className="font-mono font-bold text-[var(--text-primary)]">{total}</span> events recorded
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <Input
            placeholder="Filter by action (e.g. lease.renew)"
            className="pl-8"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2">
          {["", "lease", "asset", "invoice"].map((r) => (
            <button
              key={r}
              onClick={() => { setResourceFilter(r); setPage(1); }}
              className={`rounded-xl px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-all ${
                resourceFilter === r
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {r || "All"}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Timestamp", "User", "Action", "Resource", "Description", "IP Address"].map((col) => (
                    <th key={col} className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-5 py-3.5">
                            <Skeleton className="h-4 rounded-lg" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : logs.map((log) => (
                      <tr key={log.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-muted)] last:border-0">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[11px] text-[var(--text-muted)]">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[13px] font-semibold text-[var(--text-primary)]">{log.username}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-lg bg-[var(--surface-muted)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--text-primary)]">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {log.resource_type && (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${RESOURCE_COLORS[log.resource_type] || "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}>
                              {log.resource_type}
                              {log.resource_id ? ` #${log.resource_id}` : ""}
                            </span>
                          )}
                        </td>
                        <td className="max-w-[300px] px-5 py-3.5">
                          <p className="truncate text-[12px] text-[var(--text-muted)]">{log.description}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[11px] text-[var(--text-faint)]">{log.ip_address ?? "—"}</span>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {!isLoading && logs.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
                <ClipboardList size={24} className="text-[var(--text-faint)]" />
              </div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">No audit events found</p>
              <p className="text-[12px] text-[var(--text-muted)]">Events are recorded automatically as users perform actions.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
              <p className="text-[12px] text-[var(--text-muted)]">
                Page <span className="font-mono font-semibold">{page}</span> of{" "}
                <span className="font-mono font-semibold">{totalPages}</span> · {total} events
              </p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="gap-1" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={14} /> Prev
                </Button>
                <Button variant="outline" size="sm" className="gap-1" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

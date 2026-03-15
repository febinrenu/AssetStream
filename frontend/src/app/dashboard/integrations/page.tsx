"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Globe, Plus, Send, Trash2, X, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useInAppNotifications,
  useMarkAllNotificationsRead,
  useUnreadNotificationCount,
} from "@/hooks/useWebhooks";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

const ALL_EVENTS = [
  "invoice.paid",
  "invoice.overdue",
  "lease.created",
  "lease.renewed",
  "lease.terminated",
  "asset.maintenance",
  "approval.approved",
  "approval.rejected",
  "payment.completed",
];

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};

const TABS = ["webhooks", "notifications"] as const;
type Tab = typeof TABS[number];

function CreateWebhookDrawer({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", url: "", events: [] as string[] });
  const create = useCreateWebhook();

  function toggleEvent(ev: string) {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(ev) ? prev.events.filter((e) => e !== ev) : [...prev.events, ev],
    }));
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed right-0 top-0 z-[81] flex h-full w-full max-w-[440px] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <p className="text-[15px] font-bold text-[var(--text-primary)]">New Webhook</p>
          <button onClick={onClose}><X size={15} className="text-[var(--text-faint)] hover:text-[var(--text-primary)]" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. ERP Sync Webhook" />
          </div>
          <div>
            <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Endpoint URL *</label>
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://your-system.com/webhook" type="url" />
          </div>
          <div>
            <label className="block mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">Subscribe to Events</label>
            <div className="space-y-2">
              {ALL_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => toggleEvent(ev)}
                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                      form.events.includes(ev)
                        ? "border-[var(--accent)] bg-[var(--accent)]"
                        : "border-[var(--border)] bg-[var(--surface-muted)] group-hover:border-[var(--accent)]"
                    }`}
                  >
                    {form.events.includes(ev) && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className="font-mono text-[12px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">{ev}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-6 py-4">
          <Button
            className="w-full"
            disabled={!form.name || !form.url || form.events.length === 0 || create.isPending}
            onClick={() =>
              create.mutate(form, {
                onSuccess: () => { toast.success("Webhook created", form.name); onClose(); },
                onError: () => toast.error("Failed to create webhook"),
              })
            }
          >
            {create.isPending ? "Creating…" : "Create Webhook"}
          </Button>
        </div>
      </motion.div>
    </>
  );
}

export default function IntegrationsPage() {
  const [tab, setTab] = useState<Tab>("webhooks");
  const [showCreate, setShowCreate] = useState(false);

  const { data: webhooks = [], isLoading: loadingWH } = useWebhooks();
  const { data: notifications = [], isLoading: loadingNotifs } = useInAppNotifications();
  const { data: unreadData } = useUnreadNotificationCount();
  const update = useUpdateWebhook();
  const del = useDeleteWebhook();
  const test = useTestWebhook();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-[var(--border)] pb-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-xl px-4 py-2.5 text-[12px] font-semibold capitalize transition-all ${
              tab === t
                ? "border border-b-[var(--surface)] border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] -mb-px"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t}
            {t === "notifications" && unreadData?.unread_count ? (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white font-bold">
                {unreadData.unread_count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Webhooks Tab */}
      {tab === "webhooks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[var(--text-muted)]">
              <span className="font-mono font-bold text-[var(--text-primary)]">{webhooks.length}</span> webhook subscriptions
            </p>
            <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> New Webhook
            </Button>
          </div>

          {loadingWH ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="px-5 py-4"><Skeleton className="h-16 w-full rounded-xl" /></CardContent></Card>
            ))
          ) : webhooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16">
                <Globe size={28} className="text-[var(--text-faint)]" />
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">No webhooks configured</p>
                <p className="text-[12px] text-[var(--text-muted)]">Connect AssetStream events to your ERP, CRM, or custom systems.</p>
              </CardContent>
            </Card>
          ) : (
            webhooks.map((wh) => (
              <Card key={wh.id}>
                <CardContent className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{wh.name}</p>
                        <Badge variant={wh.active ? "paid" : "draft"}>{wh.active ? "active" : "inactive"}</Badge>
                        {wh.failure_count > 0 && (
                          <span className="text-[10px] font-bold text-red-400">{wh.failure_count} failures</span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-[var(--text-muted)] truncate">{wh.url}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {wh.events.map((ev) => (
                          <span key={ev} className="rounded-full bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-faint)]">{ev}</span>
                        ))}
                      </div>
                      {wh.last_triggered_at && (
                        <p className="mt-1 text-[10px] text-[var(--text-faint)]">Last triggered: {formatDate(wh.last_triggered_at)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-[11px]"
                        onClick={() => test.mutate(wh.id, {
                          onSuccess: () => toast.success("Test ping sent", wh.name),
                          onError: () => toast.error("Test failed"),
                        })}
                      >
                        <Send size={10} /> Test
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => update.mutate({ id: wh.id, active: !wh.active }, {
                          onSuccess: () => toast.success("Webhook updated", wh.name),
                        })}
                      >
                        {wh.active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] text-red-400 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => del.mutate(wh.id, {
                          onSuccess: () => toast.success("Webhook deleted", wh.name),
                        })}
                      >
                        <Trash2 size={11} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {tab === "notifications" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[var(--text-muted)]">
              {unreadData?.unread_count ? (
                <span className="font-mono font-bold text-amber-400">{unreadData.unread_count} unread</span>
              ) : (
                "All caught up"
              )}
            </p>
            {unreadData && unreadData.unread_count > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAllRead.mutate(undefined, { onSuccess: () => toast.success("Marked all read") })}
              >
                Mark all read
              </Button>
            )}
          </div>

          {loadingNotifs ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="px-5 py-3"><Skeleton className="h-12 w-full rounded-xl" /></CardContent></Card>
            ))
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16">
                <Zap size={28} className="text-[var(--text-faint)]" />
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">No notifications</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-xl border px-4 py-3 transition-colors ${
                  SEVERITY_COLORS[n.severity] ?? SEVERITY_COLORS.info
                } ${!n.is_read ? "border-l-4" : "opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold">{n.title}</p>
                    <p className="text-[12px] mt-0.5 opacity-80">{n.body}</p>
                  </div>
                  <p className="text-[10px] opacity-60 whitespace-nowrap shrink-0">{formatDate(n.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateWebhookDrawer onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

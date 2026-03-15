"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Bell, Info, Menu, Moon, Sun, X, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications, useTriggerBilling, useTriggerIoT } from "@/hooks/useNotifications";
import { useSidebar } from "@/lib/sidebar-context";
import type { Notification } from "@/types";

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard":           { title: "Dashboard",         subtitle: "Real-time fleet & finance overview" },
  "/dashboard/assets":    { title: "Asset Catalog",     subtitle: "Browse and manage your equipment fleet" },
  "/dashboard/leases":    { title: "Lease Contracts",   subtitle: "Active and historical lease agreements" },
  "/dashboard/invoices":  { title: "Invoices",          subtitle: "Track billing and payment status" },
  "/dashboard/billing":   { title: "Billing Analytics", subtitle: "Revenue metrics and collection insights" },
  "/dashboard/insights":  { title: "AI Insights",       subtitle: "Predictive analytics and asset valuations" },
  "/dashboard/profile":   { title: "Profile Settings",  subtitle: "Manage your account and preferences" },
  "/dashboard/audit":     { title: "Audit Log",         subtitle: "System-wide action history for administrators" },
};

function getPageInfo(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/dashboard/assets/")) return { title: "Asset Detail", subtitle: "Equipment overview, telemetry, and AI valuation" };
  const last = pathname.split("/").filter(Boolean).pop() || "";
  return { title: last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
}

function NotificationIcon({ type }: { type: Notification["type"] }) {
  if (type === "overdue_invoice") return <AlertTriangle size={13} className="text-[var(--destructive)]" />;
  if (type === "high_temp")       return <AlertTriangle size={13} className="text-[var(--warning)]" />;
  return <Info size={13} className="text-[var(--accent)]" />;
}

function NotificationBg({ severity }: { severity: Notification["severity"] }) {
  if (severity === "error")   return "bg-[var(--destructive-subtle)]";
  if (severity === "warning") return "bg-[var(--warning-subtle)]";
  return "bg-[var(--accent-subtle)]";
}

export function Topbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    // Load read notification IDs from localStorage on mount
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("assetstream_read_notifs");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: user } = useAuth();
  const { data: notifData } = useNotifications();
  const { setMobileOpen } = useSidebar();

  const triggerBilling = useTriggerBilling();
  const triggerIoT = useTriggerIoT();
  const isAdmin = user?.role === "admin";

  useEffect(() => setMounted(true), []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { title, subtitle } = getPageInfo(pathname);
  const notifications = notifData?.items ?? [];
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  function markAllRead() {
    const allIds = notifications.map((n) => n.id);
    const newSet = new Set([...readIds, ...allIds]);
    setReadIds(newSet);
    try {
      localStorage.setItem("assetstream_read_notifs", JSON.stringify([...newSet]));
    } catch {}
  }

  function markOneRead(id: string) {
    if (readIds.has(id)) return;
    const newSet = new Set([...readIds, id]);
    setReadIds(newSet);
    try {
      localStorage.setItem("assetstream_read_notifs", JSON.stringify([...newSet]));
    } catch {}
  }

  // Avatar: use avatar_color or gradient
  const avatarStyle = user?.avatar_color
    ? { background: user.avatar_color }
    : undefined;
  const avatarInitial = user
    ? `${user.first_name?.[0] || user.username[0]}${user.last_name?.[0] || ""}`.toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-20 flex h-[62px] shrink-0 items-center justify-between border-b border-[var(--border)] glass px-4 sm:px-6 lg:px-8">
      {/* Left */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition-all duration-150 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-[family-name:var(--font-plus-jakarta)] text-[15px] font-bold leading-tight text-[var(--text-primary)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 hidden truncate text-[11px] leading-tight text-[var(--text-muted)] sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Admin quick actions */}
        {isAdmin && (
          <div className="mr-1 hidden items-center gap-1 border-r border-[var(--border)] pr-2 sm:flex">
            <button
              onClick={() => triggerIoT.mutate()}
              disabled={triggerIoT.isPending}
              title="Trigger IoT ping"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 text-[11px] font-semibold text-[var(--text-muted)] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--accent)] disabled:opacity-50"
            >
              <Zap size={11} />
              IoT Ping
            </button>
            <button
              onClick={() => triggerBilling.mutate()}
              disabled={triggerBilling.isPending}
              title="Trigger billing cycle"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 text-[11px] font-semibold text-[var(--text-muted)] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--accent)] disabled:opacity-50"
            >
              <Zap size={11} />
              Bill
            </button>
          </div>
        )}

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-all duration-150 hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-all duration-150 hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            aria-label="Notifications"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--destructive)] text-[8px] font-bold text-white ring-2 ring-[var(--topbar-bg)]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-[46px] z-50 w-[340px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <p className="text-[13px] font-bold text-[var(--text-primary)]">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 inline-flex h-5 items-center rounded-full bg-[var(--destructive-subtle)] px-2 text-[10px] font-bold text-[var(--destructive)]">
                      {unreadCount} unread
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="max-h-[340px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center py-10">
                    <Bell size={22} className="mb-3 text-[var(--text-faint)]" />
                    <p className="text-[13px] text-[var(--text-muted)]">All caught up!</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !readIds.has(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => markOneRead(n.id)}
                        className={`flex cursor-pointer items-start gap-3 border-b border-[var(--border)] px-4 py-3 last:border-0 hover:bg-[var(--surface-muted)] transition-colors ${isUnread ? "bg-[var(--surface-muted)]/40" : ""}`}
                      >
                        <div className={`relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${NotificationBg({ severity: n.severity })}`}>
                          <NotificationIcon type={n.type} />
                          {isUnread && (
                            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--accent)] ring-1 ring-[var(--surface)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[12px] font-semibold ${isUnread ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{n.title}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">{n.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <div className="border-t border-[var(--border)] px-4 py-2.5">
                  <Link
                    href={notifications[0]?.resource_type === "invoice" ? "/dashboard/invoices" : "/dashboard/leases"}
                    className="text-[12px] font-semibold text-[var(--accent)] hover:underline"
                    onClick={() => setNotifOpen(false)}
                  >
                    View all →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User chip */}
        {user && (
          <Link
            href="/dashboard/profile"
            className="ml-2 flex items-center gap-2.5 rounded-xl border-l border-[var(--border)] pl-3 transition-all hover:bg-[var(--surface-muted)]"
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
              style={avatarStyle ?? { background: "linear-gradient(135deg, var(--accent), #0ea5e9)" }}
            >
              {avatarInitial}
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="max-w-[120px] truncate text-[12px] font-semibold leading-tight text-[var(--text-primary)]">
                {user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.username}
              </p>
              <p className="text-[11px] capitalize leading-tight text-[var(--text-muted)]">{user.role}</p>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}

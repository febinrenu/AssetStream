"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Brain,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  Sliders,
  Sparkles,
  Tag,
  Ticket,
  TrendingDown,
  Wallet,
  UserRound,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/lib/sidebar-context";

const NAV_LESSEE = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "My Fleet",
    items: [
      { href: "/dashboard/assets", icon: Package, label: "Browse Assets" },
      { href: "/dashboard/leases", icon: FileText, label: "My Leases" },
      { href: "/dashboard/tickets", icon: Ticket, label: "Support Tickets" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/dashboard/invoices", icon: Receipt, label: "Invoices" },
      { href: "/dashboard/billing", icon: BarChart3, label: "Billing" },
    ],
  },
  {
    label: "Approvals",
    items: [
      { href: "/dashboard/approvals", icon: ClipboardCheck, label: "My Requests" },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/dashboard/profile", icon: UserRound, label: "Profile" }],
  },
];

const NAV_ADMIN_ANALYST = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Fleet Management",
    items: [
      { href: "/dashboard/assets", icon: Package, label: "Assets" },
      { href: "/dashboard/leases", icon: FileText, label: "Lease Contracts" },
      { href: "/dashboard/tickets", icon: Ticket, label: "Service Tickets" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/dashboard/invoices", icon: Receipt, label: "Invoices" },
      { href: "/dashboard/payments", icon: Wallet, label: "Payments" },
      { href: "/dashboard/billing", icon: BarChart3, label: "Billing" },
      { href: "/dashboard/pricing", icon: Tag, label: "Pricing Rules" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/dashboard/approvals", icon: ClipboardCheck, label: "Approvals" },
      { href: "/dashboard/risk", icon: ShieldAlert, label: "Risk Cockpit" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/dashboard/insights", icon: Brain, label: "AI Insights" },
      { href: "/dashboard/audit", icon: ClipboardList, label: "Audit Log" },
      { href: "/dashboard/integrations", icon: Globe, label: "Integrations" },
    ],
  },
  {
    label: "AI Lab",
    items: [
      { href: "/dashboard/ai/copilot", icon: Sparkles, label: "Lease Copilot" },
      { href: "/dashboard/ai/risk-scores", icon: ShieldAlert, label: "Risk Scores" },
      { href: "/dashboard/ai/anomaly", icon: AlertTriangle, label: "Anomaly Detection" },
      { href: "/dashboard/ai/maintenance", icon: Wrench, label: "Maintenance AI" },
      { href: "/dashboard/ai/collections", icon: RefreshCw, label: "Collections AI" },
      { href: "/dashboard/ai/remarketing-engine", icon: TrendingDown, label: "Remarketing Engine" },
      { href: "/dashboard/ai/chat", icon: Bot, label: "Analytics Chat" },
      { href: "/dashboard/ai/simulator", icon: Sliders, label: "Scenario Simulator" },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/dashboard/profile", icon: UserRound, label: "Profile" }],
  },
];

function BrandLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="13" height="13" x="1" y="1" rx="4" fill="var(--accent)" />
      <rect width="13" height="13" x="18" y="1" rx="4" fill="var(--accent)" opacity="0.6" />
      <rect width="13" height="13" x="1" y="18" rx="4" fill="var(--accent)" opacity="0.35" />
      <rect width="13" height="13" x="18" y="18" rx="4" fill="var(--accent)" opacity="0.85" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { data: user } = useAuth();

  const navGroups = user?.role === "lessee" ? NAV_LESSEE : NAV_ADMIN_ANALYST;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const handleLogout = () => {
    localStorage.clear();
    setMobileOpen(false);
    router.push("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          role="button"
          tabIndex={-1}
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full flex-col",
          "bg-[var(--sidebar-bg)] border-r border-[var(--border)]",
          "transition-all duration-300 ease-in-out",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-[248px] lg:w-[68px]" : "w-[248px]"
        )}
      >
        {/* ── Brand ── */}
        <div
          className={cn(
            "flex h-[62px] shrink-0 items-center border-b border-[var(--border)]",
            collapsed ? "justify-center" : "gap-3 px-5"
          )}
        >
          {!collapsed ? (
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 group">
              <BrandLogo />
              <span className="truncate font-[family-name:var(--font-plus-jakarta)] text-[15px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors duration-150">
                AssetStream
              </span>
            </Link>
          ) : (
            <Link href="/dashboard" className="flex items-center justify-center w-[68px] hover:opacity-80 transition-opacity">
              <BrandLogo size={22} />
            </Link>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navGroups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-5" : ""}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                  {group.label}
                </p>
              )}
              {collapsed && gi > 0 && (
                <div className="mx-auto mb-3 h-px w-8 bg-[var(--border)]" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-150",
                        collapsed ? "h-10 w-10 mx-auto justify-center" : "px-3 py-2.5",
                        isActive
                          ? "bg-[var(--accent)] text-white shadow-[0_2px_12px_var(--accent-glow)]"
                          : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <item.icon
                        size={17}
                        className={cn(
                          "shrink-0",
                          isActive ? "text-white" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Quick Search Hint ── */}
        {!collapsed && (
          <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-[11px] text-[var(--text-faint)]">
            <Search size={12} />
            <span>Quick search</span>
            <kbd className="ml-auto rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 text-[9px] font-bold">
              {typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘K" : "Ctrl+K"}
            </kbd>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-[var(--border)] p-2 space-y-1">
          {user && !collapsed && (
            <Link
              href="/dashboard/profile"
              className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                style={user.avatar_color ? { background: user.avatar_color } : { background: "linear-gradient(135deg, var(--accent), #0ea5e9)" }}
              >
                {`${user.first_name?.[0] || user.username[0]}${user.last_name?.[0] || ""}`.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-tight text-[var(--text-primary)]">
                  {user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.username}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      user.role === "admin"
                        ? "bg-violet-500/15 text-violet-500"
                        : user.role === "analyst"
                        ? "bg-sky-500/15 text-sky-500"
                        : "bg-emerald-500/15 text-emerald-500"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
            </Link>
          )}
          {user && collapsed && (
            <Link href="/dashboard/profile" className="mb-1 flex justify-center">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                style={user.avatar_color ? { background: user.avatar_color } : { background: "linear-gradient(135deg, var(--accent), #0ea5e9)" }}
              >
                {`${user.first_name?.[0] || user.username[0]}${user.last_name?.[0] || ""}`.toUpperCase()}
              </div>
            </Link>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl text-[13px] font-medium text-[var(--text-muted)] transition-all duration-150 hover:bg-red-500/10 hover:text-[var(--destructive)]",
              collapsed ? "h-10 w-10 mx-auto justify-center" : "px-3 py-2.5"
            )}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>

        {/* ── Collapse Toggle (desktop) ── */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[74px] hidden h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] shadow-sm transition-all hover:text-[var(--text-primary)] lg:flex z-50"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  );
}


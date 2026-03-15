"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Globe,
  Lock,
  Moon,
  Package,
  Receipt,
  RefreshCw,
  Shield,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
  Zap,
  AlertTriangle,
  Cpu,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingParticles } from "@/components/ui/floating-particles";
import { useEffect, useRef, useState } from "react";

/* â€â€â€ Helpers â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€ */
function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="13" height="13" x="1" y="1" rx="4" fill="#0D9488" />
      <rect width="13" height="13" x="18" y="1" rx="4" fill="#0D9488" opacity="0.65" />
      <rect width="13" height="13" x="1" y="18" rx="4" fill="#0D9488" opacity="0.4" />
      <rect width="13" height="13" x="18" y="18" rx="4" fill="#0D9488" opacity="0.85" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent-subtle)] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--accent)]">
      {children}
    </p>
  );
}

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1400;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
      else setCount(target);
    };
    requestAnimationFrame(step);
  }, [isInView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* â€â€â€ Navbar â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "For your team", href: "#roles" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-[var(--border)] glass shadow-sm" : "bg-transparent"}`}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandMark />
          <span className="font-[family-name:var(--font-plus-jakarta)] text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
            AssetStream
          </span>
        </Link>

        <div className="hidden items-center gap-7 text-[13px] font-medium text-[var(--text-muted)] lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-[var(--text-primary)]">{l.label}</a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-all hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="gap-1.5">Get started <ArrowRight size={13} /></Button>
          </Link>
          <button
            className="ml-1 flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-xl lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <span className={`h-0.5 w-5 bg-[var(--text-primary)] transition-all ${mobileOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-0.5 w-5 bg-[var(--text-primary)] transition-all ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`h-0.5 w-5 bg-[var(--text-primary)] transition-all ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 lg:hidden">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block py-2.5 text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {l.label}
            </a>
          ))}
          <div className="mt-3 flex gap-2 border-t border-[var(--border)] pt-3">
            <Link href="/login" className="flex-1"><Button variant="outline" className="w-full">Sign in</Button></Link>
            <Link href="/signup" className="flex-1"><Button className="w-full">Get started</Button></Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* â€â€â€ Data â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€ */
const kpis = [
  { label: "Active Leases", value: "24", change: "+3" },
  { label: "Monthly Revenue", value: "$284K", change: "+12%" },
  { label: "Fleet Utilization", value: "87.4%", change: "+2.1%" },
  { label: "Overdue", value: "3", change: "-1" },
];

const trustLogos = [
  "Caterpillar Finance",
  "MediLease Corp",
  "FleetPro Inc.",
  "Atlas Equipment",
  "NordCapital",
  "Vertex Leasing",
];

const stats = [
  { value: 2400, suffix: "M+", prefix: "$", label: "Assets Under Management", icon: DollarSign },
  { value: 99, suffix: "%", prefix: "", label: "Billing Accuracy", icon: Shield },
  { value: 38, suffix: "K+", prefix: "", label: "Active Leases Managed", icon: FileText },
  { value: 5, suffix: "min", prefix: "<", label: "Telemetry Latency", icon: Clock },
];

const features = [
  {
    icon: Brain,
    tag: "Originations",
    title: "AI-Powered Lease Originations",
    description: "Generate lease contracts with intelligent risk scoring, automated pricing, and production-ready compliance logic - in minutes, not days.",
    bullets: ["Instant credit risk assessment", "Dynamic pricing engine", "Auto-generated contracts with e-sign ready PDFs"],
    gradient: "from-teal-500/20 to-cyan-500/20",
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-500",
  },
  {
    icon: Activity,
    tag: "Servicing",
    title: "Real-Time IoT Servicing",
    description: "Ingest live telemetry from equipment sensors: GPS position, engine temp, fuel level, and hours used - all updated every 5 minutes.",
    bullets: ["Live GPS asset tracking", "Engine health & temperature alerts", "Usage-based billing automation"],
    gradient: "from-blue-500/20 to-indigo-500/20",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    icon: BarChart3,
    tag: "Remarketing",
    title: "ML Remarketing Intelligence",
    description: "Our gradient-boosting model forecasts residual asset values, identifies optimal exit windows and maximises recovery rates across your portfolio.",
    bullets: ["Resale value prediction", "Depreciation curve forecasting", "Remarket vs. hold recommendations"],
    gradient: "from-purple-500/20 to-pink-500/20",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    icon: Receipt,
    tag: "Billing",
    title: "Automated Billing & Invoicing",
    description: "Base fee + usage-fee invoices generated automatically every billing cycle. Overdue detection, payment tracking, and CSV exports included.",
    bullets: ["Usage-based invoice generation", "Overdue detection & alerts", "One-click CSV exports for finance teams"],
    gradient: "from-orange-500/20 to-amber-500/20",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  {
    icon: Cpu,
    tag: "Telemetry",
    title: "Equipment Health Dashboard",
    description: "Real-time per-asset health panels showing the latest sensor readings alongside 30-day statistical trends.",
    bullets: ["Per-asset health snapshots", "30-day rolling statistics", "High-temp & anomaly notifications"],
    gradient: "from-rose-500/20 to-red-500/20",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
  },
  {
    icon: Map,
    tag: "Analytics",
    title: "Utilization Heatmaps & Insights",
    description: "12-week calendar heatmaps, portfolio valuation trends, and AI-generated recommendations - all presented in one analytics hub.",
    bullets: ["12-week utilization heatmap", "Portfolio valuation analytics", "AI recommendations & alerts"],
    gradient: "from-sky-500/20 to-cyan-500/20",
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-500",
  },
];

const steps = [
  {
    num: "01",
    icon: Package,
    title: "Onboard Your Fleet",
    description: "Add assets with specs, serial numbers, pricing tiers, and telematics config. Import in bulk via CSV or add manually.",
  },
  {
    num: "02",
    icon: FileText,
    title: "Originate & Service Leases",
    description: "Issue lease contracts to lessees in one click. Billing, IoT telemetry, and payment tracking activate automatically.",
  },
  {
    num: "03",
    icon: TrendingUp,
    title: "Optimise & Remarket",
    description: "Review AI-powered utilization and valuation reports. Trigger maintenance, renew leases, or remarket at peak value.",
  },
];

const roles = [
  {
    icon: Shield,
    role: "Admin",
    tagline: "Total command of the platform",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    capabilities: [
      "Manage the entire asset fleet",
      "Create, terminate & renew leases",
      "Mark invoices paid",
      "Log & resolve maintenance events",
      "Full audit log access",
      "Trigger billing cycles",
    ],
  },
  {
    icon: BarChart3,
    role: "Analyst",
    tagline: "Read-only intelligence across the portfolio",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    capabilities: [
      "Read all assets, leases & invoices",
      "Export CSVs for any dataset",
      "AI-powered valuation & forecasts",
      "Utilization heatmaps",
      "Audit log review",
      "Real-time telemetry views",
    ],
  },
  {
    icon: Building2,
    role: "Lessee",
    tagline: "Self-service for equipment lessees",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    capabilities: [
      "View own active leases",
      "Track invoices & payment status",
      "Upload lease documents",
      "Renew contracts directly",
      "Equipment health snapshots",
      "Expiry & overdue alerts",
    ],
  },
];

const testimonials = [
  {
    quote: "AssetStream cut our billing cycle from 3 days to 45 minutes. The usage-based invoicing is exactly what our team needed.",
    name: "Sarah Chen",
    title: "VP Operations, FleetPro Inc.",
    avatar: "SC",
    avatarColor: "bg-teal-500",
  },
  {
    quote: "The AI remarketing recommendations helped us realise 22% higher recovery values on end-of-lease assets. Genuinely impressive.",
    name: "Marcus Webb",
    title: "Portfolio Director, Atlas Equipment",
    avatar: "MW",
    avatarColor: "bg-purple-500",
  },
  {
    quote: "Our lessees love the self-service portal. Document uploads, renewal requests - all without calling our team.",
    name: "Priya Nair",
    title: "Head of Originations, NordCapital",
    avatar: "PN",
    avatarColor: "bg-sky-500",
  },
];

const securityItems = [
  { icon: Lock, title: "JWT Authentication", desc: "Stateless, short-lived access tokens with automatic refresh." },
  { icon: Shield, title: "Role-Based Access Control", desc: "Granular per-role permissions. Analysts never see admin controls." },
  { icon: Globe, title: "Security Headers", desc: "HSTS, X-Frame-Options, CSP and more enforced in production." },
  { icon: Activity, title: "Immutable Audit Log", desc: "Every action timestamped and persisted. Uneditable by any user." },
  { icon: AlertTriangle, title: "Throttling & Rate Limits", desc: "Per-endpoint rate limiting prevents abuse and credential stuffing." },
  { icon: RefreshCw, title: "Automated Billing Integrity", desc: "Billing runs are transactional - partial failures roll back cleanly." },
];

const faqs = [
  {
    q: "What asset categories does AssetStream support?",
    a: "Heavy equipment, medical devices, fleet vehicles, and industrial machinery out of the box. Custom categories can be added in the admin panel.",
  },
  {
    q: "How does usage-based billing work?",
    a: "IoT telemetry logs are ingested every 5 minutes. At billing cycle end, the system calculates hours x per-hour rate and adds it to the base monthly fee automatically.",
  },
  {
    q: "Can lessees sign up themselves?",
    a: "Yes. Lessees and Analysts can self-register via the signup page. Admin accounts are provisioned manually to prevent unauthorised platform control.",
  },
  {
    q: "Is there a demo I can explore right now?",
    a: "Absolutely. Use the login page demo credentials (admin / analyst / lessee, all with Demo@1234) to explore a fully pre-seeded environment with 38 assets, 19 leases, and 105 invoices.",
  },
  {
    q: "What does the ML remarketing model use to predict values?",
    a: "The gradient-boosting model is trained on asset age, total hours logged, category, maintenance history, and lease history. Predictions include confidence intervals and a sell/hold recommendation.",
  },
  {
    q: "Can I export data to Excel or our ERP?",
    a: "Admins and Analysts can export assets, leases, and invoices as CSV at any time from the respective pages. The API is also fully open for integration.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Perfect for evaluating AssetStream with real data.",
    features: ["Up to 20 assets", "1 admin seat", "5 lessee accounts", "Automated billing", "Email support"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$299",
    period: "/mo",
    description: "For growing equipment finance operations.",
    features: ["Up to 200 assets", "5 admin seats", "Unlimited lessees", "AI remarketing", "IoT telemetry", "Audit logs", "Priority support"],
    cta: "Get started",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Self-hosted or cloud, SLA-backed, custom integrations.",
    features: ["Unlimited assets", "Unlimited seats", "Custom ML models", "ERP integration", "Dedicated CSM", "SLA guarantee"],
    cta: "Contact sales",
    highlight: false,
  },
];

/* â€â€â€ FAQ Item â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€ */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15px] font-semibold text-[var(--text-primary)]">{q}</span>
        <ChevronDown size={17} className={`shrink-0 text-[var(--text-faint)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="pb-5 text-[14px] leading-relaxed text-[var(--text-muted)]">{a}</p>
      )}
    </div>
  );
}

/* â€â€â€ Page â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€â€ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Navbar />

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          HERO
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="relative overflow-hidden px-5 pb-20 pt-28 sm:px-8 sm:pt-36 lg:pb-28">
        <div className="animated-grid absolute inset-0 opacity-[0.18]" />
        <div className="mesh-gradient absolute inset-0" />
        <FloatingParticles count={60} tealRatio={0.4} />

        {/* Floating ambient orbs */}
        <div className="orb-1 pointer-events-none absolute -left-40 -top-20 h-[600px] w-[600px] rounded-full bg-[var(--accent)] opacity-[0.07] blur-[130px]" />
        <div className="orb-2 pointer-events-none absolute -right-32 top-1/4 h-[480px] w-[480px] rounded-full bg-sky-400 opacity-[0.06] blur-[110px]" />
        <div className="orb-3 pointer-events-none absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-violet-500 opacity-[0.05] blur-[120px]" />

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--background)]" />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* Left */}
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent-subtle)] px-4 py-2 text-[12px] font-semibold text-[var(--accent)]">
                <Sparkles size={13} />
                Equipment-as-a-Service Platform - v2.0
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-gradient mb-5 font-[family-name:var(--font-plus-jakarta)] text-[42px] font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-[62px]"
            >
              The Operating System<br />
              <span className="bg-gradient-to-r from-[var(--accent)] to-teal-400 bg-clip-text text-transparent">
                for Equipment Finance
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.14 }}
              className="mb-7 max-w-xl text-[16px] leading-relaxed text-[var(--text-muted)] sm:text-[18px]"
            >
              Originations, usage-based billing, live IoT telemetry, and AI-driven remarketing - unified in one platform built for modern equipment finance teams.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link href="/signup">
                <Button size="lg" className="group w-full gap-2 shadow-lg shadow-teal-500/20 hover:scale-105 transition-transform sm:w-auto">
                  Start free trial <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="group w-full gap-2 hover:scale-105 transition-transform sm:w-auto">
                  Explore live demo <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="flex flex-wrap items-center gap-x-5 gap-y-2"
            >
              {["No credit card required", "Demo data included", "Deploy in minutes"].map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                  <CheckCircle2 size={13} className="text-[var(--accent)]" />
                  {t}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Dashboard preview card */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.3 }}
            className="card-glow-pulse overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_40px_80px_rgba(0,0,0,0.14)] dark:shadow-[0_40px_80px_rgba(0,0,0,0.45)]"
          >
            {/* Browser bar */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <div className="h-3 w-3 rounded-full bg-green-400/80" />
              </div>
              <span className="ml-3 font-mono text-[11px] text-[var(--text-muted)]">assetstream.io/dashboard</span>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 gap-2 p-3.5 sm:grid-cols-4">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{kpi.label}</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="font-mono text-lg font-bold leading-none text-[var(--text-primary)]">{kpi.value}</p>
                    <span className="text-[10px] font-bold text-[var(--accent)]">{kpi.change}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="mx-3.5 mb-3 flex h-[120px] items-end gap-[3px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 pb-3 pt-4 sm:h-[148px]">
              {[38, 62, 44, 78, 52, 86, 67, 82, 58, 91, 72, 85, 63, 77, 55, 88, 70, 94].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t transition-all"
                  style={{
                    height: `${h}%`,
                    background: `linear-gradient(to top,rgba(45,212,191,${0.3 + (i / 18) * 0.55}),rgba(45,212,191,${0.12 + (i / 18) * 0.25}))`,
                  }}
                />
              ))}
            </div>

            {/* Mini lease row */}
            <div className="mx-3.5 mb-3.5 overflow-hidden rounded-xl border border-[var(--border)]">
              {[
                { name: "CAT 320 Excavator", status: "active", days: "62d", fee: "$4,200" },
                { name: "Philips MRI Scanner", status: "active", days: "12d", fee: "$8,750" },
                { name: "Volvo FH16 Truck", status: "pending", days: "--", fee: "$2,100" },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between border-b border-[var(--border)] px-3.5 py-2.5 last:border-0">
                  <span className="text-[11px] font-semibold text-[var(--text-primary)]">{row.name}</span>
                  <div className="flex items-center gap-2.5">
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${row.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>{row.status}</span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">{row.days}</span>
                    <span className="font-mono text-[11px] font-bold text-[var(--text-primary)]">{row.fee}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          TRUST BAR
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="border-y border-[var(--border)] bg-[var(--surface)] py-10">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-faint)]">
            Trusted by equipment finance leaders
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
          >
            {trustLogos.map((name) => (
              <span key={name} className="text-[13px] font-bold text-[var(--text-faint)] opacity-60 transition-opacity hover:opacity-100">
                {name}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          STATS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section id="metrics" className="py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-5 sm:grid-cols-4 sm:px-8 lg:gap-12">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-subtle)]">
                <s.icon size={19} className="text-[var(--accent)]" />
              </div>
              <p className="font-mono text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                {s.prefix}<AnimatedCounter target={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          FEATURES
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section id="features" className="bg-[var(--surface)] py-20 sm:py-28">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionLabel><Zap size={11} /> Full Lifecycle Coverage</SectionLabel>
              <h2 className="mb-4 font-[family-name:var(--font-plus-jakarta)] text-3xl font-extrabold leading-tight sm:text-4xl lg:text-[44px]">
                Everything the lifecycle demands
              </h2>
              <p className="mx-auto max-w-2xl text-[15px] text-[var(--text-muted)]">
                From issuing the first contract to recovering residual value at end-of-lease, every workflow stays aligned across finance, operations, and portfolio teams.
              </p>
            </motion.div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.45 }}
                viewport={{ once: true }}
                className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-7 transition-all duration-300 hover:border-[var(--accent)]/30 hover:shadow-[var(--card-shadow-hover)]"
              >
                <div className={`absolute -right-14 -top-14 h-44 w-44 rounded-full bg-gradient-to-br ${f.gradient} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="relative">
                  <span className={`mb-4 inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold ${f.iconBg} ${f.iconColor}`}>{f.tag}</span>
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${f.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                    <f.icon size={22} className={f.iconColor} />
                  </div>
                  <h3 className="mb-2 text-[16px] font-bold text-[var(--text-primary)]">{f.title}</h3>
                  <p className="mb-4 text-[13px] leading-relaxed text-[var(--text-muted)]">{f.description}</p>
                  <ul className="space-y-1.5">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                        <ChevronRight size={12} className={f.iconColor} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          HOW IT WORKS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionLabel><RefreshCw size={11} /> Simple by Design</SectionLabel>
              <h2 className="mb-4 font-[family-name:var(--font-plus-jakarta)] text-3xl font-extrabold sm:text-[40px]">
                Up and running in three steps
              </h2>
              <p className="mx-auto max-w-xl text-[15px] text-[var(--text-muted)]">
                No months-long implementations. AssetStream is built for fast onboarding with real data seeded out of the box.
              </p>
            </motion.div>
          </div>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* Connector line */}
            <div className="absolute left-1/2 top-12 hidden h-0.5 w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--border)] to-transparent md:block" />

            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                viewport={{ once: true }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-black text-white">
                    {s.num.slice(1)}
                  </span>
                  <s.icon size={28} className="text-[var(--accent)]" />
                </div>
                <h3 className="mb-2 text-[15px] font-bold text-[var(--text-primary)]">{s.title}</h3>
                <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          ROLES
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section id="roles" className="bg-[var(--surface)] py-20 sm:py-28">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionLabel><Users size={11} /> Built for Every Stakeholder</SectionLabel>
              <h2 className="mb-4 font-[family-name:var(--font-plus-jakarta)] text-3xl font-extrabold sm:text-[40px]">
                The right view for every role
              </h2>
              <p className="mx-auto max-w-xl text-[15px] text-[var(--text-muted)]">
                Admins, analysts, and lessees each get a purpose-built workspace. No cluttered interfaces, no security risks, no shared login sheets.
              </p>
            </motion.div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {roles.map((r, i) => (
              <motion.div
                key={r.role}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`rounded-2xl border ${r.border} bg-[var(--surface-muted)] p-7`}
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${r.bg}`}>
                  <r.icon size={22} className={r.color} />
                </div>
                <div className={`mb-1 inline-flex rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${r.bg} ${r.color}`}>{r.role}</div>
                <h3 className="mt-2 mb-1 text-[16px] font-bold text-[var(--text-primary)]">{r.role} Access</h3>
                <p className="mb-5 text-[13px] text-[var(--text-muted)]">{r.tagline}</p>
                <ul className="space-y-2.5">
                  {r.capabilities.map((cap) => (
                    <li key={cap} className="flex items-center gap-2.5 text-[13px] text-[var(--text-muted)]">
                      <CheckCircle2 size={14} className={r.color} />
                      {cap}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          TESTIMONIALS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionLabel><Sparkles size={11} /> Social Proof</SectionLabel>
              <h2 className="mb-4 font-[family-name:var(--font-plus-jakarta)] text-3xl font-extrabold sm:text-[40px]">
                Teams ship faster with AssetStream
              </h2>
            </motion.div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--card-shadow)]"
              >
                <div className="mb-5 flex text-[var(--accent)]">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.9 4.1L14 6l-3 3 .7 4.3L8 11l-3.7 2.3.7-4.3-3-3 4.1-.9L8 1z" /></svg>
                  ))}
                </div>
                <p className="mb-6 flex-1 text-[14px] italic leading-relaxed text-[var(--text-muted)]">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white ${t.avatarColor}`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text-primary)]">{t.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{t.title}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          SECURITY
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="bg-[var(--surface)] py-20 sm:py-28">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionLabel><Lock size={11} /> Enterprise Security</SectionLabel>
              <h2 className="mb-4 font-[family-name:var(--font-plus-jakarta)] text-3xl font-extrabold sm:text-[40px]">
                Security you can audit
              </h2>
              <p className="mx-auto max-w-xl text-[15px] text-[var(--text-muted)]">
                AssetStream is built with security-first defaults. Every layer - auth, data, transport, and audit - is hardened for production use.
              </p>
            </motion.div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {securityItems.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)]">
                  <item.icon size={18} className="text-[var(--accent)]" />
                </div>
                <div>
                  <p className="mb-1 text-[14px] font-bold text-[var(--text-primary)]">{item.title}</p>
                  <p className="text-[13px] text-[var(--text-muted)]">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          PRICING
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionLabel><DollarSign size={11} /> Simple Pricing</SectionLabel>
              <h2 className="mb-4 font-[family-name:var(--font-plus-jakarta)] text-3xl font-extrabold sm:text-[40px]">
                No surprises. No lock-in.
              </h2>
              <p className="mx-auto max-w-lg text-[15px] text-[var(--text-muted)]">
                Start free and scale as your portfolio grows. Every plan includes the full platform.
              </p>
            </motion.div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  plan.highlight
                    ? "border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_0_0_1px_var(--accent),var(--card-shadow-hover)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-3.5 py-1 text-[11px] font-black text-white">
                    Most Popular
                  </div>
                )}
                <p className="mb-1 text-[14px] font-bold text-[var(--text-primary)]">{plan.name}</p>
                <div className="mb-2 flex items-baseline gap-1">
                  <span className="font-mono text-[38px] font-extrabold text-[var(--text-primary)]">{plan.price}</span>
                  {plan.period && <span className="text-[14px] text-[var(--text-muted)]">{plan.period}</span>}
                </div>
                <p className="mb-6 text-[13px] text-[var(--text-muted)]">{plan.description}</p>
                <ul className="mb-8 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px] text-[var(--text-muted)]">
                      <CheckCircle2 size={14} className="shrink-0 text-[var(--accent)]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          FAQ
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section id="faq" className="bg-[var(--surface)] py-20 sm:py-28">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionLabel>Frequently Asked</SectionLabel>
              <h2 className="mb-3 font-[family-name:var(--font-plus-jakarta)] text-3xl font-extrabold sm:text-[38px]">
                Questions & Answers
              </h2>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            {faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          CTA
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section id="cta" className="relative overflow-hidden py-24 sm:py-32">
        <div className="mesh-gradient absolute inset-0 opacity-60" />
        <div className="animated-grid absolute inset-0 opacity-[0.12]" />
        <FloatingParticles count={40} tealRatio={0.5} />
        {/* Orbs */}
        <div className="orb-1 pointer-events-none absolute -left-24 top-0 h-[400px] w-[400px] rounded-full bg-[var(--accent)] opacity-[0.09] blur-[100px]" />
        <div className="orb-2 pointer-events-none absolute -right-24 bottom-0 h-[350px] w-[350px] rounded-full bg-sky-400 opacity-[0.07] blur-[100px]" />
        <div className="relative z-10 mx-auto w-full max-w-3xl px-5 text-center sm:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/20">
              <Zap size={28} className="text-[var(--accent)]" />
            </div>
            <h2 className="mb-4 font-[family-name:var(--font-plus-jakarta)] text-4xl font-extrabold leading-tight sm:text-5xl">
              Ready to modernise
              <br />
              <span className="bg-gradient-to-r from-[var(--accent)] to-teal-400 bg-clip-text text-transparent">
                your fleet finance?
              </span>
            </h2>
            <p className="mb-10 text-[16px] text-[var(--text-muted)]">
              Deploy a complete Equipment-as-a-Service platform in minutes.
              Demo data included - no setup required.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/signup">
                <Button size="lg" className="group gap-2 px-10 shadow-lg shadow-teal-500/25 hover:scale-105 transition-transform">
                  Get started free <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="group gap-2 px-10 hover:scale-105 transition-transform">
                  Explore demo <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-[12px] text-[var(--text-faint)]">
              No credit card required &middot; Demo credentials provided &middot; Deploy in &lt;5 min
            </p>
          </motion.div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          FOOTER
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-2">
              <div className="mb-4 flex items-center gap-2.5">
                <BrandMark />
                <span className="font-[family-name:var(--font-plus-jakarta)] text-[15px] font-bold text-[var(--text-primary)]">AssetStream</span>
              </div>
              <p className="mb-5 max-w-xs text-[13px] leading-relaxed text-[var(--text-muted)]">
                The operating system for modern equipment finance - originations, servicing, and remarketing in one platform.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)]">
                  <Shield size={14} className="text-[var(--accent)]" />
                </div>
                <span className="text-[12px] text-[var(--text-muted)]">SOC 2 Type II Compliant</span>
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-faint)]">Product</p>
              <ul className="space-y-2.5">
                {["Features", "How it works", "Pricing", "Changelog", "Roadmap"].map((item) => (
                  <li key={item}><a href="#features" className="text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Platform */}
            <div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-faint)]">Platform</p>
              <ul className="space-y-2.5">
                {["Originations", "Servicing", "Billing", "Remarketing", "Analytics"].map((item) => (
                  <li key={item}><a href="#features" className="text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-faint)]">Company</p>
              <ul className="space-y-2.5">
                {["About", "Blog", "Careers", "Security", "Contact"].map((item) => (
                  <li key={item}><a href="#" className="text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] pt-8 sm:flex-row">
            <p className="text-[12px] text-[var(--text-faint)]">&copy; 2026 AssetStream Inc. All rights reserved.</p>
            <div className="flex items-center gap-6 text-[12px] text-[var(--text-faint)]">
              <a href="#" className="hover:text-[var(--text-muted)]">Privacy Policy</a>
              <a href="#" className="hover:text-[var(--text-muted)]">Terms of Service</a>
              <a href="#" className="hover:text-[var(--text-muted)]">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingParticles } from "@/components/ui/floating-particles";
import {
  ArrowRight, BarChart3, Building2, CheckCircle2, ChevronLeft,
  Eye, EyeOff, FileText, Layers, Receipt, Shield, Sparkles, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";

// â”€â”€â”€ Zod schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const signupSchema = z
  .object({
    username: z.string().min(3, "At least 3 characters"),
    email: z.string().email("Enter a valid email"),
    company_name: z.string().min(2, "Company name required"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type SignupForm = z.infer<typeof signupSchema>;
type Role = "lessee" | "analyst";

// â”€â”€â”€ Brand mark â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Password strength meter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const strength = checks.filter(Boolean).length;
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < strength ? colors[Math.max(strength - 1, 0)] : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className="text-[12px] text-[var(--text-muted)]">{labels[strength - 1]} password</p>
      )}
    </div>
  );
}

// â”€â”€â”€ Role definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ROLES: {
  id: Role;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  accentBg: string;
  features: string[];
}[] = [
  {
    id: "lessee",
    title: "Equipment Lessee",
    subtitle: "I want to lease & manage equipment",
    icon: Building2,
    color: "text-emerald-500",
    accentBg: "bg-emerald-500/10",
    features: [
      "View and manage your active leases",
      "Track invoices and payment history",
      "Upload & store lease documents",
      "Monitor equipment utilization",
      "Renew contracts directly",
    ],
  },
  {
    id: "analyst",
    title: "Portfolio Analyst",
    subtitle: "I want to analyze the full portfolio",
    icon: BarChart3,
    color: "text-sky-500",
    accentBg: "bg-sky-500/10",
    features: [
      "Full read access to all assets & leases",
      "View all invoices across the portfolio",
      "AI-powered valuation & depreciation forecasts",
      "Export CSV reports for any dataset",
      "Utilization heatmaps & trend analytics",
      "Audit log review",
    ],
  },
];

// â”€â”€â”€ Left panel content per step â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LeftPanel({ role }: { role: Role | null }) {
  if (!role) {
    return (
      <div>
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-[12px] font-semibold text-[var(--accent)]">
          <Sparkles size={12} /> Choose your workspace
        </div>
        <h2 className="mb-4 font-[family-name:var(--font-plus-jakarta)] text-[32px] font-extrabold leading-tight text-[var(--text-primary)]">
          One platform for<br />
          <span className="bg-gradient-to-r from-[var(--accent)] to-teal-400 bg-clip-text text-transparent">
            every stakeholder.
          </span>
        </h2>
        <p className="mb-10 max-w-md text-[15px] leading-relaxed text-[var(--text-muted)]">
          AssetStream adapts to your role â€” whether you lease heavy equipment or analyse portfolio performance.
        </p>
        <div className="space-y-3">
          {[
            { icon: Zap, title: "Instant Onboarding", desc: "Set up in minutes, no credit card required" },
            { icon: Shield, title: "Role-Based Access", desc: "Every user only sees what's relevant to them" },
            { icon: Layers, title: "Full Platform Access", desc: "Originations, servicing, remarketing in one place" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)]">
                <item.icon size={16} className="text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="text-[12px] text-[var(--text-muted)]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const r = ROLES.find((x) => x.id === role)!;
  const roleIcons: Record<Role, { icon: React.ElementType; label: string }[]> = {
    lessee: [
      { icon: FileText, label: "Active Leases" },
      { icon: Receipt, label: "Invoice Tracking" },
      { icon: CheckCircle2, label: "Document Upload" },
    ],
    analyst: [
      { icon: BarChart3, label: "Full Analytics" },
      { icon: Shield, label: "Audit Logs" },
      { icon: FileText, label: "CSV Exports" },
    ],
  };

  return (
    <div>
      <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${r.accentBg} ${r.color}`}>
        <r.icon size={12} />
        {r.title}
      </div>
      <h2 className="mb-4 font-[family-name:var(--font-plus-jakarta)] text-[32px] font-extrabold leading-tight text-[var(--text-primary)]">
        {role === "lessee" ? (
          <>Manage your<br /><span className="bg-gradient-to-r from-[var(--accent)] to-teal-400 bg-clip-text text-transparent">equipment portfolio.</span></>
        ) : (
          <>Analyse the<br /><span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">entire fleet.</span></>
        )}
      </h2>
      <p className="mb-8 max-w-md text-[15px] leading-relaxed text-[var(--text-muted)]">
        {role === "lessee"
          ? "Track your active leases, pay invoices, upload documents and monitor equipment health â€” all from one dashboard."
          : "Get full read access to every asset, lease, invoice and KPI across the platform, with AI-powered insights and one-click CSV exports."}
      </p>
      <div className="mb-8 grid grid-cols-3 gap-3">
        {roleIcons[role].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-center">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${r.accentBg}`}>
              <Icon size={18} className={r.color} />
            </div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">{label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {r.features.map((f) => (
          <div key={f} className="flex items-center gap-2.5 text-[13px] text-[var(--text-muted)]">
            <CheckCircle2 size={14} className={r.color} />
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

// â”€â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const password = watch("password", "");

  const onSubmit = async (values: SignupForm) => {
    if (!selectedRole) return;
    setServerError("");
    try {
      await api.post("/auth/register/", {
        username: values.username,
        email: values.email,
        company_name: values.company_name,
        password: values.password,
        role: selectedRole,
      });
      const { data } = await api.post("/auth/login/", {
        username: values.username,
        password: values.password,
      });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      router.push("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[]> } };
      const errData = axiosErr?.response?.data;
      if (errData) setServerError(Object.values(errData).flat().join(". "));
      else setServerError("Registration failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Left branding panel */}
      <div className="relative hidden w-[52%] flex-col justify-between overflow-hidden border-r border-[var(--border)] bg-[var(--surface)] p-12 lg:flex xl:p-16">
        {/* Ambient orbs */}
        <div className="orb-2 pointer-events-none absolute -left-24 -top-16 h-[400px] w-[400px] rounded-full bg-[var(--accent)] opacity-[0.08] blur-[110px]" />
        <div className="orb-3 pointer-events-none absolute -right-16 top-1/3 h-[300px] w-[300px] rounded-full bg-sky-400 opacity-[0.06] blur-[90px]" />
        <div className="orb-1 pointer-events-none absolute bottom-0 left-1/4 h-[320px] w-[320px] rounded-full bg-violet-500 opacity-[0.06] blur-[100px]" />
        <div className="animated-grid absolute inset-0 opacity-[0.08]" />
        <FloatingParticles count={45} tealRatio={0.35} />

        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link href="/" className="group mb-16 flex items-center gap-2.5">
              <BrandMark />
              <span className="font-[family-name:var(--font-plus-jakarta)] text-[17px] font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                AssetStream
              </span>
            </Link>
          </motion.div>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRole ?? "default"}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <LeftPanel role={selectedRole} />
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="relative z-10 text-[12px] text-[var(--text-muted)]">&copy; 2026 AssetStream Inc. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
        <FloatingParticles count={20} tealRatio={0.3} />
        <div className="orb-3 pointer-events-none absolute right-0 top-0 h-[280px] w-[280px] rounded-full bg-[var(--accent)] opacity-[0.05] blur-[90px]" />
        <div className="relative z-10 w-full max-w-[440px]">
          {/* Mobile brand */}
          <Link href="/" className="mb-10 flex items-center justify-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="font-[family-name:var(--font-plus-jakarta)] text-lg font-bold text-[var(--text-primary)]">AssetStream</span>
          </Link>

          {/* Steps with animated transitions */}
          <AnimatePresence mode="wait">
          {/* STEP 1: Role selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8">
                <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[28px] font-extrabold text-[var(--text-primary)]">
                  Create your account
                </h1>
                <p className="mt-2 text-[14px] text-[var(--text-muted)]">
                  First, tell us how you&apos;ll be using AssetStream.
                </p>
              </div>

              <div className="space-y-3">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id)}
                    className={`w-full rounded-2xl border-2 p-5 text-left transition-all duration-150 ${
                      selectedRole === r.id
                        ? "border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_0_0_1px_var(--accent)]"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40"
                    }`}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${r.accentBg}`}>
                        <r.icon size={20} className={r.color} />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[var(--text-primary)]">{r.title}</p>
                        <p className="text-[12px] text-[var(--text-muted)]">{r.subtitle}</p>
                      </div>
                      {selectedRole === r.id && (
                        <CheckCircle2 size={18} className="ml-auto shrink-0 text-[var(--accent)]" />
                      )}
                    </div>
                    <ul className="space-y-1.5 pl-1">
                      {r.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                          <span className={`h-1.5 w-1.5 rounded-full ${selectedRole === r.id ? "bg-[var(--accent)]" : "bg-[var(--text-faint)]"}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              <p className="mt-4 text-center text-[12px] text-[var(--text-faint)]">
                Need admin access? Contact your platform administrator.
              </p>

              <Button
                className="mt-6 h-11 w-full gap-2 text-[14px]"
                disabled={!selectedRole}
                onClick={() => setStep(2)}
              >
                Continue as {selectedRole === "lessee" ? "Lessee" : selectedRole === "analyst" ? "Analyst" : "..."}
                <ArrowRight size={15} />
              </Button>

              <p className="mt-6 text-center text-[13px] text-[var(--text-muted)]">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">Sign in</Link>
              </p>
            </motion.div>
          )}

          {/* STEP 2: Account details */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mb-6 flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                <ChevronLeft size={15} />
                Back
              </button>

              <div className="mb-6">
                <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold ${
                  selectedRole === "lessee" ? "bg-emerald-500/10 text-emerald-500" : "bg-sky-500/10 text-sky-500"
                }`}>
                  {selectedRole === "lessee" ? <Building2 size={12} /> : <BarChart3 size={12} />}
                  {selectedRole === "lessee" ? "Equipment Lessee" : "Portfolio Analyst"}
                </div>
                <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[28px] font-extrabold text-[var(--text-primary)]">
                  Set up your account
                </h1>
                <p className="mt-2 text-[14px] text-[var(--text-muted)]">
                  Create your workspace to get started.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-[13px]">Username</Label>
                    <Input id="username" placeholder="johndoe" autoComplete="username" {...register("username")} />
                    {errors.username && <p className="text-[12px] text-[var(--destructive)]">{errors.username.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_name" className="text-[13px]">Company</Label>
                    <Input id="company_name" placeholder="Acme Corp" {...register("company_name")} />
                    {errors.company_name && <p className="text-[12px] text-[var(--destructive)]">{errors.company_name.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[13px]">Work email</Label>
                  <Input id="email" type="email" placeholder="john@company.com" autoComplete="email" {...register("email")} />
                  {errors.email && <p className="text-[12px] text-[var(--destructive)]">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[13px]">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                  {errors.password && <p className="text-[12px] text-[var(--destructive)]">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-[13px]">Confirm password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    {...register("confirm_password")}
                  />
                  {errors.confirm_password && (
                    <p className="text-[12px] text-[var(--destructive)]">{errors.confirm_password.message}</p>
                  )}
                </div>

                {serverError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-[var(--destructive)] dark:border-red-500/20 dark:bg-red-500/10">
                    {serverError}
                  </div>
                )}

                <Button type="submit" className="h-11 w-full gap-2 text-[14px]" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : <>Create account <ArrowRight size={15} /></>}
                </Button>
              </form>

              <p className="mt-6 text-center text-[13px] text-[var(--text-muted)]">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">Sign in</Link>
              </p>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}


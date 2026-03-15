"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Building2, Check, ClipboardCopy, Eye, EyeOff, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";
import { FloatingParticles } from "@/components/ui/floating-particles";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

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

const highlights = [
  {
    icon: Shield,
    title: "Admin",
    desc: "Full platform control: manage assets, leases, invoices, users and audit logs",
    badge: "Full Access",
    badgeColor: "bg-violet-500/15 text-violet-500",
  },
  {
    icon: BarChart3,
    title: "Analyst",
    desc: "Read the entire portfolio, export CSVs, view AI insights and utilization heatmaps",
    badge: "Read + Export",
    badgeColor: "bg-sky-500/15 text-sky-500",
  },
  {
    icon: Building2,
    title: "Lessee",
    desc: "Track active leases, pay invoices, upload documents and renew contracts",
    badge: "Own Data",
    badgeColor: "bg-emerald-500/15 text-emerald-500",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [copiedUser, setCopiedUser] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const handleCopyUser = (username: string) => {
    navigator.clipboard.writeText(username);
    setCopiedUser(username);
    setTimeout(() => setCopiedUser(null), 1500);
  };

  const onSubmit = async (values: LoginForm) => {
    setServerError("");
    try {
      const { data } = await api.post("/auth/login/", {
        username: values.username,
        password: values.password,
      });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      setLoginSuccess(true);
      setTimeout(() => router.push("/dashboard"), 500);
    } catch {
      setServerError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Left panel - Branding */}
      <div className="relative hidden w-[52%] flex-col justify-between overflow-hidden border-r border-[var(--border)] bg-[var(--surface)] p-12 lg:flex xl:p-16">
        {/* Ambient orbs */}
        <div className="orb-1 pointer-events-none absolute -left-24 -top-16 h-[420px] w-[420px] rounded-full bg-[var(--accent)] opacity-[0.08] blur-[110px]" />
        <div className="orb-2 pointer-events-none absolute -right-16 bottom-1/4 h-[320px] w-[320px] rounded-full bg-violet-500 opacity-[0.07] blur-[100px]" />
        <div className="orb-3 pointer-events-none absolute bottom-0 left-1/3 h-[280px] w-[280px] rounded-full bg-sky-400 opacity-[0.06] blur-[90px]" />
        <div className="animated-grid absolute inset-0 opacity-[0.08]" />
        <FloatingParticles count={45} tealRatio={0.35} />

        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link href="/" className="flex items-center gap-2.5 group mb-16">
              <BrandMark />
              <span className="text-gradient font-[family-name:var(--font-plus-jakarta)] text-[17px] font-bold group-hover:text-[var(--accent)] transition-colors">
                AssetStream
              </span>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}>
            <h2 className="mb-4 font-[family-name:var(--font-plus-jakarta)] text-[32px] font-extrabold leading-tight text-[var(--text-primary)]">
              Welcome back to your
              <br />
              <span className="bg-gradient-to-r from-[var(--accent)] to-teal-400 bg-clip-text text-transparent">finance command center.</span>
            </h2>
            <p className="mb-10 max-w-md text-[15px] leading-relaxed text-[var(--text-muted)]">
              Track equipment utilization, manage invoices, and monitor lease performance from one unified dashboard.
            </p>
          </motion.div>

          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Access levels
          </div>
          <div className="space-y-3">
            {highlights.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.22 + i * 0.1 }}
                className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 transition-all duration-200 hover:border-[var(--accent)]/20"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)]">
                  <item.icon size={16} className="text-[var(--accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">{item.title}</p>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${item.badgeColor}`}>{item.badge}</span>
                  </div>
                  <p className="text-[12px] text-[var(--text-muted)]">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[12px] text-[var(--text-muted)]">&copy; 2026 AssetStream Inc. All rights reserved.</p>
      </div>

      {/* Right panel - Form */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
        {/* Subtle orb on mobile / right side */}
        <div className="orb-3 pointer-events-none absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-[var(--accent)] opacity-[0.05] blur-[100px]" />
        <FloatingParticles count={20} tealRatio={0.3} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative z-10 w-full max-w-[420px]"
        >
          <Link href="/" className="mb-10 flex items-center justify-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="font-[family-name:var(--font-plus-jakarta)] text-lg font-bold text-[var(--text-primary)]">
              AssetStream
            </span>
          </Link>

          <div className="mb-8">
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[28px] font-extrabold text-[var(--text-primary)]">
              Sign in
            </h1>
            <p className="mt-2 text-[14px] text-[var(--text-muted)]">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[13px]">Username</Label>
              <Input id="username" placeholder="admin" autoComplete="username" {...register("username")} />
              {errors.username && <p className="text-[12px] text-[var(--destructive)]">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[13px]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  autoComplete="current-password"
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
              {errors.password && <p className="text-[12px] text-[var(--destructive)]">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-[var(--destructive)] dark:border-red-500/20 dark:bg-red-500/10">
                {serverError}
              </div>
            )}

            <Button type="submit" className="h-11 w-full gap-2 text-[14px]" disabled={isSubmitting || loginSuccess}>
              {loginSuccess ? (
                <span className="animate-scale-in flex items-center gap-2 text-green-400">
                  <Check size={16} /> Success
                </span>
              ) : isSubmitting ? (
                "Signing in..."
              ) : (
                <>Sign in <ArrowRight size={15} /></>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-[13px] text-[var(--text-muted)]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-[var(--accent)] hover:underline">
              Create one
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <Zap size={13} className="text-[var(--accent)]" />
              <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Demo Credentials</p>
            </div>
            <div className="space-y-1.5">
              {[
                { label: "Admin", username: "admin" },
                { label: "Analyst", username: "analyst" },
                { label: "Lessee", username: "lessee" },
              ].map((cred) => (
                <button
                  key={cred.username}
                  type="button"
                  onClick={() => handleCopyUser(cred.username)}
                  className="flex w-full items-center justify-between rounded-lg bg-[var(--surface)] px-3 py-2 border border-[var(--border)] transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent-subtle)] group"
                >
                  <span className="text-[12px] text-[var(--text-muted)]">{cred.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-semibold text-[var(--text-primary)]">{cred.username} / Demo@1234</span>
                    {copiedUser === cred.username ? (
                      <Check size={12} className="text-[var(--accent)] animate-scale-in" />
                    ) : (
                      <ClipboardCopy size={12} className="text-[var(--text-faint)] group-hover:text-[var(--accent)] transition-colors" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

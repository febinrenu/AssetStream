"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { MessageSquare, Send, Sparkles, X } from "lucide-react";
import { useSendChatMessage } from "@/hooks/useAI";
import type { ChatMessage } from "@/types/ai";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(ts: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(ts));
  } catch { return ""; }
}

function renderMarkdown(text: string): React.ReactNode {
  return text.split("\n").map((line, li, arr) => {
    const isBullet = /^[\s\-•]+/.test(line) && line.trim().length > 1;
    const content = isBullet ? line.replace(/^[\s•\-]+/, "").trim() : line;
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i} className="font-semibold text-[var(--accent)]">{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    );
    if (isBullet) return <li key={li} className="ml-4 list-disc text-[12.5px] leading-relaxed">{parts}</li>;
    return li < arr.length - 1
      ? <span key={li}>{parts}<br /></span>
      : <span key={li}>{parts}</span>;
  });
}

// ── Inline chart ──────────────────────────────────────────────────────────────

const PIE_COLORS = ["#0D9488", "#2dd4bf", "#f59e0b", "#8b5cf6", "#ec4899", "#60a5fa"];

function InlineChart({ chartData }: { chartData: { type: string | null; data: Record<string, unknown> | null } }) {
  if (!chartData?.data || !chartData.type || !["bar", "pie"].includes(chartData.type)) return null;
  const nested = chartData.data as Record<string, unknown>;
  const items = nested.data as Record<string, unknown>[] | undefined;
  if (!items || items.length === 0) return null;

  const xKey = (nested.xKey as string) || (nested.nameKey as string) || Object.keys(items[0])[0];
  const barKey = (nested.dataKey as string) || Object.keys(items[0])[1] || "value";

  const tipStyle: React.CSSProperties = {
    background: "var(--surface-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 11,
    color: "var(--text-primary)",
  };

  if (chartData.type === "pie") {
    return (
      <div className="mt-3 rounded-xl bg-[var(--surface-muted)] p-2">
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie data={items as Record<string, string | number>[]} dataKey={barKey} nameKey={xKey}
              cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={3} strokeWidth={0}>
              {items.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-[var(--surface-muted)] p-2">
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={items as Record<string, string | number>[]} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 8, fill: "var(--text-faint)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 8, fill: "var(--text-faint)" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tipStyle} />
          <Bar dataKey={barKey} fill="var(--accent)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="inline-block h-[5px] w-[5px] rounded-full bg-[var(--accent)]"
          style={{ animation: `float-dot 1.4s ease-in-out ${i * 0.18}s infinite` }} />
      ))}
    </span>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`flex w-full gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isUser && (
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/20">
          <Sparkles size={11} />
        </div>
      )}
      <div className={`max-w-[82%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={`rounded-2xl px-3.5 py-2.5 ${
          isUser
            ? "rounded-tr-sm bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-md"
            : "rounded-tl-sm border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)]"
        }`}>
          {isUser ? (
            <p className="text-[12.5px] leading-relaxed">{msg.content}</p>
          ) : (
            <div className="text-[12.5px] leading-relaxed text-[var(--text-primary)]">
              {renderMarkdown(msg.content)}
            </div>
          )}
          {!isUser && msg.chart_data?.type && msg.chart_data?.data && (
            <InlineChart chartData={msg.chart_data} />
          )}
        </div>
        <p className="mt-1 text-[9.5px] text-[var(--text-faint)]">{fmt(msg.timestamp)}</p>
      </div>
    </motion.div>
  );
}

// ── Quick suggestions ─────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  "Portfolio health snapshot",
  "Overdue invoice exposure",
  "Fleet utilization status",
  "Top revenue assets",
  "High-risk leases",
  "Upcoming lease expirations",
];

// ── Main component ────────────────────────────────────────────────────────────

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMutation = useSendChatMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMutation.isPending]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setHasUnread(false);
    }
  }, [open]);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sendMutation.isPending) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: Date.now(), role: "user", content, intent: "",
      chart_data: null, timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await sendMutation.mutateAsync({ message: content, session_id: sessionId });
      setSessionId(res.session_id);
      setMessages((prev) => [...prev, res.message]);
      if (!open) setHasUnread(true);
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, role: "assistant",
        content: "I ran into an error. Please try again in a moment.",
        intent: "error", chart_data: null, timestamp: new Date().toISOString(),
      }]);
    }
  }, [input, sessionId, sendMutation, open]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const showWelcome = messages.length === 0 && !sendMutation.isPending;

  return (
    <>
      <style>{`
        @keyframes float-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes aria-pulse {
          0%, 100% { box-shadow: 0 8px 25px rgba(13,148,136,0.45), 0 0 0 0 rgba(13,148,136,0.4); }
          50% { box-shadow: 0 8px 25px rgba(13,148,136,0.45), 0 0 0 8px rgba(13,148,136,0); }
        }
      `}</style>

      {/* ── Floating button ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 text-white"
            style={{ animation: "aria-pulse 3s ease-in-out infinite" }}
            aria-label="Open AI Chat"
          >
            {hasUnread && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">!</span>
            )}
            <MessageSquare size={22} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 32, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="fixed bottom-6 right-6 z-[9999] flex h-[580px] w-[390px] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            style={{ boxShadow: "var(--card-shadow), 0 20px 60px rgba(0,0,0,0.15)" }}
          >
            {/* ── Header ── */}
            <div
              className="relative flex shrink-0 items-center gap-3 overflow-hidden px-5 py-4"
              style={{ background: "linear-gradient(135deg, #0D9488 0%, #0891B2 60%, #0e7490 100%)" }}
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-xl" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 shadow-inner">
                <Sparkles size={17} className="text-white" />
              </div>
              <div className="relative flex-1">
                <p className="text-[14px] font-bold tracking-tight text-white">Aria</p>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-300" />
                  <span className="text-[10.5px] font-medium text-white/70">AI Portfolio Analyst · Online</span>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setOpen(false)}
                className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white/80 transition-colors hover:bg-white/25"
              >
                <X size={13} />
              </motion.button>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 space-y-3.5 overflow-y-auto bg-[var(--surface)] px-4 py-4">
              {showWelcome ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] shadow-lg">
                    <Sparkles size={28} className="text-[var(--accent)]" />
                  </div>
                  <p className="text-[15px] font-bold text-[var(--text-primary)]">Hi, I&apos;m Aria</p>
                  <p className="mt-1.5 max-w-[260px] text-[12px] leading-relaxed text-[var(--text-muted)]">
                    Your AI Portfolio Analyst. Ask me anything about your assets, revenue, risk, or leases.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                    {QUICK_QUESTIONS.slice(0, 4).map((q) => (
                      <motion.button key={q} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => handleSend(q)}
                        className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent-subtle)] px-3 py-1.5 text-[11px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20"
                      >
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((msg) => <Bubble key={msg.id} msg={msg} />)}
                </AnimatePresence>
              )}

              {sendMutation.isPending && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 shadow-md">
                    <Sparkles size={11} className="text-white" />
                  </div>
                  <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2.5">
                    <TypingDots />
                    <span className="text-[11px] text-[var(--text-muted)]">Thinking…</span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Quick chips (after first message) ── */}
            {messages.length > 0 && !sendMutation.isPending && (
              <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
                <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {QUICK_QUESTIONS.slice(0, 5).map((q) => (
                    <button key={q} onClick={() => handleSend(q)}
                      className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10.5px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Input ── */}
            <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3.5">
              <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)]">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={sendMutation.isPending}
                  placeholder="Ask about revenue, risk, assets…"
                  className="flex-1 bg-transparent text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none disabled:opacity-50"
                />
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sendMutation.isPending}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md disabled:opacity-30"
                >
                  <Send size={12} />
                </motion.button>
              </div>
              <p className="mt-2 text-center text-[9.5px] text-[var(--text-faint)]">
                Powered by Groq · Qwen3-32B
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

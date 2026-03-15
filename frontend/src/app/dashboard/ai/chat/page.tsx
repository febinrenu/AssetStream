"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Loader2, MessageSquare, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatHistory, useSendChatMessage } from "@/hooks/useAI";
import type { ChatMessage } from "@/types/ai";
import { getChartColors } from "@/lib/chart-colors";

function formatTimestamp(ts: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold text-[var(--accent)]">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
          style={{
            animation: `typing-bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

const PIE_COLORS = ["#0D9488", "#2dd4bf", "#f59e0b", "#8b5cf6", "#ec4899", "#60a5fa"];

function InlineChart({ chartData }: { chartData: { type: string | null; data: Record<string, unknown> | null } }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const c = getChartColors(isDark);

  if (!chartData.data || !chartData.type) return null;
  if (chartData.type !== "bar" && chartData.type !== "line" && chartData.type !== "pie") return null;

  // The backend sends chart_data as { data: [...], xKey: "...", dataKey: "...", ... }
  const nested = chartData.data as Record<string, unknown>;
  const items = nested.data as Record<string, unknown>[] | undefined;
  if (!items || items.length === 0) return null;

  const xKey = (nested.xKey as string) || (nested.nameKey as string) || Object.keys(items[0])[0];
  const barKey = (nested.dataKey as string) || Object.keys(items[0])[1] || "value";

  if (chartData.type === "pie") {
    return (
      <div className="mt-3">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={items as Record<string, string | number>[]}
              dataKey={barKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={3}
              strokeWidth={0}
            >
              {items.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: 10,
                fontSize: 11,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={items as Record<string, string | number>[]}
          margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 9, fill: c.text }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: c.text }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: c.surface,
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              fontSize: 11,
            }}
          />
          <Bar dataKey={barKey} fill={c.accent} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[75%] ${isUser ? "" : "flex gap-2"}`}>
        {!isUser && (
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
            <Bot size={13} />
          </div>
        )}
        <div>
          <div
            className={`rounded-2xl p-3 ${
              isUser
                ? "bg-[var(--accent)]/20 text-[var(--text-primary)]"
                : "bg-[var(--surface-muted)] text-[var(--text-primary)]"
            }`}
          >
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{isUser ? msg.content : renderMarkdown(msg.content)}</p>
            {!isUser && msg.chart_data && msg.chart_data.type && msg.chart_data.data && (
              <InlineChart chartData={msg.chart_data} />
            )}
          </div>
          <p
            className={`mt-1 text-[10px] text-[var(--text-faint)] ${isUser ? "text-right" : "text-left"}`}
          >
            {formatTimestamp(msg.timestamp)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: history, isLoading: historyLoading } = useChatHistory(null);
  const sendMutation = useSendChatMessage();

  // Load history on mount
  useEffect(() => {
    if (history) {
      if (history.session_id) setSessionId(history.session_id);
      if (history.messages.length > 0) setMessages(history.messages);
      if (history.example_questions.length > 0) setExampleQuestions(history.example_questions);
    }
  }, [history]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMutation.isPending]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sendMutation.isPending) return;

    setInput("");

    // Optimistic user message
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content,
      intent: "",
      chart_data: null,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await sendMutation.mutateAsync({
        message: content,
        session_id: sessionId,
      });
      setSessionId(response.session_id);
      setMessages((prev) => [...prev, response.message]);
      if (response.example_questions?.length > 0) {
        setExampleQuestions(response.example_questions);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        intent: "error",
        chart_data: null,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const showWelcome = !historyLoading && messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">Analytics Chat</h1>
        <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
          Ask questions about your portfolio in plain English
        </p>
      </div>

      {/* Chat Card */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="shrink-0 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
              <Sparkles size={13} />
            </div>
            <CardTitle className="text-[13px] font-semibold">AI Portfolio Analyst</CardTitle>
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[var(--success)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              Online
            </span>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {historyLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-2xl" />
                ))}
              </div>
            ) : showWelcome ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                  <MessageSquare size={24} />
                </div>
                <p className="text-[16px] font-bold text-[var(--text-primary)]">
                  Hello! I&apos;m your AI Portfolio Analyst.
                </p>
                <p className="mt-1 max-w-sm text-[13px] text-[var(--text-muted)]">
                  Ask me anything about your assets, leases, revenue, or portfolio health.
                </p>
              </motion.div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} msg={msg} />
                ))}
              </AnimatePresence>
            )}

            {/* Loading indicator */}
            {sendMutation.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                  <Bot size={13} />
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl bg-[var(--surface-muted)] px-4 py-3">
                  <TypingDots />
                  <span className="text-[12px] text-[var(--text-muted)]">Thinking</span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Example Questions */}
          {exampleQuestions.length > 0 && !sendMutation.isPending && (
            <div className="shrink-0 border-t border-[var(--border)] px-5 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-faint)]">
                Try asking:
              </p>
              <div className="flex flex-wrap gap-2">
                {exampleQuestions.slice(0, 4).map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    disabled={sendMutation.isPending}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="shrink-0 border-t border-[var(--border)] px-4 py-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about revenue trends, overdue invoices, asset health…"
                disabled={sendMutation.isPending}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || sendMutation.isPending}
                size="sm"
                className="shrink-0 gap-1.5"
              >
                {sendMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

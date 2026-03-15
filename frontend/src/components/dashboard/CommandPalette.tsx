"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Bot,
  Brain,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Search,
  ShieldAlert,
  Sliders,
  Sparkles,
  Ticket,
  Wrench,
  X,
} from "lucide-react";

interface Command {
  label: string;
  href: string;
  icon: React.ReactNode;
  category: string;
}

const COMMANDS: Command[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={15} />, category: "Navigate" },
  { label: "Assets", href: "/dashboard/assets", icon: <Package size={15} />, category: "Navigate" },
  { label: "Leases", href: "/dashboard/leases", icon: <FileText size={15} />, category: "Navigate" },
  { label: "Invoices", href: "/dashboard/invoices", icon: <Receipt size={15} />, category: "Navigate" },
  { label: "Billing", href: "/dashboard/billing", icon: <BarChart3 size={15} />, category: "Navigate" },
  { label: "Service Tickets", href: "/dashboard/tickets", icon: <Ticket size={15} />, category: "Navigate" },
  { label: "AI Insights", href: "/dashboard/insights", icon: <Brain size={15} />, category: "Navigate" },
  { label: "Lease Copilot", href: "/dashboard/ai/copilot", icon: <Sparkles size={15} />, category: "AI Lab" },
  { label: "Risk Scores", href: "/dashboard/ai/risk-scores", icon: <ShieldAlert size={15} />, category: "AI Lab" },
  { label: "Analytics Chat", href: "/dashboard/ai/chat", icon: <Bot size={15} />, category: "AI Lab" },
  { label: "Scenario Simulator", href: "/dashboard/ai/simulator", icon: <Sliders size={15} />, category: "AI Lab" },
  { label: "Maintenance AI", href: "/dashboard/ai/maintenance", icon: <Wrench size={15} />, category: "AI Lab" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const filtered = query
    ? COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape") setOpen(false);
    },
    []
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  function handleSelect(command: Command) {
    setOpen(false);
    setQuery("");
    router.push(command.href);
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex]);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[20%] z-[101] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
              <Search size={16} className="shrink-0 text-[var(--text-faint)]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Search pages, actions..."
                className="flex-1 bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none"
              />
              <kbd className="hidden rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-faint)] sm:inline-block">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[340px] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
                  No results found
                </p>
              ) : (
                <>
                  {Array.from(new Set(filtered.map((c) => c.category))).map((cat) => (
                    <div key={cat}>
                      <p className="mb-1 mt-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                        {cat}
                      </p>
                      {filtered
                        .filter((c) => c.category === cat)
                        .map((cmd) => {
                          const idx = filtered.indexOf(cmd);
                          return (
                            <button
                              key={cmd.href}
                              onClick={() => handleSelect(cmd)}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                                idx === selectedIndex
                                  ? "bg-[var(--accent)] text-white"
                                  : "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                              }`}
                            >
                              <span className={idx === selectedIndex ? "text-white" : "text-[var(--text-muted)]"}>
                                {cmd.icon}
                              </span>
                              {cmd.label}
                            </button>
                          );
                        })}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-2.5 text-[10px] text-[var(--text-faint)]">
              <span><kbd className="font-bold">&#8593;&#8595;</kbd> Navigate</span>
              <span><kbd className="font-bold">&#8629;</kbd> Select</span>
              <span><kbd className="font-bold">esc</kbd> Close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

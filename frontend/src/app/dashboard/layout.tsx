"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { Toaster } from "@/components/ui/toaster";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { FloatingChat } from "@/components/dashboard/FloatingChat";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { collapsed } = useSidebar();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="bg-[var(--background)]">
      <Sidebar />
      {/* Offset by sidebar width, content scrolls naturally with the page */}
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ease-in-out ${
          collapsed ? "lg:pl-[68px]" : "lg:pl-[248px]"
        }`}
      >
        <Topbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1440px] space-y-6">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
      <CommandPalette />
      <FloatingChat />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  );
}

"use client";

import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/sidebar";

const NO_SHELL_ROUTES = new Set(["/", "/login"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (NO_SHELL_ROUTES.has(pathname ?? "")) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}

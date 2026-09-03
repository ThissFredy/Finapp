import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UserMenu } from "@/components/auth/UserMenu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { DesktopNav, MobileTabBar } from "@/components/layout/NavBar";
import { getServerSession } from "@/core/services/auth.service";

export const metadata: Metadata = {
  title: {
    template: "%s — FinApp",
    default: "FinApp",
  },
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login?from=/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-6">
        <div className="glass mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 rounded-2xl px-3 sm:h-16 sm:px-4">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 rounded-xl p-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.62_0.22_330)] font-bold text-primary-foreground shadow-md shadow-primary/30 transition-transform duration-300 group-hover:scale-105">
              F
            </span>
            <span className="text-lg font-bold tracking-tight">FinApp</span>
          </Link>

          <DesktopNav />

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu session={session} />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)] md:pb-8">
        {children}
      </main>

      <MobileTabBar />
    </div>
  );
}

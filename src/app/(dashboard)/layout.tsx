import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UserMenu } from "@/components/auth/UserMenu";
import { NavBar } from "@/components/layout/NavBar";
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
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background font-bold transition-transform duration-200 group-hover:scale-105">
              F
            </div>
            <span className="text-lg font-bold tracking-tight">FinApp</span>
          </Link>

          <NavBar />

          <UserMenu session={session} />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

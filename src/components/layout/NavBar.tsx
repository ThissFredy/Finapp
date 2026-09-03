"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Tags,
  ArrowLeftRight,
  Repeat,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/accounts", label: "Cuentas", icon: Wallet },
  { href: "/categories", label: "Categorías", icon: Tags },
  { href: "/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/subscriptions", label: "Suscripciones", icon: Repeat },
] as const;

function useIsActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(href + "/");
}

/** Nav superior en píldora de vidrio — desktop/tablet */
export function DesktopNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="hidden md:flex items-center gap-1 rounded-full glass px-1.5 py-1.5"
    >
      {navItems.map((item) => (
        <NavItem key={item.href} item={item} />
      ))}
    </nav>
  );
}

function NavItem({ item }: { item: (typeof navItems)[number] }) {
  const isActive = useIsActive(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/60 press-scale",
        isActive
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      <span>{item.label}</span>
    </Link>
  );
}

/** Tab bar flotante de vidrio — móvil, respeta safe area inferior */
export function MobileTabBar() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
    >
      <div className="mx-auto max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="glass-strong flex items-center justify-around rounded-3xl p-1.5">
          {navItems.map((item) => (
            <TabItem key={item.href} item={item} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function TabItem({ item }: { item: (typeof navItems)[number] }) {
  const isActive = useIsActive(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex min-h-[56px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-95",
        isActive ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-full max-w-[56px] items-center justify-center rounded-full transition-all duration-300",
          isActive && "bg-primary/15",
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "size-5 transition-transform duration-300",
            isActive && "scale-110",
          )}
        />
      </span>
      <span className="text-[10px] font-medium leading-none">
        {item.label}
      </span>
    </Link>
  );
}

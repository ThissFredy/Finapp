"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Repeat } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/accounts", label: "Cuentas" },
  { href: "/categories", label: "Categorías" },
  { href: "/transactions", label: "Transacciones" },
  { href: "/subscriptions", label: "Suscripciones", icon: Repeat },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

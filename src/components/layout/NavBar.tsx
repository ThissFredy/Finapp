"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/accounts", label: "Cuentas" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.href || pathname.startsWith(item.href + "/")
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

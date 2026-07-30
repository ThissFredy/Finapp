"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Tags,
  ArrowLeftRight,
  Repeat,
  Menu,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserMenu } from "../auth/UserMenu";
import type { AuthSession } from "@/core/models/profile";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/accounts", label: "Cuentas", icon: Wallet },
  { href: "/categories", label: "Categorías", icon: Tags },
  { href: "/transactions", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/subscriptions", label: "Suscripciones", icon: Repeat },
];

interface NavBarProps {
  session: AuthSession;
}

export function NavBar({ session }: NavBarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden md:flex items-center gap-1 rounded-full bg-muted/60 p-1 backdrop-blur-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
              )}
            >
              {isActive && (
                <span className="absolute inset-0 rounded-full bg-background shadow-sm ring-1 ring-border/50" />
              )}
              <Icon
                className={cn(
                  "relative h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="flex items-center justify-between gap-2">
                <UserMenu session={session} />
              </div>
            </SheetTitle>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}

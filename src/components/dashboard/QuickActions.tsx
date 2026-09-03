import Link from "next/link";
import { ArrowLeftRight, Repeat, Wallet } from "lucide-react";

const actions = [
  {
    href: "/transactions",
    label: "Transacciones",
    icon: ArrowLeftRight,
  },
  { href: "/accounts", label: "Cuentas", icon: Wallet },
  { href: "/subscriptions", label: "Suscripciones", icon: Repeat },
] as const;

export function QuickActions() {
  return (
    <nav aria-label="Accesos rápidos" className="grid grid-cols-3 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="glass-card group flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl px-2 py-4 text-center outline-none transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97]"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/12 transition-colors group-hover:bg-primary/20">
              <Icon
                className="size-5 text-primary"
                aria-hidden="true"
              />
            </span>
            <span className="text-xs font-medium text-foreground">
              {action.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

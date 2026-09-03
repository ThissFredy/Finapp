"use client";

import { CalendarClock, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { UserSubscriptionItem } from "@/core/models/dashboard";
import { formatCurrency } from "@/core/utils/currency";
import { cn } from "@/lib/utils";
import { AnimatedCard } from "@/components/ui/motion";

interface SubscriptionsWidgetProps {
  subscriptions: UserSubscriptionItem[];
}

function formatNextBillingDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "Vencida";
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays <= 7) return `En ${diffDays} días`;
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SubscriptionsWidget({
  subscriptions,
}: SubscriptionsWidgetProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AnimatedCard>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
          Suscripciones
        </h2>
        <Link
          href="/subscriptions"
          className="group inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-primary transition-colors hover:bg-primary/10 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          Ver todas
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      {subscriptions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No tienes suscripciones registradas.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-3 transition-all duration-200 hover:bg-background/70"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <CalendarClock className="size-4 text-primary" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {sub.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sub.billing_cycle === "MONTHLY" ? "Mensual" : "Anual"}
                    {sub.category_name && ` · ${sub.category_name}`}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="numeric text-sm font-semibold text-foreground">
                  {formatCurrency(sub.amount, sub.currency)}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    sub.next_billing_date < today
                      ? "font-medium text-expense"
                      : "text-muted-foreground"
                  )}
                >
                  {formatNextBillingDate(sub.next_billing_date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AnimatedCard>
  );
}

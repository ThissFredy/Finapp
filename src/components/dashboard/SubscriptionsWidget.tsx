"use client";

import { CalendarClock, RefreshCw, ArrowRight } from "lucide-react";
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-card-foreground">
            Suscripciones
          </h2>
        </div>
        <Link
          href="/subscriptions"
          className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver todas
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {subscriptions.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No tienes suscripciones registradas.
        </p>
      ) : (
        <div className="mt-5 space-y-2">
          {subscriptions.map((sub, index) => (
            <div
              key={sub.id}
              className="group flex items-center justify-between rounded-xl border border-border bg-background/50 p-3 transition-all duration-200 hover:bg-background hover:shadow-sm"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary transition-colors group-hover:bg-primary/10">
                  <CalendarClock className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {sub.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sub.billing_cycle === "MONTHLY" ? "Mensual" : "Anual"}
                    {sub.category_name && ` · ${sub.category_name}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(sub.amount, sub.currency)}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    sub.next_billing_date < today
                      ? "font-medium text-rose-600"
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

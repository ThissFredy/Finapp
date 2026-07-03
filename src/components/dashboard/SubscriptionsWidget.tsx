import { CalendarClock, RefreshCw } from "lucide-react";
import type { UserSubscriptionItem } from "@/core/models/dashboard";
import { formatCurrency } from "@/core/utils/currency";

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
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-card-foreground">
          Suscripciones
        </h2>
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
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
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
                  className={
                    "text-xs " +
                    (sub.next_billing_date < today
                      ? "font-medium text-red-600"
                      : "text-muted-foreground")
                  }
                >
                  {formatNextBillingDate(sub.next_billing_date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

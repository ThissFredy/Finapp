import { cn } from "@/lib/utils";
import { formatCurrency } from "@/core/utils/currency";
import type { Currency } from "@/core/models/account";
import type { LucideIcon } from "lucide-react";

interface DashboardStatCardProps {
  title: string;
  amount: number;
  currency: Currency;
  icon: LucideIcon;
  trend?: "positive" | "negative" | "neutral";
  className?: string;
}

export function DashboardStatCard({
  title,
  amount,
  currency,
  icon: Icon,
  trend = "neutral",
  className,
}: DashboardStatCardProps) {
  const trendClasses = {
    positive: "text-income bg-income/12",
    negative: "text-expense bg-expense/12",
    neutral: "text-foreground bg-secondary",
  };

  return (
    <div
      className={cn(
        "glass-card group relative overflow-hidden rounded-2xl p-5 card-lift",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="numeric mt-2 text-2xl font-bold tracking-tight">
            {formatCurrency(amount, currency)}
          </p>
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
            trendClasses[trend],
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

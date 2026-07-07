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
    positive: "text-emerald-600 bg-emerald-500/10",
    negative: "text-rose-600 bg-rose-500/10",
    neutral: "text-foreground bg-secondary",
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">
            {formatCurrency(amount, currency)}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            trendClasses[trend]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

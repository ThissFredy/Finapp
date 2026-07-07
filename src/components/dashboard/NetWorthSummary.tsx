"use client";

import { CreditCard, Wallet, Banknote, Landmark } from "lucide-react";
import type { NetWorthAccount } from "@/core/models/dashboard";
import type { Currency } from "@/core/models/account";
import { formatCurrency } from "@/core/utils/currency";
import { cn } from "@/lib/utils";
import { AnimatedCard } from "@/components/ui/motion";

interface NetWorthSummaryProps {
  accounts: NetWorthAccount[];
  totals: {
    total_assets: number;
    total_debts: number;
    net_worth: number;
    currency: Currency;
  } | null;
}

const accountTypeIcon = {
  DEBIT: Banknote,
  CREDIT: CreditCard,
  CASH: Wallet,
} as const;

const accountTypeLabel = {
  DEBIT: "Débito",
  CREDIT: "Crédito",
  CASH: "Efectivo",
} as const;

export function NetWorthSummary({ accounts, totals }: NetWorthSummaryProps) {
  return (
    <AnimatedCard>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Landmark className="h-4 w-4 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-card-foreground">
          Patrimonio neto
        </h2>
      </div>

      {totals && (
        <div className="mt-5 grid grid-cols-3 gap-3">
          <SummaryPill
            label="Activos"
            amount={totals.total_assets}
            currency={totals.currency}
            variant="positive"
          />
          <SummaryPill
            label="Deudas"
            amount={totals.total_debts}
            currency={totals.currency}
            variant="negative"
          />
          <SummaryPill
            label="Neto"
            amount={totals.net_worth}
            currency={totals.currency}
            variant={totals.net_worth >= 0 ? "positive" : "negative"}
          />
        </div>
      )}

      <div className="mt-5 space-y-2">
        {accounts.map((account, index) => {
          const Icon = accountTypeIcon[account.account_type];
          return (
            <div
              key={account.account_id}
              className="group flex items-center justify-between rounded-xl border border-border bg-background/50 p-3 transition-all duration-200 hover:bg-background hover:shadow-sm"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary transition-colors group-hover:bg-primary/10">
                  <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {account.account_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {accountTypeLabel[account.account_type]}
                    {account.account_currency !== account.currency &&
                      ` · ${account.account_currency} → ${account.currency}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    account.account_type === "CREDIT"
                      ? "text-rose-600"
                      : "text-foreground"
                  )}
                >
                  {formatCurrency(
                    account.balance_converted,
                    account.currency
                  )}
                </p>
                {account.account_currency !== account.currency && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(
                      account.balance,
                      account.account_currency
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AnimatedCard>
  );
}

function SummaryPill({
  label,
  amount,
  currency,
  variant,
}: {
  label: string;
  amount: number;
  currency: Currency;
  variant: "positive" | "negative";
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-3",
        variant === "positive"
          ? "bg-emerald-500/8 text-emerald-700 dark:text-emerald-400"
          : "bg-rose-500/8 text-rose-700 dark:text-rose-400"
      )}
    >
      <p className="text-xs opacity-80">{label}</p>
      <p className="mt-1 text-sm font-semibold">
        {formatCurrency(amount, currency)}
      </p>
    </div>
  );
}

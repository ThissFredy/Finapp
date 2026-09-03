"use client";

import { CreditCard, Wallet, Banknote } from "lucide-react";
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

export function NetWorthSummary({ accounts }: NetWorthSummaryProps) {
  return (
    <AnimatedCard>
      <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
        Distribución por cuenta
      </h2>

      <div className="mt-4 space-y-2">
        {accounts.map((account) => {
          const Icon = accountTypeIcon[account.account_type];
          return (
            <div
              key={account.account_id}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-3 transition-all duration-200 hover:bg-background/70"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Icon
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
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
                    "numeric text-sm font-semibold",
                    account.account_type === "CREDIT"
                      ? "text-expense"
                      : "text-foreground"
                  )}
                >
                  {formatCurrency(
                    account.balance_converted,
                    account.currency
                  )}
                </p>
                {account.account_currency !== account.currency && (
                  <p className="numeric text-xs text-muted-foreground">
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

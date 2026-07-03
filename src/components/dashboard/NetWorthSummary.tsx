import { CreditCard, Wallet, Banknote } from "lucide-react";
import type { NetWorthAccount } from "@/core/models/dashboard";
import type { Currency } from "@/core/models/account";
import { formatCurrency } from "@/core/utils/currency";

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

export function NetWorthSummary({ accounts, totals }: NetWorthSummaryProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground">
        Patrimonio neto
      </h2>

      {totals && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Activos</p>
            <p className="mt-1 text-sm font-semibold text-green-600">
              {formatCurrency(totals.total_assets, totals.currency)}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Deudas</p>
            <p className="mt-1 text-sm font-semibold text-red-600">
              {formatCurrency(totals.total_debts, totals.currency)}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Neto</p>
            <p
              className={
                totals.net_worth >= 0
                  ? "mt-1 text-sm font-semibold text-foreground"
                  : "mt-1 text-sm font-semibold text-red-600"
              }
            >
              {formatCurrency(totals.net_worth, totals.currency)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {accounts.map((account) => {
          const Icon = accountTypeIcon[account.account_type];
          return (
            <div
              key={account.account_id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {account.account_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account.account_currency}
                    {account.account_currency !== account.currency &&
                      ` → ${account.currency}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={
                    account.account_type === "CREDIT"
                      ? "text-sm font-semibold text-red-600"
                      : "text-sm font-semibold text-foreground"
                  }
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
    </div>
  );
}

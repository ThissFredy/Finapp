import { Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/core/utils/currency";
import type { Currency } from "@/core/models/account";

interface BalanceHeroProps {
  totals: {
    total_assets: number;
    total_debts: number;
    net_worth: number;
    currency: Currency;
  } | null;
}

export function BalanceHero({ totals }: BalanceHeroProps) {
  const currency = totals?.currency ?? "COP";
  const netWorth = totals?.net_worth ?? 0;
  const positive = netWorth >= 0;

  return (
    <section
      aria-labelledby="balance-hero-title"
      className="glass-card relative overflow-hidden rounded-3xl p-6 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-56 rounded-full bg-primary/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-20 size-56 rounded-full bg-[oklch(0.62_0.22_330)]/20 blur-3xl"
      />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15">
            <Wallet className="size-4 text-primary" aria-hidden="true" />
          </span>
          <h2
            id="balance-hero-title"
            className="text-sm font-medium text-muted-foreground"
          >
            Patrimonio neto
          </h2>
        </div>

        <p
          className={`numeric mt-4 text-4xl font-bold tracking-tight sm:text-5xl ${
            positive ? "text-foreground" : "text-expense"
          }`}
        >
          {formatCurrency(netWorth, currency)}
        </p>

        {totals && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-income/12 px-3 py-1.5 text-xs font-medium text-income">
              <ArrowDownRight className="size-3.5" aria-hidden="true" />
              Activos {formatCurrency(totals.total_assets, currency, true)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-expense/12 px-3 py-1.5 text-xs font-medium text-expense">
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
              Deudas {formatCurrency(totals.total_debts, currency, true)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

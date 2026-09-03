import { Wallet } from "lucide-react";
import { getServerProfile } from "@/core/services/auth.service";
import { formatCurrency, formatRelativeTime } from "@/core/utils/currency";
import type { UserBalance } from "@/core/models/account";

interface TotalBalanceCardProps {
  balance: UserBalance | null;
}

export async function TotalBalanceCard({ balance }: TotalBalanceCardProps) {
  const profile = await getServerProfile();
  const currency = balance?.currency ?? profile?.preferred_currency ?? "COP";
  const amount = balance?.total_balance ?? 0;

  return (
    <section
      aria-labelledby="total-balance-title"
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
            id="total-balance-title"
            className="text-sm font-medium text-muted-foreground"
          >
            Balance total
          </h2>
        </div>
        <p className="numeric mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {formatCurrency(amount, currency)}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {balance
            ? `Actualizado: ${formatRelativeTime(balance.updated_at)}`
            : "Crea una cuenta para ver tu balance"}
        </p>
      </div>
    </section>
  );
}

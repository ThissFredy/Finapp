import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="relative overflow-hidden border-0 bg-foreground text-primary-foreground shadow-sm">
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary-foreground/5" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary-foreground/5" />
      <CardContent className="relative flex flex-col gap-2 py-8">
        <div className="flex items-center gap-2 text-primary-foreground/80">
          <Wallet className="h-4 w-4" />
          <p className="text-sm font-medium">Balance total</p>
        </div>
        <p className="text-4xl font-bold tracking-tight">
          {formatCurrency(amount, currency)}
        </p>
        <p className="text-sm text-primary-foreground/70">
          {balance
            ? `Actualizado: ${formatRelativeTime(balance.updated_at)}`
            : "Crea una cuenta para ver tu balance"}
        </p>
      </CardContent>
    </Card>
  );
}

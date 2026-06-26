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
    <Card className="border-0 bg-primary text-primary-foreground shadow-sm">
      <CardContent className="flex flex-col gap-1 py-6">
        <p className="text-sm font-medium text-primary-foreground/80">
          Balance total
        </p>
        <p className="text-3xl font-bold tracking-tight">
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

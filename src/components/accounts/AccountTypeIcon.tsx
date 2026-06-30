import { Landmark, CreditCard, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/core/models/account";

interface AccountTypeIconProps {
  type: AccountType;
  className?: string;
}

const iconMap: Record<AccountType, typeof Landmark> = {
  DEBIT: Landmark,
  CREDIT: CreditCard,
  CASH: Banknote,
};

export function AccountTypeIcon({ type, className }: AccountTypeIconProps) {
  const Icon = iconMap[type];
  return <Icon className={cn("h-5 w-5", className)} aria-hidden="true" />;
}

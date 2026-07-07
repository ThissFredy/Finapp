import { AccountCard } from "@/components/accounts/AccountCard";
import { AnimatedListItem } from "@/components/ui/motion";
import type { AccountWithMeta } from "@/core/models/account";

interface AccountListProps {
  accounts: AccountWithMeta[];
}

export function AccountList({ accounts }: AccountListProps) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account, index) => (
        <AnimatedListItem key={account.id} index={index}>
          <AccountCard account={account} />
        </AnimatedListItem>
      ))}
    </div>
  );
}

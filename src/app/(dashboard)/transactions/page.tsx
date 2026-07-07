import { listTransactions } from "@/core/services/transaction.service";
import { getAccountsWithMeta } from "@/core/services/account.service";
import { listCategories } from "@/core/services/category.service";
import { selectAllExchangeRates } from "@/core/db/queries/transaction.queries";
import { TransactionsClient } from "./TransactionsClient";
import { FadeIn } from "@/components/ui/motion";

export default async function TransactionsPage() {
  const [
    { items, total_count, page, page_size },
    accounts,
    grouped,
    exchangeRates,
  ] = await Promise.all([
    listTransactions({ page: 1, page_size: 20 }),
    getAccountsWithMeta(),
    listCategories(),
    selectAllExchangeRates(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <FadeIn direction="up" delay={1}>
        <TransactionsClient
          initialItems={items}
          initialTotal={total_count}
          initialPage={page}
          initialPageSize={page_size}
          accounts={accounts}
          incomeCategories={grouped.income}
          expenseCategories={grouped.expense}
          allCategories={[...grouped.income, ...grouped.expense]}
          exchangeRates={exchangeRates}
        />
      </FadeIn>
    </div>
  );
}

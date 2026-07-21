import type { Metadata } from "next";
import { listSubscriptions, listUpcomingPayments } from "@/core/services/subscription.service";
import { selectAccountsWithMeta } from "@/core/db/queries/account.queries";
import { selectActiveCategoriesByType } from "@/core/db/queries/category.queries";
import { selectAllExchangeRates } from "@/core/db/queries/transaction.queries";
import { selectUserBalance } from "@/core/db/queries/account.queries";
import { SubscriptionsClient } from "./SubscriptionsClient";
import { FadeIn } from "@/components/ui/motion";

export const metadata: Metadata = {
  title: "Suscripciones",
  description: "Controla tus suscripciones y próximos pagos.",
};

export default async function SubscriptionsPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [
    subscriptions,
    upcomingPayments,
    accounts,
    expenseCategories,
    exchangeRates,
    userBalance,
  ] = await Promise.all([
    listSubscriptions(),
    listUpcomingPayments(year, month),
    selectAccountsWithMeta(),
    selectActiveCategoriesByType("EXPENSE"),
    selectAllExchangeRates(),
    selectUserBalance(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <FadeIn direction="up" delay={1}>
        <SubscriptionsClient
          subscriptions={subscriptions}
          upcomingPayments={upcomingPayments}
          initialYear={year}
          initialMonth={month}
          accounts={accounts}
          expenseCategories={expenseCategories}
          exchangeRates={exchangeRates}
          preferredCurrency={userBalance?.currency ?? "COP"}
        />
      </FadeIn>
    </div>
  );
}

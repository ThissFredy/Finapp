import {
  selectMonthlySummary,
  selectExpensesByCategory,
  selectNetWorthByAccount,
  selectUserSubscriptions,
  selectRecentTransactions,
} from "@/core/db/queries/dashboard.queries";
import {
  MonthlySummarySchema,
  ExpenseByCategoryItemSchema,
  NetWorthAccountSchema,
  UserSubscriptionItemSchema,
  RecentTransactionItemSchema,
} from "@/core/models/dashboard";
import type { DashboardData } from "@/core/models/dashboard";

// Obtener todos los datos del dashboard en una sola llamada
export async function getDashboardData(): Promise<DashboardData> {
  // Ejecutar todas las queries en paralelo
  const [
    monthlySummaryRaw,
    expensesByCategoryRaw,
    netWorthAccountsRaw,
    subscriptionsRaw,
    recentTransactionsRaw,
  ] = await Promise.all([
    selectMonthlySummary(),
    selectExpensesByCategory(),
    selectNetWorthByAccount(),
    selectUserSubscriptions(),
    selectRecentTransactions(10),
  ]);

  // Validar con Zod
  const monthly_summary = monthlySummaryRaw
    ? MonthlySummarySchema.parse(monthlySummaryRaw)
    : null;

  const expenses_by_category = expensesByCategoryRaw.map((item) =>
    ExpenseByCategoryItemSchema.parse(item)
  );

  const net_worth_accounts = netWorthAccountsRaw.map((item) =>
    NetWorthAccountSchema.parse(item)
  );

  const net_worth_totals =
    net_worth_accounts.length > 0
      ? {
          total_assets: net_worth_accounts[0].total_assets,
          total_debts: net_worth_accounts[0].total_debts,
          net_worth: net_worth_accounts[0].net_worth,
          currency: net_worth_accounts[0].currency,
        }
      : null;

  const subscriptions = subscriptionsRaw.map((item) =>
    UserSubscriptionItemSchema.parse(item)
  );

  const recent_transactions = recentTransactionsRaw.map((item) =>
    RecentTransactionItemSchema.parse(item)
  );

  return {
    monthly_summary,
    expenses_by_category,
    net_worth_accounts,
    net_worth_totals,
    subscriptions,
    recent_transactions,
  };
}

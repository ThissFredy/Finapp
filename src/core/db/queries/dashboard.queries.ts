import { createServerClientInstance } from "@/core/db/supabase.server";
import type {
  MonthlySummary,
  ExpenseByCategoryItem,
  NetWorthAccount,
  UserSubscriptionItem,
  RecentTransactionItem,
} from "@/core/models/dashboard";

// HU-5.1: Totales de ingresos y gastos del mes actual
export async function selectMonthlySummary(): Promise<MonthlySummary | null> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_dashboard_monthly_summary");
  if (error) throw error;
  const rows = (data ?? []) as MonthlySummary[];
  return rows[0] ?? null;
}

// HU-5.2: Gastos por categoría del mes actual
export async function selectExpensesByCategory(): Promise<ExpenseByCategoryItem[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_dashboard_expenses_by_category");
  if (error) throw error;
  return (data ?? []) as ExpenseByCategoryItem[];
}

// HU-5.3: Patrimonio neto por cuenta
export async function selectNetWorthByAccount(): Promise<NetWorthAccount[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_dashboard_net_worth_by_account");
  if (error) throw error;
  return (data ?? []) as NetWorthAccount[];
}

// HU-5.4: Suscripciones activas
export async function selectUserSubscriptions(): Promise<UserSubscriptionItem[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_dashboard_subscriptions");
  if (error) throw error;
  return (data ?? []) as UserSubscriptionItem[];
}

// HU-5.5: Últimas N transacciones
export async function selectRecentTransactions(
  limit: number = 10
): Promise<RecentTransactionItem[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_dashboard_recent_transactions", {
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as RecentTransactionItem[];
}

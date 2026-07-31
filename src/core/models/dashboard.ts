import { z } from "zod";
import { CurrencySchema, AccountTypeSchema } from "@/core/models/account";
import { TransactionTypeSchema } from "@/core/models/transaction";

// --- MonthlySummary (HU-5.1) ---
export const MonthlySummarySchema = z.object({
  total_income: z.number(),
  total_expense: z.number(),
  net_savings: z.number(),
  currency: CurrencySchema,
});
export type MonthlySummary = z.infer<typeof MonthlySummarySchema>;

// --- ExpenseByCategory (HU-5.2) ---
export const ExpenseByCategoryItemSchema = z.object({
  category_id: z.string().uuid(),
  category_name: z.string(),
  category_color: z.string(),
  category_icon: z.string(),
  amount: z.number(),
  currency: CurrencySchema,
});
export type ExpenseByCategoryItem = z.infer<typeof ExpenseByCategoryItemSchema>;

// --- NetWorthByAccount (HU-5.3) ---
export const NetWorthAccountSchema = z.object({
  account_id: z.string().uuid(),
  account_name: z.string(),
  account_type: AccountTypeSchema,
  account_currency: CurrencySchema,
  balance: z.number(),
  balance_converted: z.number(),
  total_assets: z.number(),
  total_debts: z.number(),
  net_worth: z.number(),
  currency: CurrencySchema,
});
export type NetWorthAccount = z.infer<typeof NetWorthAccountSchema>;

// --- UserSubscriptionItem (HU-5.4) ---
export const BillingCycleSchema = z.enum(["MONTHLY", "YEARLY"]);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const UserSubscriptionItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  amount: z.number(),
  currency: CurrencySchema,
  billing_cycle: BillingCycleSchema,
  next_billing_date: z.string(),
  category_name: z.string().nullable(),
  category_color: z.string().nullable(),
  category_icon: z.string().nullable(),
});
export type UserSubscriptionItem = z.infer<typeof UserSubscriptionItemSchema>;

// --- RecentTransactionItem (HU-5.5) ---
export const RecentTransactionItemSchema = z.object({
  id: z.string().uuid(),
  type: TransactionTypeSchema,
  amount: z.number(),
  currency: CurrencySchema,
  date: z.string(),
  description: z.string().nullable(),
  account_name: z.string().nullable(),
  category_name: z.string().nullable(),
  category_color: z.string().nullable(),
  category_icon: z.string().nullable(),
});
export type RecentTransactionItem = z.infer<typeof RecentTransactionItemSchema>;

// --- DashboardData (agregado) ---
export const DashboardDataSchema = z.object({
  monthly_summary: MonthlySummarySchema.nullable(),
  expenses_by_category: z.array(ExpenseByCategoryItemSchema),
  net_worth_accounts: z.array(NetWorthAccountSchema),
  net_worth_totals: z
    .object({
      total_assets: z.number(),
      total_debts: z.number(),
      net_worth: z.number(),
      currency: CurrencySchema,
    })
    .nullable(),
  subscriptions: z.array(UserSubscriptionItemSchema),
  recent_transactions: z.array(RecentTransactionItemSchema),
});
export type DashboardData = z.infer<typeof DashboardDataSchema>;

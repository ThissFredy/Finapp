import type { Metadata } from "next";
import { getDashboardData } from "@/core/services/dashboard.service";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import { MonthlySummaryChart } from "@/components/dashboard/MonthlySummaryChart";
import { ExpensesByCategoryChart } from "@/components/dashboard/ExpensesByCategoryChart";
import { NetWorthSummary } from "@/components/dashboard/NetWorthSummary";
import { SubscriptionsWidget } from "@/components/dashboard/SubscriptionsWidget";
import { RecentTransactionsWidget } from "@/components/dashboard/RecentTransactionsWidget";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { BalanceHero } from "@/components/dashboard/BalanceHero";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { FadeIn } from "@/components/ui/motion";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Resumen de tu salud financiera del mes actual.",
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  const hasMonthlyData =
    data.monthly_summary !== null &&
    (data.monthly_summary.total_income > 0 ||
      data.monthly_summary.total_expense > 0);

  const dashboardCurrency =
    data.monthly_summary?.currency ?? data.net_worth_totals?.currency ?? "COP";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <FadeIn direction="up" delay={1}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Resumen de tu salud financiera del mes actual.
          </p>
        </div>
      </FadeIn>

      {/* 1. Balance hero */}
      <FadeIn direction="up" delay={2}>
        {data.net_worth_totals ? (
          <BalanceHero totals={data.net_worth_totals} />
        ) : (
          <DashboardEmptyState
            title="Sin cuentas activas"
            message="Crea una cuenta para ver tu patrimonio neto y empezar a registrar tus finanzas."
          />
        )}
      </FadeIn>

      {/* 2. Ingresos vs gastos del mes */}
      {data.monthly_summary && (
        <FadeIn direction="up" delay={3}>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <DashboardStatCard
              title="Ingresos"
              amount={data.monthly_summary.total_income}
              currency={dashboardCurrency}
              icon={ArrowDownRight}
              trend="positive"
            />
            <DashboardStatCard
              title="Gastos"
              amount={data.monthly_summary.total_expense}
              currency={dashboardCurrency}
              icon={ArrowUpRight}
              trend="negative"
            />
            <DashboardStatCard
              title="Balance neto"
              amount={data.monthly_summary.net_savings}
              currency={dashboardCurrency}
              icon={Scale}
              trend={
                data.monthly_summary.net_savings >= 0 ? "positive" : "negative"
              }
              className="sm:col-span-2 md:col-span-1"
            />
          </div>
        </FadeIn>
      )}

      {/* 3. Accesos rápidos */}
      <FadeIn direction="up" delay={4} className="mt-6">
        <QuickActions />
      </FadeIn>

      {/* 4-6. Gráficas y widgets */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <FadeIn direction="up" delay={4}>
            {hasMonthlyData && data.monthly_summary ? (
              <MonthlySummaryChart data={data.monthly_summary} />
            ) : (
              <DashboardEmptyState
                title="Sin movimientos este mes"
                message="Aún no has registrado ingresos ni gastos en el mes actual. Crea una transacción para ver tu resumen."
              />
            )}
          </FadeIn>

          <FadeIn direction="up" delay={5}>
            {data.expenses_by_category.length > 0 ? (
              <ExpensesByCategoryChart
                data={data.expenses_by_category}
                currency={dashboardCurrency}
              />
            ) : (
              <DashboardEmptyState
                title="Sin gastos por categoría"
                message="No tienes gastos registrados en el mes actual para desglosar por categoría."
              />
            )}
          </FadeIn>
        </div>

        <div className="space-y-6">
          <FadeIn direction="up" delay={5}>
            {data.net_worth_accounts.length > 0 ? (
              <NetWorthSummary
                accounts={data.net_worth_accounts}
                totals={data.net_worth_totals}
              />
            ) : null}
          </FadeIn>

          <FadeIn direction="up" delay={6}>
            <SubscriptionsWidget subscriptions={data.subscriptions} />
          </FadeIn>

          <FadeIn direction="up" delay={6}>
            <RecentTransactionsWidget transactions={data.recent_transactions} />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

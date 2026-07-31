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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <FadeIn direction="up" delay={1}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Resumen de tu salud financiera del mes actual.
          </p>
        </div>
      </FadeIn>

      {data.monthly_summary && (
        <FadeIn direction="up" delay={2}>
          <div className="mb-8 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
              className="sm:col-span-2 lg:col-span-1"
            />
          </div>
        </FadeIn>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna izquierda: Gráficas */}
        <div className="space-y-6 overflow-y-auto">
          <FadeIn direction="up" delay={3}>
            {hasMonthlyData && data.monthly_summary ? (
              <MonthlySummaryChart data={data.monthly_summary} />
            ) : (
              <DashboardEmptyState
                title="Sin movimientos este mes"
                message="Aún no has registrado ingresos ni gastos en el mes actual. Crea una transacción para ver tu resumen."
              />
            )}
          </FadeIn>

          <FadeIn direction="up" delay={4}>
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

        {/* Columna derecha: Patrimonio, Suscripciones y Transacciones */}
        <div className="space-y-6">
          <FadeIn direction="up" delay={4}>
            {data.net_worth_accounts.length > 0 ? (
              <NetWorthSummary
                accounts={data.net_worth_accounts}
                totals={data.net_worth_totals}
              />
            ) : (
              <DashboardEmptyState
                title="Sin cuentas activas"
                message="No tienes cuentas activas. Crea una cuenta para empezar a registrar tus finanzas."
              />
            )}
          </FadeIn>

          <FadeIn direction="up" delay={5}>
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

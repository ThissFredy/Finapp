import { getDashboardData } from "@/core/services/dashboard.service";
import { MonthlySummaryChart } from "@/components/dashboard/MonthlySummaryChart";
import { ExpensesByCategoryChart } from "@/components/dashboard/ExpensesByCategoryChart";
import { NetWorthSummary } from "@/components/dashboard/NetWorthSummary";
import { SubscriptionsWidget } from "@/components/dashboard/SubscriptionsWidget";
import { RecentTransactionsWidget } from "@/components/dashboard/RecentTransactionsWidget";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";

export default async function DashboardPage() {
  const data = await getDashboardData();

  const hasMonthlyData =
    data.monthly_summary !== null &&
    (data.monthly_summary.total_income > 0 ||
      data.monthly_summary.total_expense > 0);

  const dashboardCurrency =
    data.monthly_summary?.currency ??
    data.net_worth_totals?.currency ??
    "COP";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Dashboard
      </h1>
      <p className="mt-2 text-muted-foreground">
        Resumen de tu salud financiera del mes actual.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Columna izquierda: Gráficas */}
        <div className="space-y-6">
          {hasMonthlyData && data.monthly_summary ? (
            <MonthlySummaryChart data={data.monthly_summary} />
          ) : (
            <DashboardEmptyState
              title="Sin movimientos este mes"
              message="Aún no has registrado ingresos ni gastos en el mes actual. Crea una transacción para ver tu resumen."
            />
          )}

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
        </div>

        {/* Columna derecha: Patrimonio, Suscripciones y Transacciones */}
        <div className="space-y-6">
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

          <SubscriptionsWidget subscriptions={data.subscriptions} />

          <RecentTransactionsWidget transactions={data.recent_transactions} />
        </div>
      </div>
    </div>
  );
}

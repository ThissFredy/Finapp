"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { MonthlySummary } from "@/core/models/dashboard";
import { formatCurrency } from "@/core/utils/currency";
import { AnimatedCard } from "@/components/ui/motion";

interface MonthlySummaryChartProps {
  data: MonthlySummary;
}

export function MonthlySummaryChart({ data }: MonthlySummaryChartProps) {
  const chartData = [
    { name: "Resumen mensual", income: data.total_income, expense: data.total_expense },
  ];

  return (
    <AnimatedCard>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
          Ingresos vs Gastos
        </h2>
        <p className="text-xs text-muted-foreground">
          Resumen del mes actual en {data.currency}
        </p>
      </div>

      <ChartContainer
        config={{
          income: { label: "Ingresos", color: "var(--chart-1)" },
          expense: { label: "Gastos", color: "var(--chart-2)" },
        }}
        className="mt-4 h-[250px] w-full max-w-full overflow-hidden"
      >
        <BarChart data={chartData} margin={{ left: 0, right: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            hide
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value, data.currency, true)}
            width={60}
            tick={{ fontSize: 12 }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <span className="font-mono font-medium tabular-nums">
                    {formatCurrency(Number(value), data.currency)}
                  </span>
                )}
              />
            }
          />
          <Bar dataKey="income" fill="var(--chart-1)" radius={[8, 8, 0, 0]} maxBarSize={48} />
          <Bar dataKey="expense" fill="var(--chart-2)" radius={[8, 8, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ChartContainer>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-income/10 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Balance neto del mes:</span>
        <span
          className={
            data.net_savings >= 0
              ? "numeric font-semibold text-income"
              : "numeric font-semibold text-expense"
          }
        >
          {formatCurrency(data.net_savings, data.currency)}
        </span>
      </div>
    </AnimatedCard>
  );
}

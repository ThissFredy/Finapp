"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { MonthlySummary } from "@/core/models/dashboard";
import { formatCurrency } from "@/core/utils/currency";

interface MonthlySummaryChartProps {
  data: MonthlySummary;
}

export function MonthlySummaryChart({ data }: MonthlySummaryChartProps) {
  const chartData = [
    { name: "Resumen mensual", income: data.total_income, expense: data.total_expense },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground">
        Ingresos vs Gastos
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Resumen del mes actual en {data.currency}
      </p>
      <ChartContainer
        config={{
          income: { label: "Ingresos", color: "var(--chart-1)" },
          expense: { label: "Gastos", color: "var(--chart-2)" },
        }}
        className="mt-4 h-[250px] w-full"
      >
        <BarChart data={chartData}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
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
          <Bar dataKey="income" fill="var(--chart-1)" radius={8} />
          <Bar dataKey="expense" fill="var(--chart-2)" radius={8} />
        </BarChart>
      </ChartContainer>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Balance neto del mes:</span>
        <span
          className={
            data.net_savings >= 0
              ? "font-semibold text-green-600"
              : "font-semibold text-red-600"
          }
        >
          {formatCurrency(data.net_savings, data.currency)}
        </span>
      </div>
    </div>
  );
}

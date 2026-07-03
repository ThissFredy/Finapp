"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ExpenseByCategoryItem } from "@/core/models/dashboard";
import type { Currency } from "@/core/models/account";
import { formatCurrency } from "@/core/utils/currency";

interface ExpensesByCategoryChartProps {
  data: ExpenseByCategoryItem[];
  currency: Currency;
}

export function ExpensesByCategoryChart({
  data,
  currency,
}: ExpensesByCategoryChartProps) {
  const chartConfig = data.reduce(
    (acc, item, index) => {
      acc[item.category_id] = {
        label: item.category_name,
        color: item.category_color || `var(--chart-${(index % 5) + 1})`,
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground">
        Gastos por categoría
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Desglose del mes actual en {currency}
      </p>
      <ChartContainer
        config={chartConfig}
        className="mx-auto mt-4 h-[280px] w-full"
      >
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="category_name"
                formatter={(value) => (
                  <span className="font-mono font-medium tabular-nums">
                    {formatCurrency(Number(value), currency)}
                  </span>
                )}
              />
            }
          />
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category_name"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((item, index) => (
              <Cell
                key={item.category_id}
                fill={item.category_color || `var(--chart-${(index % 5) + 1})`}
              />
            ))}
          </Pie>
          <ChartLegend
            content={<ChartLegendContent nameKey="category_name" />}
            className="flex-wrap"
          />
        </PieChart>
      </ChartContainer>
    </div>
  );
}

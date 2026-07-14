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
import { AnimatedCard } from "@/components/ui/motion";
import { PieChartIcon } from "lucide-react";

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
    <AnimatedCard>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">
            Gastos por categoría
          </h2>
          <p className="text-xs text-muted-foreground">
            Desglose del mes actual en {currency}
          </p>
        </div>
      </div>

      <ChartContainer
        config={chartConfig}
        className="mx-auto mt-4 h-[280px] w-full max-w-full overflow-hidden"
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
            innerRadius="40%"
            outerRadius="70%"
            paddingAngle={2}
          >
            {data.map((item, index) => (
              <Cell
                key={item.category_id}
                fill={item.category_color || `var(--chart-${(index % 5) + 1})`}
                stroke="var(--card)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <ChartLegend
            content={<ChartLegendContent nameKey="category_name" />}
            className="flex-wrap"
          />
        </PieChart>
      </ChartContainer>
    </AnimatedCard>
  );
}

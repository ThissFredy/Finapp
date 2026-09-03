"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
} from "lucide-react";
import { getIconByName } from "@/lib/icons";
import type { RecentTransactionItem } from "@/core/models/dashboard";
import { formatCurrency } from "@/core/utils/currency";
import { cn } from "@/lib/utils";
import { AnimatedCard } from "@/components/ui/motion";

interface RecentTransactionsWidgetProps {
  transactions: RecentTransactionItem[];
}

const transactionTypeConfig = {
  INGRESO: {
    icon: ArrowDownRight,
    color: "text-income",
    bg: "bg-income/12",
    sign: "+",
  },
  GASTO: {
    icon: ArrowUpRight,
    color: "text-expense",
    bg: "bg-expense/12",
    sign: "-",
  },
  TRANSFERENCIA: {
    icon: ArrowLeftRight,
    color: "text-transfer",
    bg: "bg-transfer/12",
    sign: "",
  },
} as const;

export function RecentTransactionsWidget({
  transactions,
}: RecentTransactionsWidgetProps) {
  return (
    <AnimatedCard>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
          Transacciones recientes
        </h2>
        <Link
          href="/transactions"
          className="group inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-primary transition-colors hover:bg-primary/10 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          Ver todas
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No tienes transacciones registradas.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {transactions.map((tx) => {
            const config = transactionTypeConfig[tx.type];
            const TypeIcon = config.icon;

            return (
              <div
                key={tx.id}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-3 transition-all duration-200 hover:bg-background/70"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105",
                      config.bg,
                    )}
                  >
                    <TypeIcon className={cn("size-4", config.color)} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {tx.description || tx.category_name || "Transacción"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tx.account_name || "—"}
                      {" · "}
                      {new Date(tx.date).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("numeric text-sm font-semibold", config.color)}>
                    {config.sign}
                    {formatCurrency(tx.amount, tx.currency)}
                  </p>
                  {tx.category_name && (
                    <div className="flex items-center justify-end gap-1">
                      {React.createElement(getIconByName(tx.category_icon), {
                        className: "size-3",
                        style: { color: tx.category_color || undefined },
                        "aria-hidden": "true",
                      })}
                      <span className="text-xs text-muted-foreground">
                        {tx.category_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AnimatedCard>
  );
}

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
  INCOME: {
    icon: ArrowDownRight,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    sign: "+",
  },
  EXPENSE: {
    icon: ArrowUpRight,
    color: "text-rose-600",
    bg: "bg-rose-500/10",
    sign: "-",
  },
  TRANSFER: {
    icon: ArrowLeftRight,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    sign: "",
  },
} as const;

export function RecentTransactionsWidget({
  transactions,
}: RecentTransactionsWidgetProps) {
  return (
    <AnimatedCard>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-card-foreground">
            Transacciones recientes
          </h2>
        </div>
        <Link
          href="/transactions"
          className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver todas
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No tienes transacciones registradas.
        </p>
      ) : (
        <div className="mt-5 space-y-2">
          {transactions.map((tx, index) => {
            const config = transactionTypeConfig[tx.type];
            const TypeIcon = config.icon;

            return (
              <div
                key={tx.id}
                className="group flex items-center justify-between rounded-xl border border-border bg-background/50 p-3 transition-all duration-200 hover:bg-background hover:shadow-sm"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105",
                      config.bg
                    )}
                  >
                    <TypeIcon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {tx.description || tx.category_name || "Transacción"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.account_name || "—"}
                      {" · "}
                      {new Date(tx.date).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-semibold", config.color)}>
                    {config.sign}
                    {formatCurrency(tx.amount, tx.currency)}
                  </p>
                  {tx.category_name && (
                    <div className="flex items-center justify-end gap-1">
                      {React.createElement(getIconByName(tx.category_icon), {
                        className: "h-3 w-3",
                        style: { color: tx.category_color || undefined },
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

import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Tag,
  type LucideIcon,
} from "lucide-react";
import * as Icons from "lucide-react";
import type { RecentTransactionItem } from "@/core/models/dashboard";
import { formatCurrency } from "@/core/utils/currency";

interface RecentTransactionsWidgetProps {
  transactions: RecentTransactionItem[];
}

const transactionTypeConfig = {
  INCOME: {
    icon: ArrowDownRight,
    color: "text-green-600",
    bg: "bg-green-600/10",
    sign: "+",
  },
  EXPENSE: {
    icon: ArrowUpRight,
    color: "text-red-600",
    bg: "bg-red-600/10",
    sign: "-",
  },
  TRANSFER: {
    icon: ArrowLeftRight,
    color: "text-blue-600",
    bg: "bg-blue-600/10",
    sign: "",
  },
} as const;

function resolveCategoryIcon(iconName: string | null): LucideIcon {
  if (!iconName) return Tag;
  const icon = (Icons as unknown as Record<string, LucideIcon>)[iconName];
  return icon ?? Tag;
}

export function RecentTransactionsWidget({
  transactions,
}: RecentTransactionsWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-card-foreground">
          Transacciones recientes
        </h2>
        <Link
          href="/transactions"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Ver todas
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
            const CategoryIcon = resolveCategoryIcon(tx.category_icon);

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={
                      "flex h-9 w-9 items-center justify-center rounded-full " +
                      config.bg
                    }
                  >
                    <TypeIcon className={"h-4 w-4 " + config.color} />
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
                  <p className={"text-sm font-semibold " + config.color}>
                    {config.sign}
                    {formatCurrency(tx.amount, tx.currency)}
                  </p>
                  {tx.category_name && (
                    <div className="flex items-center justify-end gap-1">
                      <CategoryIcon
                        className="h-3 w-3"
                        style={{ color: tx.category_color || undefined }}
                      />
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
    </div>
  );
}

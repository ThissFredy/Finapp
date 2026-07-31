"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/core/utils/currency";
import type { Currency } from "@/core/models/account";
import type { TransactionWithDetails } from "@/core/models/transaction";
import { cn } from "@/lib/utils";

interface TransactionItemProps {
  transaction: TransactionWithDetails;
  onEdit: (t: TransactionWithDetails) => void;
  onDelete: (t: TransactionWithDetails) => void;
}

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const {
    type,
    amount,
    currency,
    exchange_rate,
    date,
    description,
    account_name,
    from_account_name,
    to_account_name,
    category_name,
    category_color,
    category_deleted_at,
  } = transaction;

  const isIncome = type === "INGRESO";
  const isExpense = type === "GASTO";
  const isTransfer = type === "TRANSFERENCIA";

  const Icon = isIncome
    ? ArrowDownCircle
    : isExpense
      ? ArrowUpCircle
      : ArrowLeftRight;

  const colorClass = isIncome
    ? "text-emerald-600"
    : isExpense
      ? "text-rose-600"
      : "text-blue-600";

  const bgClass = isIncome
    ? "bg-emerald-500/10"
    : isExpense
      ? "bg-rose-500/10"
      : "bg-blue-500/10";

  const sign = isIncome ? "+" : isExpense ? "-" : "";
  const accountLabel = isTransfer
    ? `${from_account_name} → ${to_account_name}`
    : account_name;

  const categoryLabel = category_deleted_at
    ? "(Categoría eliminada)"
    : category_name;

  const formattedAmount = formatCurrency(amount, currency as Currency);
  const convertedNote =
    !isTransfer && exchange_rate !== 1
      ? ` · equiv. ${formatCurrency(
          amount * exchange_rate,
          currency as Currency,
        )} en ${account_name}`
      : "";

  return (
    <div className="group flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-all duration-200 hover:bg-muted/60">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105",
            bgClass,
          )}
          style={{
            backgroundColor:
              category_color && !isTransfer && !isIncome
                ? `${category_color}22`
                : undefined,
          }}
        >
          <Icon className={cn("h-5 w-5", colorClass)} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {description || categoryLabel || "Transacción"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {accountLabel} · {new Date(date).toLocaleDateString("es-CO")}
            {convertedNote}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className={cn("text-sm font-semibold tabular-nums", colorClass)}>
          {sign}
          {formattedAmount}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          {currency}
        </span>
        <div className="flex opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(transaction)}
            aria-label="Editar transacción"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(transaction)}
            aria-label="Eliminar transacción"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

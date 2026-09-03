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
    ? "text-income"
    : isExpense
      ? "text-expense"
      : "text-transfer";

  const bgClass = isIncome
    ? "bg-income/12"
    : isExpense
      ? "bg-expense/12"
      : "bg-transfer/12";

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
    <div className="group flex items-center justify-between gap-3 rounded-2xl border border-transparent px-2 py-2.5 transition-all duration-200 hover:border-border/60 hover:bg-muted/50 md:px-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105",
            bgClass,
          )}
          style={{
            backgroundColor:
              category_color && !isTransfer && !isIncome
                ? `${category_color}22`
                : undefined,
          }}
        >
          <Icon className={cn("size-5", colorClass)} aria-hidden="true" />
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
      <div className="flex shrink-0 items-center gap-0.5 md:gap-1">
        <span className={cn("numeric text-sm font-semibold", colorClass)}>
          {sign}
          {formattedAmount}
        </span>
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
          {currency}
        </span>
        <div className="flex md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(transaction)}
            aria-label={`Editar transacción ${description || category_name || ""}`.trim()}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(transaction)}
            aria-label={`Eliminar transacción ${description || category_name || ""}`.trim()}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

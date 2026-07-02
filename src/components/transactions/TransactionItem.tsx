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

  const isIncome = type === "INCOME";
  const isExpense = type === "EXPENSE";
  const isTransfer = type === "TRANSFER";

  const Icon = isIncome
    ? ArrowDownCircle
    : isExpense
      ? ArrowUpCircle
      : ArrowLeftRight;

  const colorClass = isIncome
    ? "text-emerald-600"
    : isExpense
      ? "text-rose-600"
      : "text-muted-foreground";

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
          currency as Currency
        )} en ${account_name}`
      : "";

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: category_color ? `${category_color}22` : undefined,
          }}
        >
          <Icon className={`h-5 w-5 ${colorClass}`} />
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
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${colorClass}`}>
          {sign}
          {formattedAmount}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(transaction)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={() => onDelete(transaction)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import type { TransactionWithDetails } from "@/core/models/transaction";

interface TransactionListProps {
  items: TransactionWithDetails[];
  total_count: number;
  page: number;
  page_size: number;
  onPageChange: (page: number) => void;
  onEdit: (t: TransactionWithDetails) => void;
  onDelete: (t: TransactionWithDetails) => void;
}

export function TransactionList({
  items,
  total_count,
  page,
  page_size,
  onPageChange,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const totalPages = Math.max(1, Math.ceil(total_count / page_size));

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No hay transacciones que coincidan con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="rounded-lg border bg-card px-4">
        {items.map((t) => (
          <TransactionItem
            key={t.id}
            transaction={t}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          Página {page} de {totalPages} · {total_count} transacciones
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}

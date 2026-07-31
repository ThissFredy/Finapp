"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { AnimatedListItem } from "@/components/ui/motion";
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
      <div className="rounded-2xl border border-dashed border-border bg-card/50 py-12 text-center text-sm text-muted-foreground">
        No hay transacciones que coincidan con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border bg-card">
        {items.map((t, index) => (
          <div
            key={t.id}
            className="transition-colors hover:bg-muted/40"
          >
            <AnimatedListItem index={index}>
              <TransactionItem
                transaction={t}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </AnimatedListItem>
            {index < items.length - 1 && (
              <div className="mx-3 h-px bg-border" />
            )}
          </div>
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
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

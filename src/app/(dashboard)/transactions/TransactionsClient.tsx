"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { DeleteTransactionDialog } from "@/components/transactions/DeleteTransactionDialog";
import { FadeIn } from "@/components/ui/motion";
import { listTransactionsAction } from "@/app/(dashboard)/transactions/actions";
import type { Account } from "@/core/models/account";
import type { Category } from "@/core/models/category";
import type { TransactionWithDetails } from "@/core/models/transaction";

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface TransactionsClientProps {
  initialItems: TransactionWithDetails[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  accounts: Account[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  allCategories: Category[];
  exchangeRates: ExchangeRateRow[];
}

export function TransactionsClient({
  initialItems,
  initialTotal,
  initialPage,
  initialPageSize,
  accounts,
  incomeCategories,
  expenseCategories,
  allCategories,
  exchangeRates,
}: TransactionsClientProps) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    account_id: "",
    category_id: "",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionWithDetails | null>(null);
  const [deleting, setDeleting] = useState<TransactionWithDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(
    async (nextPage: number, nextFilters = filters) => {
      setLoading(true);
      const result = await listTransactionsAction({
        from_date: nextFilters.from_date || undefined,
        to_date: nextFilters.to_date || undefined,
        account_id: nextFilters.account_id || undefined,
        category_id: nextFilters.category_id || undefined,
        page: nextPage,
        page_size: pageSize,
      });
      setLoading(false);
      if (result.data) {
        setItems(result.data.items);
        setTotal(result.data.total_count);
        setPage(result.data.page);
      }
    },
    [filters, pageSize],
  );

  // --- Handlers ---
  function handleOnSuccess() {
    refresh(1, filters);
  }

  function handleFiltersChange(next: typeof filters) {
    setFilters(next);
    refresh(1, next);
  }

  function handlePageChange(nextPage: number) {
    refresh(nextPage);
  }

  function handleNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(t: TransactionWithDetails) {
    setEditing(t);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <FadeIn direction="up" delay={1}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Transacciones
            </h1>
            <p className="text-sm text-muted-foreground">
              Revisa y gestiona todos tus movimientos.
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva transacción
          </Button>
        </div>
      </FadeIn>

      <FadeIn direction="up" delay={2}>
        <div className="glass-card rounded-2xl p-4">
          <TransactionFilters
            accounts={accounts}
            categories={allCategories}
            from_date={filters.from_date}
            to_date={filters.to_date}
            account_id={filters.account_id}
            category_id={filters.category_id}
            onChange={handleFiltersChange}
          />
        </div>
      </FadeIn>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="glass-card flex flex-col items-center justify-center rounded-2xl py-16 text-sm text-muted-foreground"
        >
          <Loader2 className="mb-3 size-6 animate-spin" aria-hidden="true" />
          Cargando transacciones...
        </div>
      ) : (
        <TransactionList
          items={items}
          total_count={total}
          page={page}
          page_size={pageSize}
          onPageChange={handlePageChange}
          onEdit={handleEdit}
          onDelete={setDeleting}
        />
      )}

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleOnSuccess}
        accounts={accounts}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        exchangeRates={exchangeRates}
        transaction={editing}
      />

      <DeleteTransactionDialog
        transaction={deleting}
        onClose={() => setDeleting(null)}
        onSuccess={handleOnSuccess}
      />
    </div>
  );
}

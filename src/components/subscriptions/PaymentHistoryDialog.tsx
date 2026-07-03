"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/core/utils/currency";
import { getPaymentHistoryAction } from "@/app/(dashboard)/subscriptions/actions";
import type { Currency } from "@/core/models/account";
import type { SubscriptionWithMeta } from "@/core/models/subscription";
import type { TransactionWithDetails } from "@/core/models/transaction";

interface PaymentHistoryDialogProps {
  subscription: SubscriptionWithMeta | null;
  onClose: () => void;
}

const PAGE_SIZE = 10;

export function PaymentHistoryDialog({
  subscription,
  onClose,
}: PaymentHistoryDialogProps) {
  const [items, setItems] = useState<TransactionWithDetails[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (subscriptionId: string, nextPage: number) => {
      setLoading(true);
      const result = await getPaymentHistoryAction(
        subscriptionId,
        nextPage,
        PAGE_SIZE
      );
      setLoading(false);
      if (result.data) {
        setItems(result.data.items);
        setTotalCount(result.data.total_count);
        setPage(result.data.page);
      }
    },
    []
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (subscription) {
      setItems([]);
      setTotalCount(0);
      setPage(1);
      load(subscription.id, 1);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [subscription, load]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <Dialog open={!!subscription} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Historial de pagos{subscription ? `: ${subscription.name}` : ""}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Cargando...
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se han registrado pagos para esta suscripción.
          </p>
        ) : (
          <div className="space-y-1">
            <div className="rounded-lg border bg-card px-4">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-3 border-b last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {t.description || "Pago de suscripción"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("es-CO")} ·{" "}
                      {t.account_name}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-rose-600">
                    -{formatCurrency(t.amount, t.currency as Currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages} · {totalCount} pagos
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => load(subscription!.id, page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => load(subscription!.id, page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

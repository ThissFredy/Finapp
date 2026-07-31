"use client";

import { useState, useEffect, useCallback } from "react";
import { History, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary sm:mx-0">
            <History className="h-5 w-5 text-muted-foreground" />
          </div>
          <DialogTitle>
            Historial de pagos{subscription ? `: ${subscription.name}` : ""}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mb-2 h-5 w-5 animate-spin" />
            Cargando historial...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 py-8 text-center text-sm text-muted-foreground">
            No se han registrado pagos para esta suscripción.
          </div>
        ) : (
          <div className="space-y-1">
            <div className="overflow-hidden rounded-2xl border bg-card">
              {items.map((t, index) => (
                <div key={t.id}>
                  <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40">
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
                  {index < items.length - 1 && (
                    <div className="mx-3 h-px bg-border" />
                  )}
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
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => load(subscription!.id, page + 1)}
                >
                  Siguiente
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

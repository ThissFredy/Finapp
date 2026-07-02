"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteTransactionAction } from "@/app/(dashboard)/transactions/actions";
import type { TransactionWithDetails } from "@/core/models/transaction";

interface DeleteTransactionDialogProps {
  transaction: TransactionWithDetails | null;
  onClose: () => void;
}

export function DeleteTransactionDialog({
  transaction,
  onClose,
}: DeleteTransactionDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!transaction) return;
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", transaction.id);
    const result = await deleteTransactionAction(formData);
    setPending(false);
    if (result.error) {
      setError(result.error._form?.[0] ?? "Error al eliminar");
    } else {
      onClose();
    }
  }

  return (
    <Dialog open={!!transaction} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar transacción</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. La transacción se eliminará
            permanentemente y se <strong>revertirá su efecto</strong> sobre el
            saldo de la cuenta involucrada.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

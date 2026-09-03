"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteSubscriptionAction } from "@/app/(dashboard)/subscriptions/actions";
import type { SubscriptionWithMeta } from "@/core/models/subscription";

interface DeleteSubscriptionDialogProps {
  subscription: SubscriptionWithMeta | null;
  onClose: () => void;
}

export function DeleteSubscriptionDialog({
  subscription,
  onClose,
}: DeleteSubscriptionDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!subscription) return;
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", subscription.id);
    const result = await deleteSubscriptionAction(formData);
    setPending(false);
    if (result.error) {
      setError(result.error._form?.[0] ?? "Error al eliminar");
    } else {
      onClose();
    }
  }

  return (
    <Dialog open={!!subscription} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/12">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle>Eliminar suscripción</DialogTitle>
          <DialogDescription>
            La suscripción se eliminará de todas las vistas. Las
            transacciones de pago pasadas permanecerán en el historial de
            transacciones.
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
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Eliminar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

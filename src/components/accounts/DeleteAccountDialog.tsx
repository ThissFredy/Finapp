"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteAccountAction } from "@/app/(dashboard)/accounts/actions";
import type { AccountWithMeta } from "@/core/models/account";

interface DeleteAccountDialogProps {
  account: AccountWithMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({
  account,
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const [status, setStatus] = useState<"idle" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setStatus("deleting");
    setError(null);
    const result = await deleteAccountAction(account.id);
    if (result.success) {
      onOpenChange(false);
    } else {
      setStatus("idle");
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/12">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle>Eliminar cuenta</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que quieres eliminar &quot;{account.name}&quot;? Esta
            acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={status === "deleting"}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={status === "deleting"}
          >
            {status === "deleting" ? (
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

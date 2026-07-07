"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteCategoryAction } from "@/app/(dashboard)/categories/actions";
import type { CategoryWithMeta } from "@/core/models/category";

interface DeleteCategoryDialogProps {
  category: CategoryWithMeta | null;
  availableTargets: CategoryWithMeta[];
  onClose: () => void;
}

interface DeleteFormProps {
  category: CategoryWithMeta;
  availableTargets: CategoryWithMeta[];
  onClose: () => void;
}

function DeleteForm({ category, availableTargets, onClose }: DeleteFormProps) {
  const [strategy, setStrategy] = React.useState<
    "hard" | "reassign" | "soft"
  >(category.has_transactions ? "reassign" : "hard");
  const [reassignTo, setReassignTo] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("id", category.id);
    formData.set("strategy", strategy);
    if (strategy === "reassign") {
      formData.set("reassignTo", reassignTo);
    }
    const result = await deleteCategoryAction(formData);
    if (!result.success) {
      setErrors(result.fieldErrors ?? { _form: [result.error] });
    } else {
      onClose();
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 sm:mx-0">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <DialogTitle>Eliminar categoría</DialogTitle>
        <DialogDescription>
          {category.has_transactions
            ? `La categoría &quot;${category.name}&quot; tiene transacciones asociadas. Elige cómo proceder.`
            : `¿Seguro que deseas eliminar la categoría &quot;${category.name}&quot;? Esta acción no se puede deshacer.`}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {category.has_transactions && (
          <>
            <div className="space-y-2">
              <Label>Estrategia de eliminación</Label>
              <Select
                value={strategy}
                onValueChange={(v) =>
                  v && setStrategy(v as "hard" | "reassign" | "soft")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reassign">
                    Re-asignar transacciones a otra categoría
                  </SelectItem>
                  <SelectItem value="soft">
                    Mantener en historial (soft delete)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {strategy === "reassign" && (
              <div className="space-y-2">
                <Label>Categoría destino</Label>
                {availableTargets.length === 0 ? (
                  <p className="text-sm text-destructive">
                    No hay otras categorías de este tipo disponibles. Crea una
                    nueva categoría del mismo tipo antes de eliminar esta, o
                    usa &quot;mantener en historial&quot;.
                  </p>
                ) : (
                  <Select
                    value={reassignTo}
                    onValueChange={(v) => v && setReassignTo(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTargets.map((target) => (
                        <SelectItem key={target.id} value={target.id}>
                          {target.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.reassignTo && (
                  <p className="text-sm text-destructive">
                    {errors.reassignTo[0]}
                  </p>
                )}
              </div>
            )}

            {strategy === "soft" && (
              <p className="text-sm text-muted-foreground">
                La categoría se marcará como eliminada. Las transacciones
                existentes conservarán su referencia y se mostrará como
                &quot;(Categoría eliminada)&quot; en el historial. No aparecerá
                en los selectores de nuevas transacciones.
              </p>
            )}
          </>
        )}

        {errors._form && (
          <p className="text-sm text-destructive">{errors._form[0]}</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="destructive">
            Eliminar
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function DeleteCategoryDialog({
  category,
  availableTargets,
  onClose,
}: DeleteCategoryDialogProps) {
  if (!category) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        key={category.id}
        className="sm:max-w-[480px]"
      >
        <DeleteForm
          category={category}
          availableTargets={availableTargets}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

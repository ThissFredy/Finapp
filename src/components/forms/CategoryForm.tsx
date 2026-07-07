"use client";

import * as React from "react";
import { Tags } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { IconPicker } from "@/components/ui/IconPicker";
import {
  createCategoryAction,
  updateCategoryAction,
} from "@/app/(dashboard)/categories/actions";
import type { Category, CategoryType } from "@/core/models/category";

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
}

export function CategoryForm({ open, onClose, category }: CategoryFormProps) {
  const isEditing = !!category;
  const [name, setName] = React.useState(category?.name ?? "");
  const [type, setType] = React.useState<CategoryType>(category?.type ?? "EXPENSE");
  const [color, setColor] = React.useState(category?.color ?? "#6B7280");
  const [icon, setIcon] = React.useState(category?.icon ?? "tag");
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("name", name);
    formData.set("type", type);
    formData.set("color", color);
    formData.set("icon", icon);

    let result;
    if (isEditing && category) {
      formData.set("id", category.id);
      result = await updateCategoryAction(formData);
    } else {
      result = await createCategoryAction(formData);
    }

    if (!result.success) {
      setErrors(result.fieldErrors ?? { _form: [result.error] });
    } else {
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent key={category?.id ?? "new"} className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary sm:mx-0">
            <Tags className="h-5 w-5 text-muted-foreground" />
          </div>
          <DialogTitle>
            {isEditing ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Ej. Salario, Comida, Transporte..."
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => v && setType(v as CategoryType)}
              disabled={isEditing}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Ingreso</SelectItem>
                <SelectItem value="EXPENSE">Gasto</SelectItem>
              </SelectContent>
            </Select>
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                El tipo no puede modificarse después de crear la categoría.
              </p>
            )}
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
            {errors.color && (
              <p className="text-sm text-destructive">{errors.color[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Ícono</Label>
            <IconPicker value={icon} onChange={setIcon} />
            {errors.icon && (
              <p className="text-sm text-destructive">{errors.icon[0]}</p>
            )}
          </div>

          {errors._form && (
            <p className="text-sm text-destructive">{errors._form[0]}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{isEditing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

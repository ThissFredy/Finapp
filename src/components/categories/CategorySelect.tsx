"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as Icons from "lucide-react";
import { type LucideIcon } from "lucide-react";
import type { Category, CategoryType } from "@/core/models/category";

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  type: CategoryType;
  placeholder?: string;
}

function getIconComponent(name: string): LucideIcon {
  const pascalName =
    name.charAt(0).toUpperCase() +
    name.slice(1).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return (
    ((Icons as unknown) as Record<string, LucideIcon>)[pascalName] ?? Icons.Tag
  );
}

export function CategorySelect({
  value,
  onChange,
  categories,
  type,
  placeholder = "Selecciona una categoría...",
}: CategorySelectProps) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No hay categorías de {type === "INCOME" ? "ingreso" : "gasto"}.{" "}
            <a href="/categories" className="text-primary underline">
              Crear una
            </a>
          </div>
        ) : (
          categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              <div className="flex items-center gap-2">
                {React.createElement(getIconComponent(cat.icon), {
                  className: "h-4 w-4",
                  style: { color: cat.color },
                })}
                {cat.name}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

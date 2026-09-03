"use client";

import * as React from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { getIconByName } from "@/lib/icons";
import type { CategoryWithMeta } from "@/core/models/category";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  category: CategoryWithMeta;
  onEdit: (category: CategoryWithMeta) => void;
  onDelete: (category: CategoryWithMeta) => void;
}

export function CategoryCard({
  category,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  return (
    <Card className="group card-lift flex items-center gap-3 p-4">
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
        style={{ backgroundColor: category.color + "20" }}
        aria-hidden="true"
      >
        {React.createElement(getIconByName(category.icon), {
          className: "size-5",
          style: { color: category.color },
        })}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {category.has_transactions
            ? "Tiene transacciones"
            : "Sin transacciones"}
        </p>
      </div>

      <Badge
        variant="secondary"
        className={cn(
          "shrink-0",
          category.type === "INGRESO" && "bg-income/12 text-income hover:bg-income/20",
          category.type === "GASTO" && "bg-expense/12 text-expense hover:bg-expense/20",
        )}
      >
        {category.type === "INGRESO" ? "Ingreso" : "Gasto"}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Acciones de categoría ${category.name}`}
            className="shrink-0 opacity-70 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(category)}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(category)}
            variant="destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
}

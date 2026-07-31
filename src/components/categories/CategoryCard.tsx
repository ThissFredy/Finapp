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
    <Card className="group flex items-center gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
        style={{ backgroundColor: category.color + "20" }}
      >
        {React.createElement(getIconByName(category.icon), {
          className: "h-5 w-5",
          style: { color: category.color },
        })}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-center">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {category.has_transactions
            ? "Tiene transacciones"
            : "Sin transacciones"}
        </p>
      </div>

      <Badge
        variant={category.type === "INGRESO" ? "default" : "secondary"}
        className={cn(
          "shrink-0",
          category.type === "INGRESO" &&
            "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400",
          category.type === "GASTO" &&
            "bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400",
        )}
      >
        {category.type === "INGRESO" ? "Ingreso" : "Gasto"}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(category)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(category)}
            variant="destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
}

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
    <Card className="flex items-center gap-3 p-4">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: category.color + "20" }}
      >
        {React.createElement(getIconByName(category.icon), {
          className: "h-5 w-5",
          style: { color: category.color },
        })}
      </div>

      <div className="flex-1">
        <p className="font-medium">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {category.has_transactions
            ? "Tiene transacciones"
            : "Sin transacciones"}
        </p>
      </div>

      <Badge variant={category.type === "INCOME" ? "default" : "secondary"}>
        {category.type === "INCOME" ? "Ingreso" : "Gasto"}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
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

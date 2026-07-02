"use client";

import * as React from "react";
import { MoreVertical, Pencil, Trash2, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import * as Icons from "lucide-react";
import type { CategoryWithMeta } from "@/core/models/category";

interface CategoryCardProps {
  category: CategoryWithMeta;
  onEdit: (category: CategoryWithMeta) => void;
  onDelete: (category: CategoryWithMeta) => void;
}

function getIconComponent(name: string): LucideIcon {
  const pascalName =
    name.charAt(0).toUpperCase() +
    name.slice(1).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return (
    ((Icons as unknown) as Record<string, LucideIcon>)[pascalName] ?? Icons.Tag
  );
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
        {React.createElement(getIconComponent(category.icon), {
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

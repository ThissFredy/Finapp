"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account } from "@/core/models/account";
import type { Category } from "@/core/models/category";

interface TransactionFiltersProps {
  accounts: Account[];
  categories: Category[];
  from_date: string;
  to_date: string;
  account_id: string;
  category_id: string;
  onChange: (filters: {
    from_date: string;
    to_date: string;
    account_id: string;
    category_id: string;
  }) => void;
}

export function TransactionFilters({
  accounts,
  categories,
  from_date,
  to_date,
  account_id,
  category_id,
  onChange,
}: TransactionFiltersProps) {
  const hasFilters = from_date || to_date || account_id || category_id;
  const isValidDateRange = !from_date || !to_date || from_date <= to_date;

  function handleFromDateChange(value: string) {
    onChange({
      from_date: value,
      to_date: !value || (to_date && value > to_date) ? "" : to_date,
      account_id,
      category_id,
    });
  }

  function handleToDateChange(value: string) {
    if (!from_date || (value && value < from_date)) {
      return;
    }

    onChange({
      from_date,
      to_date: value,
      account_id,
      category_id,
    });
  }

  return (
    <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor="from_date">Desde</Label>
        <Input
          id="from_date"
          type="date"
          value={from_date}
          onChange={(e) => handleFromDateChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to_date">Hasta</Label>
        <Input
          id="to_date"
          type="date"
          value={to_date}
          min={from_date || undefined}
          disabled={!from_date}
          aria-invalid={!isValidDateRange}
          onChange={(e) => handleToDateChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Cuenta</Label>
        <Select
          value={account_id || "Todas"}
          onValueChange={(v) =>
            onChange({
              from_date,
              to_date,
              account_id: !v || v === "Todas" ? "" : v,
              category_id,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas">
              {account_id
                ? accounts.find((a) => a.id === account_id)?.name
                : "Todas las cuentas"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas las cuentas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Categoría</Label>
        <Select
          value={category_id || "Todas"}
          onValueChange={(v) =>
            onChange({
              from_date,
              to_date,
              account_id,
              category_id: !v || v === "Todas" ? "" : v,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas">
              {category_id
                ? categories.find((c) => c.id === category_id)?.name
                : "Todas las categorías"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <div className="flex items-end lg:col-span-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                from_date: "",
                to_date: "",
                account_id: "",
                category_id: "",
              })
            }
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}

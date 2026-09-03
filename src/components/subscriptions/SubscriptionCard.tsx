"use client";

import * as React from "react";
import {
  Pencil,
  Trash2,
  History,
  CheckCircle2,
  CalendarClock,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriptionStatusBadge } from "@/components/subscriptions/SubscriptionStatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/core/utils/currency";
import { cn } from "@/lib/utils";
import { getIconByName } from "@/lib/icons";
import type { Currency } from "@/core/models/account";
import type { SubscriptionWithMeta } from "@/core/models/subscription";

interface SubscriptionCardProps {
  subscription: SubscriptionWithMeta;
  onEdit: (s: SubscriptionWithMeta) => void;
  onDelete: (s: SubscriptionWithMeta) => void;
  onPay: (s: SubscriptionWithMeta) => void;
  onHistory: (s: SubscriptionWithMeta) => void;
}

export function SubscriptionCard({
  subscription,
  onEdit,
  onDelete,
  onPay,
  onHistory,
}: SubscriptionCardProps) {
  const {
    name,
    amount,
    currency,
    billing_cycle,
    next_billing_date,
    account_name,
    account_status,
    category_name,
    category_color,
    category_deleted_at,
    category_icon,
    status,
    is_paid_this_cycle,
  } = subscription;

  const isOverdue =
    status === "ACTIVE" &&
    new Date(next_billing_date) < new Date(new Date().toDateString());

  const canPay = status === "ACTIVE" && !is_paid_this_cycle;
  const cycleLabel = billing_cycle === "MONTHLY" ? "Mensual" : "Anual";
  const categoryLabel = category_deleted_at
    ? "(Categoría eliminada)"
    : category_name;

  const categoryIconName = category_icon;

  return (
    <div className="glass-card group card-lift flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
          style={{
            backgroundColor: category_color
              ? `${category_color}22`
              : undefined,
          }}
        >
          {category_color ? (
            React.createElement(getIconByName(categoryIconName), {
              className: "size-5",
              style: { color: category_color },
            })
          ) : (
            <CalendarClock className="size-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <SubscriptionStatusBadge status={status} />
            {isOverdue && (
              <Badge
                variant="destructive"
                className="text-xs bg-expense/12 text-expense hover:bg-expense/20"
              >
                Vencida
              </Badge>
            )}
            {is_paid_this_cycle && (
              <Badge
                variant="secondary"
                className="text-xs bg-income/12 text-income hover:bg-income/20"
              >
                <CheckCircle2 className="mr-1 size-3" aria-hidden="true" />
                Pagado
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {cycleLabel}
            {categoryLabel && ` · ${categoryLabel}`}
            {account_name && ` · ${account_name}`}
            {account_status === "INACTIVE" && " (inactiva)"}
          </p>
          <p className="text-xs text-muted-foreground">
            Próximo corte:{" "}
            <span
              className={cn(
                isOverdue ? "font-medium text-expense" : "text-muted-foreground"
              )}
            >
              {new Date(next_billing_date).toLocaleDateString("es-CO")}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
        <span className="numeric text-base font-bold">
          {formatCurrency(amount, currency as Currency)}
        </span>
        <div className="flex items-center gap-1">
          {canPay && (
            <Button size="sm" onClick={() => onPay(subscription)}>
              Registrar pago
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones de suscripción ${name}`}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onHistory(subscription)}>
                <History className="size-4" aria-hidden="true" />
                Historial
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(subscription)}>
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(subscription)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

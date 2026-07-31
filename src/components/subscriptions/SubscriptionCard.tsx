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
    <div className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
          style={{
            backgroundColor: category_color
              ? `${category_color}22`
              : undefined,
          }}
        >
          {category_color ? (
            React.createElement(getIconByName(categoryIconName), {
              className: "h-5 w-5",
              style: { color: category_color },
            })
          ) : (
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <SubscriptionStatusBadge status={status} />
            {isOverdue && (
              <Badge
                variant="destructive"
                className="text-xs bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400"
              >
                Vencida
              </Badge>
            )}
            {is_paid_this_cycle && (
              <Badge
                variant="secondary"
                className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400"
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
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
                isOverdue ? "font-medium text-rose-600" : "text-muted-foreground"
              )}
            >
              {new Date(next_billing_date).toLocaleDateString("es-CO")}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
        <span className="text-base font-bold tabular-nums">
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
                size="icon"
                className="h-8 w-8"
                aria-label="Acciones de suscripción"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onHistory(subscription)}>
                <History className="mr-2 h-4 w-4" />
                Historial
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(subscription)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(subscription)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

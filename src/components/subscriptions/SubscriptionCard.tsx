"use client";

import {
  Pencil,
  Trash2,
  History,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriptionStatusBadge } from "@/components/subscriptions/SubscriptionStatusBadge";
import { formatCurrency } from "@/core/utils/currency";
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
    category_icon,
    category_color,
    category_deleted_at,
    status,
    is_paid_this_cycle,
  } = subscription;

  const isOverdue =
    status === "ACTIVE" &&
    new Date(next_billing_date) < new Date(new Date().toDateString());

  const canPay =
    status === "ACTIVE" && !is_paid_this_cycle;

  const cycleLabel = billing_cycle === "MONTHLY" ? "Mensual" : "Anual";
  const categoryLabel = category_deleted_at
    ? "(Categoría eliminada)"
    : category_name;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3 min-w-0">
        {/* Ícono de categoría */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: category_color
              ? `${category_color}22`
              : undefined,
          }}
        >
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <SubscriptionStatusBadge status={status} />
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                Vencida
              </Badge>
            )}
            {is_paid_this_cycle && (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs"
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Pagado
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {cycleLabel} · {categoryLabel} · {account_name ?? "Sin cuenta"}
            {account_status === "INACTIVE" && " (inactiva)"}
          </p>
          <p className="text-xs text-muted-foreground">
            Próximo corte:{" "}
            {new Date(next_billing_date).toLocaleDateString("es-CO")}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <span className="text-sm font-bold">
          {formatCurrency(amount, currency as Currency)}
        </span>
        <div className="flex items-center gap-1">
          {canPay && (
            <Button
              size="sm"
              onClick={() => onPay(subscription)}
            >
              Registrar pago
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onHistory(subscription)}
            title="Historial de pagos"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(subscription)}
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(subscription)}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

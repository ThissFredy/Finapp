"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/core/utils/currency";
import { getIconByName } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { listUpcomingPaymentsAction } from "@/app/(dashboard)/subscriptions/actions";
import type { Currency } from "@/core/models/account";
import type { SubscriptionWithMeta } from "@/core/models/subscription";

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface UpcomingPaymentsListProps {
  payments: SubscriptionWithMeta[];
  onPaymentsChange: (payments: SubscriptionWithMeta[]) => void;
  initialYear: number;
  initialMonth: number;
  exchangeRates: ExchangeRateRow[];
  preferredCurrency: Currency;
  onPay: (s: SubscriptionWithMeta) => void;
}

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function UpcomingPaymentsList({
  payments,
  onPaymentsChange,
  initialYear,
  initialMonth,
  exchangeRates,
  preferredCurrency,
  onPay,
}: UpcomingPaymentsListProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const result = await listUpcomingPaymentsAction(y, m);
    setLoading(false);
    if (result.data) {
      onPaymentsChange(result.data);
    }
  }, [onPaymentsChange]);

  function handlePrevMonth() {
    let m = month - 1;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setMonth(m);
    setYear(y);
    refresh(y, m);
  }

  function handleNextMonth() {
    let m = month + 1;
    let y = year;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
    refresh(y, m);
  }

  const convert = useCallback(
    (amount: number, from: string): number => {
      if (from === preferredCurrency) return amount;
      const rate = exchangeRates.find(
        (r) => r.from_currency === from && r.to_currency === preferredCurrency
      )?.rate;
      return rate ? amount * rate : amount;
    },
    [exchangeRates, preferredCurrency]
  );

  const summary = useMemo(() => {
    const total = payments.reduce(
      (sum, s) => sum + convert(s.amount, s.currency),
      0
    );
    const paidCount = payments.filter((s) => s.is_paid_this_cycle).length;
    return {
      total,
      totalCount: payments.length,
      paidCount,
      pendingCount: payments.length - paidCount,
    };
  }, [payments, convert]);

  const grouped = useMemo(() => {
    const map = new Map<string, SubscriptionWithMeta[]>();
    for (const p of payments) {
      const key = p.next_billing_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [payments]);

  return (
    <div className="space-y-5">
      {/* Navegación de mes */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[180px] text-center">
            {monthNames[month - 1]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryPill label="Total del mes" value={formatCurrency(summary.total, preferredCurrency)} />
        <SummaryPill
          label="Pendientes"
          value={String(summary.pendingCount)}
          valueClassName="text-amber-600"
        />
        <SummaryPill
          label="Pagados"
          value={String(summary.paidCount)}
          valueClassName="text-emerald-600"
        />
      </div>

      {/* Lista agrupada por fecha */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/50 py-16 text-sm text-muted-foreground">
          <Loader2 className="mb-3 h-6 w-6 animate-spin" />
          Cargando pagos...
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 py-12 text-center text-sm text-muted-foreground">
          No hay suscripciones con corte en este mes.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <div key={date} className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {new Date(date).toLocaleDateString("es-CO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <div className="space-y-2">
                {items.map((s) => {
                  const CategoryIcon = getIconByName(s.category_icon);
                  return (
                    <div
                      key={s.id}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all duration-200 hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: s.category_color
                              ? `${s.category_color}22`
                              : undefined,
                          }}
                        >
                          {s.category_color ? (
                            <CategoryIcon
                              className="h-4 w-4"
                              style={{ color: s.category_color }}
                            />
                          ) : (
                            <CalendarClock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {s.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.category_name} · {s.account_name ?? "Sin cuenta"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(s.amount, s.currency as Currency)}
                        </span>
                        {s.is_paid_this_cycle ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Pagado
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => onPay(s)}
                          >
                            Registrar pago
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryPill({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold", valueClassName)}>{value}</p>
    </div>
  );
}

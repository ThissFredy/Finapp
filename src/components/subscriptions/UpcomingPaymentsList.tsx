"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/core/utils/currency";
import { listUpcomingPaymentsAction } from "@/app/(dashboard)/subscriptions/actions";
import type { Currency } from "@/core/models/account";
import type { SubscriptionWithMeta } from "@/core/models/subscription";

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface UpcomingPaymentsListProps {
  initialPayments: SubscriptionWithMeta[];
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
  initialPayments,
  initialYear,
  initialMonth,
  exchangeRates,
  preferredCurrency,
  onPay,
}: UpcomingPaymentsListProps) {
  const [payments, setPayments] = useState(initialPayments);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const result = await listUpcomingPaymentsAction(y, m);
    setLoading(false);
    if (result.data) {
      setPayments(result.data);
    }
  }, []);

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

  // Convertir monto a moneda preferida
  function convert(amount: number, from: string): number {
    if (from === preferredCurrency) return amount;
    const rate = exchangeRates.find(
      (r) => r.from_currency === from && r.to_currency === preferredCurrency
    )?.rate;
    return rate ? amount * rate : amount;
  }

  // Resumen del mes
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
  }, [payments, exchangeRates, preferredCurrency]);

  // Agrupar por fecha
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
    <div className="space-y-4">
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
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Total del mes</p>
          <p className="text-lg font-bold">
            {formatCurrency(summary.total, preferredCurrency)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="text-lg font-bold text-amber-600">
            {summary.pendingCount}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Pagados</p>
          <p className="text-lg font-bold text-emerald-600">
            {summary.paidCount}
          </p>
        </div>
      </div>

      {/* Lista agrupada por fecha */}
      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Cargando...
        </p>
      ) : grouped.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
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
                {items.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: s.category_color
                            ? `${s.category_color}22`
                            : undefined,
                        }}
                      >
                        <span className="text-xs font-medium">
                          {s.category_icon?.[0]?.toUpperCase() ?? "?"}
                        </span>
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
                      <span className="text-sm font-semibold">
                        {formatCurrency(s.amount, s.currency as Currency)}
                      </span>
                      {s.is_paid_this_cycle ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

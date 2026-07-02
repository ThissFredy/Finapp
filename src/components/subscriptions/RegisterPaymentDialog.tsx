"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerPaymentAction } from "@/app/(dashboard)/subscriptions/actions";
import { formatCurrency } from "@/core/utils/currency";
import type { Account, Currency } from "@/core/models/account";
import type { SubscriptionWithMeta } from "@/core/models/subscription";

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface RegisterPaymentDialogProps {
  subscription: SubscriptionWithMeta | null;
  accounts: Account[];
  exchangeRates: ExchangeRateRow[];
  onClose: () => void;
}

export function RegisterPaymentDialog({
  subscription,
  accounts,
  exchangeRates,
  onClose,
}: RegisterPaymentDialogProps) {
  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");
  const isAccountInactive =
    subscription?.account_status === "INACTIVE";

  const [amount, setAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  // Pre-llenar campos cuando se abre el diálogo
  useEffect(() => {
    if (subscription) {
      setAmount(String(subscription.amount));
      setDescription(`Suscripción: ${subscription.name}`);
      setAccountId(subscription.account_id ?? "");
      setExchangeRate("1");
      setDate(new Date().toISOString().split("T")[0]);
      setErrors({});
    }
  }, [subscription]);

  // Moneda de la cuenta seleccionada
  const accountCurrency = useMemo<Currency | null>(() => {
    const acc = activeAccounts.find((a) => a.id === accountId);
    return acc ? acc.currency : null;
  }, [accountId, activeAccounts]);

  const subCurrency = subscription?.currency ?? "COP";
  const showExchangeRate =
    accountCurrency !== null && subCurrency !== accountCurrency;

  // Auto-llenar tasa desde exchange_rates
  useEffect(() => {
    if (showExchangeRate && accountCurrency) {
      const found = exchangeRates.find(
        (r) =>
          r.from_currency === subCurrency &&
          r.to_currency === accountCurrency
      );
      if (found) setExchangeRate(String(found.rate));
    } else if (!showExchangeRate) {
      setExchangeRate("1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountCurrency, showExchangeRate, subCurrency]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!subscription) return;
    setPending(true);
    setErrors({});
    const formData = new FormData(e.currentTarget);
    formData.set("subscription_id", subscription.id);
    formData.set("exchange_rate", exchangeRate);
    formData.set("account_id", accountId);

    const result = await registerPaymentAction(formData);
    setPending(false);
    if (result.error) {
      setErrors(result.error as Record<string, string[]>);
    } else {
      onClose();
    }
  }

  if (!subscription) return null;

  return (
    <Dialog open={!!subscription} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar pago de suscripción</DialogTitle>
          <DialogDescription>
            Se generará una transacción de gasto en la cuenta seleccionada.
            El saldo se actualizará automáticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info de la suscripción (solo lectura) */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{subscription.name}</p>
                <p className="text-xs text-muted-foreground">
                  {subscription.billing_cycle === "MONTHLY" ? "Mensual" : "Anual"} ·{" "}
                  Próximo corte:{" "}
                  {new Date(subscription.next_billing_date).toLocaleDateString("es-CO")}
                </p>
              </div>
              <span className="text-sm font-bold">
                {formatCurrency(subscription.amount, subscription.currency as Currency)}
              </span>
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-1">
            <Label htmlFor="amount">Monto a pagar</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Cuenta */}
          <div className="space-y-1">
            <Label>Cuenta de débito</Label>
            {isAccountInactive && (
              <p className="text-xs text-amber-600">
                La cuenta original está inactiva. Selecciona otra:
              </p>
            )}
            <Select
              name="account_id"
              value={accountId}
              onValueChange={(v) => setAccountId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tasa de cambio condicional */}
          {showExchangeRate ? (
            <div className="space-y-1">
              <Label htmlFor="exchange_rate">
                Tasa de cambio ({subCurrency} &rarr; {accountCurrency})
              </Label>
              <Input
                id="exchange_rate"
                name="exchange_rate"
                type="number"
                step="0.000001"
                min="0"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Tasa sugerida desde la tabla de conversiones. Puedes ajustarla.
              </p>
            </div>
          ) : (
            <input type="hidden" name="exchange_rate" value="1" />
          )}

          {/* Fecha */}
          <div className="space-y-1">
            <Label htmlFor="date">Fecha del pago</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={date}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          {errors._form && (
            <p className="text-sm text-destructive">{errors._form[0]}</p>
          )}
          {Object.entries(errors)
            .filter(([k]) => k !== "_form")
            .map(([k, v]) => (
              <p key={k} className="text-sm text-destructive">
                {v[0]}
              </p>
            ))}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Procesando..." : "Confirmar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

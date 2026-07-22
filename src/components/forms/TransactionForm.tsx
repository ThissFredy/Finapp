"use client";

import { useState, useMemo } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategorySelect } from "@/components/categories/CategorySelect";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/app/(dashboard)/transactions/actions";
import type { Account, Currency } from "@/core/models/account";
import type { Category } from "@/core/models/category";
import type {
  TransactionType,
  TransactionWithDetails,
} from "@/core/models/transaction";

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  exchangeRates: ExchangeRateRow[];
  transaction?: TransactionWithDetails | null;
}

export function TransactionForm({
  open,
  onClose,
  accounts,
  incomeCategories,
  expenseCategories,
  exchangeRates,
  transaction,
}: TransactionFormProps) {
  const isEdit = !!transaction;
  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");

  const [type, setType] = useState<TransactionType>(
    transaction?.type ?? "GASTO",
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : "",
  );
  const [currency, setCurrency] = useState<Currency>(
    transaction?.currency ?? "COP",
  );
  const [exchangeRate, setExchangeRate] = useState<string>(
    transaction ? String(transaction.exchange_rate) : "1",
  );
  const [accountId, setAccountId] = useState(transaction?.account_id ?? "");
  const [fromAccountId, setFromAccountId] = useState(
    transaction?.from_account_id ?? "",
  );
  const [toAccountId, setToAccountId] = useState(
    transaction?.to_account_id ?? "",
  );
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [date, setDate] = useState(
    transaction
      ? transaction.date.split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [description, setDescription] = useState(
    transaction?.description ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  // Moneda de la cuenta afectada (para decidir si mostrar exchange_rate)
  const affectedAccountCurrency = useMemo<Currency | null>(() => {
    if (type === "TRANSFERENCIA") {
      const from = activeAccounts.find((a) => a.id === fromAccountId);
      return from ? from.currency : null;
    }
    const acc = activeAccounts.find((a) => a.id === accountId);
    return acc ? acc.currency : null;
  }, [type, accountId, fromAccountId, activeAccounts]);

  const showExchangeRate =
    affectedAccountCurrency !== null && currency !== affectedAccountCurrency;

  // Sugerir tasa desde exchange_rates según moneda de transacción y cuenta afectada
  function applySuggestedRate(
    txCurrency: Currency,
    accountCurrency: Currency | null,
  ) {
    if (accountCurrency && txCurrency !== accountCurrency) {
      const found = exchangeRates.find(
        (r) =>
          r.from_currency === txCurrency && r.to_currency === accountCurrency,
      );
      setExchangeRate(found ? String(found.rate) : "");
    } else {
      setExchangeRate("1");
    }
  }

  const categories =
    type === "INGRESO"
      ? incomeCategories
      : type === "GASTO"
        ? expenseCategories
        : [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    formData.set("exchange_rate", exchangeRate);
    if (type === "INGRESO" || type === "GASTO") {
      formData.set("category_id", categoryId);
    }
    if (isEdit && transaction) formData.set("id", transaction.id);

    const action = isEdit ? updateTransactionAction : createTransactionAction;
    const result = await action(formData);
    setPending(false);
    if (result.error) {
      setErrors(result.error as Record<string, string[]>);
    } else {
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary sm:mx-0">
            <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
          </div>
          <DialogTitle>
            {isEdit ? "Editar transacción" : "Nueva transacción"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <Tabs
            value={type}
            onValueChange={(v: string) => setType(v as TransactionType)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="INGRESO">Ingreso</TabsTrigger>
              <TabsTrigger value="GASTO">Gasto</TabsTrigger>
              <TabsTrigger value="TRANSFERENCIA">Transferencia</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Monto + Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency">Moneda</Label>
              <Select
                name="currency"
                value={currency}
                onValueChange={(v) => {
                  if (!v) return;
                  const next = v as Currency;
                  setCurrency(next);
                  applySuggestedRate(next, affectedAccountCurrency);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Exchange rate condicional */}
          {showExchangeRate ? (
            <div className="space-y-1">
              <Label htmlFor="exchange_rate">
                Tasa de cambio ({currency} &rarr; {affectedAccountCurrency})
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
                Tasa sugerida desde la tabla de conversiones. Puedes ajustarla
                si es necesario.
              </p>
            </div>
          ) : (
            <input type="hidden" name="exchange_rate" value="1" />
          )}

          {/* Cuentas según tipo */}
          {type === "TRANSFERENCIA" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Desde</Label>
                <Select
                  name="from_account_id"
                  value={fromAccountId}
                  onValueChange={(v) => {
                    if (!v) return;
                    setFromAccountId(v);
                    const accCurrency = activeAccounts.find((a) => a.id === v)
                      ?.currency as Currency | null | undefined;
                    applySuggestedRate(currency, accCurrency ?? null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cuenta origen">
                      {fromAccountId
                        ? activeAccounts.find((a) => a.id === fromAccountId)
                            ?.name
                        : "Cuenta origen"}
                    </SelectValue>
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
              <div className="space-y-1">
                <Label>Hacia</Label>
                <Select
                  name="to_account_id"
                  value={toAccountId}
                  onValueChange={(v) => v && setToAccountId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cuenta destino">
                      {toAccountId
                        ? activeAccounts.find((a) => a.id === toAccountId)?.name
                        : "Cuenta destino"}
                    </SelectValue>
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
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Cuenta</Label>
              <Select
                name="account_id"
                value={accountId}
                onValueChange={(v) => {
                  if (!v) return;
                  setAccountId(v);
                  const accCurrency = activeAccounts.find((a) => a.id === v)
                    ?.currency as Currency | null | undefined;
                  applySuggestedRate(currency, accCurrency ?? null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una cuenta">
                    {accountId
                      ? activeAccounts.find((a) => a.id === accountId)?.name
                      : "Selecciona una cuenta"}
                  </SelectValue>
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
          )}

          {/* Categoría (solo INCOME/EXPENSE) */}
          {type !== "TRANSFERENCIA" && (
            <div className="space-y-1">
              <Label>Categoría</Label>
              <CategorySelect
                value={categoryId}
                onChange={setCategoryId}
                categories={categories}
                type={type}
              />
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-1">
            <Label htmlFor="date">Fecha</Label>
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
              placeholder="Ej. Compra en supermercado"
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
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isEdit ? (
                "Guardar cambios"
              ) : (
                "Registrar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

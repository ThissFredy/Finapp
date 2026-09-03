"use client";

import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
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
  createSubscriptionAction,
  updateSubscriptionAction,
} from "@/app/(dashboard)/subscriptions/actions";
import type { Account, Currency } from "@/core/models/account";
import type { Category } from "@/core/models/category";
import type {
  BillingCycle,
  SubscriptionStatus,
  SubscriptionWithMeta,
} from "@/core/models/subscription";

interface SubscriptionFormProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  expenseCategories: Category[];
  subscription?: SubscriptionWithMeta | null;
}

export function SubscriptionForm({
  open,
  onClose,
  accounts,
  expenseCategories,
  subscription,
}: SubscriptionFormProps) {
  const isEdit = !!subscription;
  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");

  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(
    subscription ? String(subscription.amount) : "",
  );
  const [currency, setCurrency] = useState<Currency>(
    subscription?.currency ?? "COP",
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    subscription?.billing_cycle ?? "MONTHLY",
  );
  const [nextBillingDate, setNextBillingDate] = useState(
    subscription?.next_billing_date ?? "",
  );
  const [categoryId, setCategoryId] = useState(subscription?.category_id ?? "");
  const [accountId, setAccountId] = useState(subscription?.account_id ?? "");
  const [status, setStatus] = useState<SubscriptionStatus>(
    subscription?.status ?? "ACTIVE",
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    const formData = new FormData(e.currentTarget);
    formData.set("billing_cycle", billingCycle);
    formData.set("category_id", categoryId);
    formData.set("account_id", accountId);
    if (isEdit) {
      formData.set("id", subscription!.id);
      formData.set("status", status);
    }

    const action = isEdit ? updateSubscriptionAction : createSubscriptionAction;
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
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarClock className="size-5 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle>
            {isEdit ? "Editar suscripción" : "Nueva suscripción"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Netflix, Spotify..."
              maxLength={50}
              required
            />
          </div>

          {/* Monto + Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount">Costo</Label>
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
                onValueChange={(v) => setCurrency(v as Currency)}
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

          {/* Frecuencia */}
          <div className="space-y-1">
            <Label>Frecuencia de cobro</Label>
            <Tabs
              value={billingCycle}
              onValueChange={(v) => setBillingCycle(v as BillingCycle)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="MONTHLY">Mensual</TabsTrigger>
                <TabsTrigger value="YEARLY">Anual</TabsTrigger>
              </TabsList>
            </Tabs>
            <input type="hidden" name="billing_cycle" value={billingCycle} />
          </div>

          {/* Próxima fecha de corte */}
          <div className="space-y-1">
            <Label htmlFor="next_billing_date">Próxima fecha de corte</Label>
            <Input
              id="next_billing_date"
              name="next_billing_date"
              type="date"
              value={nextBillingDate}
              onChange={(e) => setNextBillingDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Puede ser una fecha pasada (vencida) o futura.
            </p>
          </div>

          {/* Categoría (solo EXPENSE) */}
          <div className="space-y-1">
            <Label>Categoría</Label>
            <CategorySelect
              value={categoryId}
              onChange={setCategoryId}
              categories={expenseCategories}
              type="GASTO"
            />
          </div>

          {/* Cuenta (solo ACTIVE) */}
          <div className="space-y-1">
            <Label>Cuenta de débito</Label>
            <Select
              name="account_id"
              value={accountId}
              onValueChange={(v) => setAccountId(v ?? "")}
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

          {/* Estado (solo en edición) */}
          {isEdit && (
            <div className="space-y-1">
              <Label htmlFor="status">Estado</Label>
              <Select
                name="status"
                value={status}
                onValueChange={(v) => setStatus(v as SubscriptionStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Activa</SelectItem>
                  <SelectItem value="PAUSED">Pausada</SelectItem>
                  <SelectItem value="CANCELLED">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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

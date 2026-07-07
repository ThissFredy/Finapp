"use client";

import { useState } from "react";
import { Wallet, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAccountAction,
  updateAccountAction,
} from "@/app/(dashboard)/accounts/actions";
import { CreateAccountSchema, UpdateAccountSchema } from "@/core/models/account";
import type { AccountWithMeta, AccountType, Currency } from "@/core/models/account";

interface AccountFormProps {
  mode: "create" | "edit";
  account?: AccountWithMeta;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const typeOptions: { value: AccountType; label: string }[] = [
  { value: "DEBIT", label: "Débito" },
  { value: "CREDIT", label: "Crédito" },
  { value: "CASH", label: "Efectivo" },
];

const currencyOptions: { value: Currency; label: string }[] = [
  { value: "COP", label: "COP" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
];

function getInitialState(mode: "create" | "edit", account?: AccountWithMeta) {
  if (mode === "edit" && account) {
    return {
      name: account.name,
      type: account.type,
      currency: account.currency,
      initialBalance: String(account.balance),
    };
  }
  return {
    name: "",
    type: "DEBIT" as AccountType,
    currency: "COP" as Currency,
    initialBalance: "",
  };
}

export function AccountForm({
  mode,
  account,
  trigger,
  open: openProp,
  onOpenChange,
}: AccountFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = openProp ?? internalOpen;
  const setIsOpen = (value: boolean) => {
    onOpenChange?.(value);
    setInternalOpen(value);
  };

  const initialState = getInitialState(mode, account);
  const [name, setName] = useState(initialState.name);
  const [type, setType] = useState<AccountType>(initialState.type);
  const [currency, setCurrency] = useState<Currency>(initialState.currency);
  const [initialBalance, setInitialBalance] = useState<string>(initialState.initialBalance);

  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const isBalanceReadOnly = mode === "edit" && account?.has_transactions;

  function resetFields() {
    if (mode === "edit" && account) {
      setName(account.name);
      setType(account.type);
      setCurrency(account.currency);
      setInitialBalance(String(account.balance));
    } else {
      setName("");
      setType("DEBIT");
      setCurrency("COP");
      setInitialBalance("");
    }
  }

  function handleOpenChange(value: boolean) {
    setIsOpen(value);
    setErrors({});
    setServerError(null);
    if (value) {
      resetFields();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setServerError(null);

    const raw = {
      name,
      type,
      currency,
      initial_balance: initialBalance === "" ? undefined : Number(initialBalance),
    };

    const schema = mode === "create" ? CreateAccountSchema : UpdateAccountSchema;
    const parsed = schema.safeParse(raw);

    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    const formData = new FormData();
    formData.set("name", parsed.data.name ?? "");
    if (parsed.data.type) formData.set("type", parsed.data.type);
    if (parsed.data.currency) formData.set("currency", parsed.data.currency);
    if (parsed.data.initial_balance !== undefined) {
      formData.set("initial_balance", String(parsed.data.initial_balance));
    }

    setStatus("submitting");
    const result =
      mode === "create"
        ? await createAccountAction(formData)
        : await updateAccountAction(account!.id, formData);

    if (result.success) {
      setStatus("idle");
      handleOpenChange(false);
    } else {
      setStatus("idle");
      setServerError(result.error);
      if (result.fieldErrors) {
        setErrors(result.fieldErrors);
      }
    }
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button>
        <Wallet className="mr-2 h-4 w-4" />
        Nueva cuenta
      </Button>
    ) : (
      <Button variant="ghost" size="sm">
        <Wallet className="mr-2 h-4 w-4" />
        Editar
      </Button>
    );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger ?? defaultTrigger} />
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary sm:mx-0">
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </div>
          <DialogTitle>
            {mode === "create" ? "Nueva cuenta" : "Editar cuenta"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Completa los datos para crear una nueva cuenta."
              : "Modifica los datos de la cuenta."}
          </DialogDescription>
        </DialogHeader>

        <form id="account-form" onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Cuenta de ahorros"
              maxLength={50}
              aria-invalid={errors.name ? "true" : "false"}
            />
            {errors.name ? (
              <p className="text-xs font-medium text-destructive">{errors.name[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(value: string | null) => value && setType(value as AccountType)}>
              <SelectTrigger id="type" aria-invalid={errors.type ? "true" : "false"}>
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type ? (
              <p className="text-xs font-medium text-destructive">{errors.type[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="currency">Moneda</Label>
            <Select
              value={currency}
              onValueChange={(value: string | null) => value && setCurrency(value as Currency)}
            >
              <SelectTrigger id="currency" aria-invalid={errors.currency ? "true" : "false"}>
                <SelectValue placeholder="Selecciona una moneda" />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.currency ? (
              <p className="text-xs font-medium text-destructive">{errors.currency[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="initial_balance">Saldo inicial</Label>
            <Input
              id="initial_balance"
              name="initial_balance"
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              disabled={isBalanceReadOnly}
              placeholder="0.00"
              aria-invalid={errors.initial_balance ? "true" : "false"}
            />
            {isBalanceReadOnly ? (
              <p className="text-xs text-muted-foreground">
                El saldo se modifica mediante transacciones.
              </p>
            ) : null}
            {errors.initial_balance ? (
              <p className="text-xs font-medium text-destructive">
                {errors.initial_balance[0]}
              </p>
            ) : null}
          </div>

          {serverError ? (
            <p className="text-sm font-medium text-destructive">{serverError}</p>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={status === "submitting"}
          >
            Cancelar
          </Button>
          <Button type="submit" form="account-form" disabled={status === "submitting"}>
            {status === "submitting" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "create" ? "Creando..." : "Guardando..."}
              </>
            ) : mode === "create" ? (
              "Crear cuenta"
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

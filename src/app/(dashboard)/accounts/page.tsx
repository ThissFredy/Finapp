import { Banknote } from "lucide-react";

import { AccountForm } from "@/components/forms/AccountForm";
import { AccountList } from "@/components/accounts/AccountList";
import { TotalBalanceCard } from "@/components/accounts/TotalBalanceCard";
import { Button } from "@/components/ui/button";
import {
  getAccountsWithMeta,
  getUserBalance,
} from "@/core/services/account.service";

export default async function AccountsPage() {
  const [accounts, balance] = await Promise.all([
    getAccountsWithMeta(),
    getUserBalance(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Balance total */}
      <TotalBalanceCard balance={balance} />

      {/* Header + botón crear */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Mis Cuentas</h2>
        <AccountForm mode="create" />
      </div>

      {/* Listado o estado vacío */}
      {accounts.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Banknote className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No tienes cuentas aún</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea tu primera cuenta para empezar a gestionar tus finanzas.
          </p>
          <AccountForm
            mode="create"
            trigger={<Button className="mt-4">Crear primera cuenta</Button>}
          />
        </div>
      ) : (
        <AccountList accounts={accounts} />
      )}
    </div>
  );
}

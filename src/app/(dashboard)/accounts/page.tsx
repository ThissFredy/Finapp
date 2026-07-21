import type { Metadata } from "next";
import { Banknote, Plus } from "lucide-react";

import { AccountForm } from "@/components/forms/AccountForm";
import { AccountList } from "@/components/accounts/AccountList";
import { TotalBalanceCard } from "@/components/accounts/TotalBalanceCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import {
  getAccountsWithMeta,
  getUserBalance,
} from "@/core/services/account.service";

export const metadata: Metadata = {
  title: "Mis Cuentas",
  description: "Gestiona tus cuentas bancarias, tarjetas y efectivo.",
};

export default async function AccountsPage() {
  const [accounts, balance] = await Promise.all([
    getAccountsWithMeta(),
    getUserBalance(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Balance total */}
      <FadeIn direction="up" delay={1}>
        <TotalBalanceCard balance={balance} />
      </FadeIn>

      {/* Header + botón crear */}
      <FadeIn direction="up" delay={2}>
        <div className="mt-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Mis Cuentas</h2>
            <p className="text-sm text-muted-foreground">
              Gestiona tus cuentas bancarias, tarjetas y efectivo.
            </p>
          </div>
          <AccountForm mode="create" />
        </div>
      </FadeIn>

      {/* Listado o estado vacío */}
      {accounts.length === 0 ? (
        <FadeIn direction="up" delay={3} className="mt-8">
          <EmptyState
            icon={Banknote}
            title="No tienes cuentas aún"
            description="Crea tu primera cuenta para empezar a gestionar tus finanzas."
            action={
              <AccountForm
                mode="create"
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primera cuenta
                  </Button>
                }
              />
            }
          />
        </FadeIn>
      ) : (
        <AccountList accounts={accounts} />
      )}
    </div>
  );
}

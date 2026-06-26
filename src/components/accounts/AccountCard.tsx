"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Power, PowerOff, Trash2 } from "lucide-react";

import { AccountTypeIcon } from "@/components/accounts/AccountTypeIcon";
import { AccountForm } from "@/components/forms/AccountForm";
import { DeleteAccountDialog } from "@/components/accounts/DeleteAccountDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleAccountStatusAction } from "@/app/(dashboard)/accounts/actions";
import { formatCurrency } from "@/core/utils/currency";
import type { AccountWithMeta } from "@/core/models/account";

interface AccountCardProps {
  account: AccountWithMeta;
}

const typeLabel: Record<AccountWithMeta["type"], string> = {
  DEBIT: "Débito",
  CREDIT: "Crédito",
  CASH: "Efectivo",
};

export function AccountCard({ account }: AccountCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isToggling, startToggle] = useTransition();

  const isInactive = account.status === "INACTIVE";

  function handleToggle() {
    startToggle(async () => {
      await toggleAccountStatusAction(account.id);
    });
  }

  return (
    <Card className={isInactive ? "opacity-60" : undefined}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <AccountTypeIcon type={account.type} />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{account.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{account.currency}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Acciones de cuenta">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleToggle}
              disabled={isToggling}
            >
              {isInactive ? (
                <>
                  <Power className="mr-2 h-4 w-4" /> Activar
                </>
              ) : (
                <>
                  <PowerOff className="mr-2 h-4 w-4" /> Desactivar
                </>
              )}
            </DropdownMenuItem>
            {!account.has_transactions ? (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-2xl font-bold tracking-tight">
          {formatCurrency(account.balance, account.currency)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{typeLabel[account.type]}</Badge>
          {isInactive ? (
            <Badge variant="outline">Inactiva</Badge>
          ) : (
            <Badge variant="default">Activa</Badge>
          )}
        </div>
      </CardContent>

      <AccountForm
        mode="edit"
        account={account}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteAccountDialog
        account={account}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Power, PowerOff, Trash2, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { AccountTypeIcon } from "@/components/accounts/AccountTypeIcon";
import { AccountForm } from "@/components/forms/AccountForm";
import { DeleteAccountDialog } from "@/components/accounts/DeleteAccountDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card
      className={cn(
        "group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        isInactive && "opacity-60",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary/10">
            <AccountTypeIcon
              type={account.type}
              className="transition-colors group-hover:text-foreground"
            />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{account.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{account.currency}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Acciones de cuenta"
              className="h-8 w-8 opacity-60 transition-opacity group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleToggle} disabled={isToggling}>
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
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400">
              Activa
            </Badge>
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

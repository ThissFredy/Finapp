"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, CalendarClock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionForm } from "@/components/forms/SubscriptionForm";
import { SubscriptionCard } from "@/components/subscriptions/SubscriptionCard";
import { UpcomingPaymentsList } from "@/components/subscriptions/UpcomingPaymentsList";
import { RegisterPaymentDialog } from "@/components/subscriptions/RegisterPaymentDialog";
import { PaymentHistoryDialog } from "@/components/subscriptions/PaymentHistoryDialog";
import { DeleteSubscriptionDialog } from "@/components/subscriptions/DeleteSubscriptionDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn, AnimatedListItem } from "@/components/ui/motion";
import type { Account, Currency } from "@/core/models/account";
import type { Category } from "@/core/models/category";
import type { SubscriptionWithMeta } from "@/core/models/subscription";

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface SubscriptionsClientProps {
  subscriptions: SubscriptionWithMeta[];
  upcomingPayments: SubscriptionWithMeta[];
  initialYear: number;
  initialMonth: number;
  accounts: Account[];
  expenseCategories: Category[];
  exchangeRates: ExchangeRateRow[];
  preferredCurrency: Currency;
}

export function SubscriptionsClient({
  subscriptions,
  upcomingPayments,
  initialYear,
  initialMonth,
  accounts,
  expenseCategories,
  exchangeRates,
  preferredCurrency,
}: SubscriptionsClientProps) {
  const [tab, setTab] = useState("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionWithMeta | null>(null);
  const [paying, setPaying] = useState<SubscriptionWithMeta | null>(null);
  const [history, setHistory] = useState<SubscriptionWithMeta | null>(null);
  const [deleting, setDeleting] = useState<SubscriptionWithMeta | null>(null);

  function handleNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(s: SubscriptionWithMeta) {
    setEditing(s);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <FadeIn direction="up" delay={1}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Suscripciones</h1>
            <p className="text-sm text-muted-foreground">
              Controla tus pagos recurrentes y nunca te sorprenda un cargo.
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva suscripción
          </Button>
        </div>
      </FadeIn>

      <FadeIn direction="up" delay={2}>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-full">
            <TabsTrigger value="upcoming">Próximos pagos</TabsTrigger>
            <TabsTrigger value="all">Mis suscripciones</TabsTrigger>
          </TabsList>

          {tab === "upcoming" && (
            <div className="pt-4">
              <UpcomingPaymentsList
                initialPayments={upcomingPayments}
                initialYear={initialYear}
                initialMonth={initialMonth}
                exchangeRates={exchangeRates}
                preferredCurrency={preferredCurrency}
                onPay={setPaying}
              />
            </div>
          )}

          {tab === "all" && (
            <div className="pt-4 space-y-3">
              {subscriptions.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title="Sin suscripciones"
                  description="No tienes suscripciones registradas. Crea una para empezar a controlar tus pagos recurrentes."
                />
              ) : (
                subscriptions.map((s, index) => (
                  <AnimatedListItem key={s.id} index={index}>
                    <SubscriptionCard
                      subscription={s}
                      onEdit={handleEdit}
                      onDelete={setDeleting}
                      onPay={setPaying}
                      onHistory={setHistory}
                    />
                  </AnimatedListItem>
                ))
              )}
            </div>
          )}
        </Tabs>
      </FadeIn>

      <SubscriptionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        accounts={accounts}
        expenseCategories={expenseCategories}
        subscription={editing}
      />

      <RegisterPaymentDialog
        subscription={paying}
        accounts={accounts}
        exchangeRates={exchangeRates}
        onClose={() => setPaying(null)}
      />

      <PaymentHistoryDialog
        subscription={history}
        onClose={() => setHistory(null)}
      />

      <DeleteSubscriptionDialog
        subscription={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

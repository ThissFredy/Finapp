import { createServerClientInstance } from "@/core/db/supabase.server";
import type {
  SubscriptionWithMeta,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  RegisterPaymentInput,
} from "@/core/models/subscription";
import type { Transaction } from "@/core/models/transaction";

// Listar todas las suscripciones del usuario con metadatos (vía RPC)
export async function selectSubscriptionsWithMeta(): Promise<SubscriptionWithMeta[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_subscriptions_with_meta");
  if (error) throw error;
  return (data ?? []) as SubscriptionWithMeta[];
}

// Listar próximos pagos del mes (vía RPC)
export async function selectUpcomingPayments(
  year: number,
  month: number
): Promise<SubscriptionWithMeta[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_upcoming_subscription_payments", {
    p_year: year,
    p_month: month,
  });
  if (error) throw error;
  return (data ?? []) as SubscriptionWithMeta[];
}

// Insertar una nueva suscripción
export async function insertSubscription(
  input: CreateSubscriptionInput,
  userId: string
): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase.from("subscriptions").insert({
    user_id: userId,
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    billing_cycle: input.billing_cycle,
    next_billing_date: input.next_billing_date.toISOString().split("T")[0],
    category_id: input.category_id,
    account_id: input.account_id,
    status: "ACTIVE",
  });
  if (error) throw error;
}

// Actualizar una suscripción existente
export async function updateSubscriptionRecord(
  id: string,
  input: UpdateSubscriptionInput
): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase
    .from("subscriptions")
    .update({
      name: input.name,
      amount: input.amount,
      currency: input.currency,
      billing_cycle: input.billing_cycle,
      next_billing_date: input.next_billing_date.toISOString().split("T")[0],
      category_id: input.category_id,
      account_id: input.account_id,
      status: input.status,
    })
    .eq("id", id);
  if (error) throw error;
}

// Soft delete: marcar deleted_at
export async function softDeleteSubscription(id: string): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase
    .from("subscriptions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Registrar pago de suscripción (vía RPC atómico)
export async function registerSubscriptionPayment(
  input: RegisterPaymentInput
): Promise<Transaction> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("register_subscription_payment", {
    p_subscription_id: input.subscription_id,
    p_amount: input.amount,
    p_exchange_rate: input.exchange_rate,
    p_date: input.date.toISOString().split("T")[0],
    p_description: input.description || null,
    p_account_id: input.account_id,
  });
  if (error) throw error;
  return data as Transaction;
}

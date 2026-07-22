import {
  selectSubscriptionsWithMeta,
  selectUpcomingPayments,
  insertSubscription,
  updateSubscriptionRecord,
  softDeleteSubscription,
  registerSubscriptionPayment,
} from "@/core/db/queries/subscription.queries";
import { selectTransactionsPaginated } from "@/core/db/queries/transaction.queries";
import { selectAccountById } from "@/core/db/queries/account.queries";
import { selectActiveCategoriesByType } from "@/core/db/queries/category.queries";
import { createServerClientInstance } from "@/core/db/supabase.server";
import type {
  SubscriptionWithMeta,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  RegisterPaymentInput,
} from "@/core/models/subscription";
import type { PaginatedTransactions } from "@/core/models/transaction";

// Obtener el ID del usuario autenticado
async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");
  return user.id;
}

// Listar todas las suscripciones del usuario
export async function listSubscriptions(): Promise<SubscriptionWithMeta[]> {
  return selectSubscriptionsWithMeta();
}

// Listar próximos pagos del mes
export async function listUpcomingPayments(
  year: number,
  month: number,
): Promise<SubscriptionWithMeta[]> {
  return selectUpcomingPayments(year, month);
}

// Crear una suscripción (validando categoría EXPENSE y cuenta ACTIVE)
export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<void> {
  const userId = await getAuthenticatedUserId();
  await validateSubscriptionRefs(input.category_id, input.account_id);
  await insertSubscription(input, userId);
}

// Editar una suscripción
export async function updateSubscription(
  input: UpdateSubscriptionInput,
): Promise<void> {
  await validateSubscriptionRefs(input.category_id, input.account_id);
  await updateSubscriptionRecord(input.id, input);
}

// Eliminar una suscripción (soft delete)
export async function deleteSubscription(id: string): Promise<void> {
  return softDeleteSubscription(id);
}

// Registrar pago de una suscripción
export async function registerPayment(
  input: RegisterPaymentInput,
): Promise<void> {
  // El RPC valida ownership, estado, duplicados y atomicidad.
  // La validación de cuenta activa también se hace en el RPC.
  await registerSubscriptionPayment(input);
}

// Obtener historial de pagos de una suscripción (vía get_transactions_paginated)
export async function getPaymentHistory(
  subscriptionId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<PaginatedTransactions> {
  return selectTransactionsPaginated({
    subscription_id: subscriptionId,
    page,
    page_size: pageSize,
  });
}

// Validar que la categoría es EXPENSE y la cuenta está ACTIVE
async function validateSubscriptionRefs(
  categoryId: string,
  accountId: string,
): Promise<void> {
  const expenseCats = await selectActiveCategoriesByType("GASTO");
  if (!expenseCats.some((c) => c.id === categoryId)) {
    throw new Error(
      "La categoría seleccionada no es válida o no es de tipo gasto",
    );
  }
  const account = await selectAccountById(accountId);
  if (!account) throw new Error("La cuenta seleccionada no existe");
  if (account.status !== "ACTIVE") {
    throw new Error("La cuenta seleccionada no está activa");
  }
}

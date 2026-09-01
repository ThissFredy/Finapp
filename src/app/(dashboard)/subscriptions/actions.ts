"use server";

import { revalidatePath } from "next/cache";
import {
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema,
  RegisterPaymentSchema,
} from "@/core/models/subscription";
import * as subscriptionService from "@/core/services/subscription.service";

export async function createSubscriptionAction(formData: FormData) {
  const parsed = CreateSubscriptionSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    billing_cycle: formData.get("billing_cycle"),
    next_billing_date: formData.get("next_billing_date"),
    category_id: formData.get("category_id"),
    account_id: formData.get("account_id"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await subscriptionService.createSubscription(parsed.data);
    revalidatePath("/subscriptions");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function updateSubscriptionAction(formData: FormData) {
  const parsed = UpdateSubscriptionSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    billing_cycle: formData.get("billing_cycle"),
    next_billing_date: formData.get("next_billing_date"),
    category_id: formData.get("category_id"),
    account_id: formData.get("account_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await subscriptionService.updateSubscription(parsed.data);
    revalidatePath("/subscriptions");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function deleteSubscriptionAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: { _form: ["ID de suscripción requerido"] } };
  try {
    await subscriptionService.deleteSubscription(id);
    revalidatePath("/subscriptions");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function registerPaymentAction(formData: FormData) {
  const parsed = RegisterPaymentSchema.safeParse({
    subscription_id: formData.get("subscription_id"),
    amount: formData.get("amount"),
    exchange_rate: formData.get("exchange_rate") || undefined,
    date: formData.get("date"),
    description: formData.get("description") || undefined,
    account_id: formData.get("account_id"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await subscriptionService.registerPayment(parsed.data);
    revalidatePath("/transactions");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function listUpcomingPaymentsAction(year: number, month: number) {
  try {
    return { data: await subscriptionService.listUpcomingPayments(year, month) };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function getPaymentHistoryAction(
  subscriptionId: string,
  page: number = 1,
  pageSize: number = 10
) {
  try {
    return {
      data: await subscriptionService.getPaymentHistory(
        subscriptionId,
        page,
        pageSize
      ),
    };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
  TransactionFiltersSchema,
} from "@/core/models/transaction";
import type { TransactionFilters } from "@/core/models/transaction";
import * as transactionService from "@/core/services/transaction.service";

function parseTransactionFormData(formData: FormData) {
  return {
    type: formData.get("type"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    exchange_rate: formData.get("exchange_rate") || undefined,
    date: formData.get("date"),
    description: formData.get("description") || undefined,
    account_id: formData.get("account_id") || undefined,
    from_account_id: formData.get("from_account_id") || undefined,
    to_account_id: formData.get("to_account_id") || undefined,
    category_id: formData.get("category_id") || undefined,
  };
}

export async function createTransactionAction(formData: FormData) {
  const parsed = CreateTransactionSchema.safeParse(
    parseTransactionFormData(formData)
  );
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await transactionService.createTransaction(parsed.data);
    revalidatePath("/transactions");
    revalidatePath("/"); // el dashboard muestra balances
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function updateTransactionAction(formData: FormData) {
  const parsed = UpdateTransactionSchema.safeParse({
    id: formData.get("id"),
    ...parseTransactionFormData(formData),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await transactionService.updateTransaction(parsed.data);
    revalidatePath("/transactions");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function deleteTransactionAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: { _form: ["ID de transacción requerido"] } };
  try {
    await transactionService.deleteTransaction(id);
    revalidatePath("/transactions");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function listTransactionsAction(filters: TransactionFilters) {
  const parsed = TransactionFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    return { data: await transactionService.listTransactions(parsed.data) };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

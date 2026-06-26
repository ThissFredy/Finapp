import { createServerClientInstance } from "@/core/db/supabase.server";
import {
  selectAccountsWithMeta,
  selectAccountById,
  selectUserBalance,
  insertAccount,
  updateAccountRecord,
  toggleAccountStatus,
  deleteAccountRecord,
} from "@/core/db/queries/account.queries";
import type {
  Account,
  AccountWithMeta,
  CreateAccountInput,
  UpdateAccountInput,
  UserBalance,
} from "@/core/models/account";

// Obtener el ID del usuario autenticado
async function getCurrentUserId(): Promise<string> {
  const supabase = await createServerClientInstance();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

// --- Operaciones de lectura ---
export async function getAccountsWithMeta(): Promise<AccountWithMeta[]> {
  return selectAccountsWithMeta();
}

export async function getAccountById(id: string): Promise<Account | null> {
  return selectAccountById(id);
}

export async function getUserBalance(): Promise<UserBalance | null> {
  return selectUserBalance();
}

// --- Operaciones de escritura ---
export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const userId = await getCurrentUserId();
  return insertAccount(input, userId);
}

export async function updateAccount(
  id: string,
  input: UpdateAccountInput
): Promise<Account> {
  // Verificar si la cuenta tiene transacciones antes de actualizar el balance
  const accounts = await selectAccountsWithMeta();
  const account = accounts.find((a) => a.id === id);
  const hasTransactions = account?.has_transactions ?? false;
  return updateAccountRecord(id, input, hasTransactions);
}

export async function toggleStatus(id: string): Promise<Account> {
  return toggleAccountStatus(id);
}

export async function deleteAccount(id: string): Promise<void> {
  // Verificar que la cuenta no tenga transacciones
  const accounts = await selectAccountsWithMeta();
  const account = accounts.find((a) => a.id === id);
  if (account?.has_transactions) {
    throw new Error(
      "No se puede eliminar una cuenta con transacciones asociadas. Desactívala en su lugar."
    );
  }
  return deleteAccountRecord(id);
}

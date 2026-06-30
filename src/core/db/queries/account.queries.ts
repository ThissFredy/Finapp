import { createServerClientInstance } from "@/core/db/supabase.server";
import type {
  Account,
  AccountWithMeta,
  CreateAccountInput,
  UpdateAccountInput,
  UserBalance,
} from "@/core/models/account";

// Obtener todas las cuentas del usuario con flag has_transactions (vía RPC)
export async function selectAccountsWithMeta(): Promise<AccountWithMeta[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_accounts_with_meta");
  if (error) throw error;
  return (data ?? []) as AccountWithMeta[];
}

// Obtener una cuenta por ID
export async function selectAccountById(id: string): Promise<Account | null> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Account;
}

// Obtener el balance total del usuario
export async function selectUserBalance(): Promise<UserBalance | null> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("user_balances")
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return data as UserBalance;
}

// Insertar una nueva cuenta
export async function insertAccount(
  input: CreateAccountInput,
  userId: string
): Promise<Account> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: input.name,
      type: input.type,
      currency: input.currency,
      balance: input.initial_balance,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Account;
}

// Actualizar una cuenta existente
export async function updateAccountRecord(
  id: string,
  input: UpdateAccountInput,
  hasTransactions: boolean
): Promise<Account> {
  const supabase = await createServerClientInstance();
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.currency !== undefined) updateData.currency = input.currency;
  // Solo actualizar balance si la cuenta no tiene transacciones
  if (input.initial_balance !== undefined && !hasTransactions) {
    updateData.balance = input.initial_balance;
  }

  const { data, error } = await supabase
    .from("accounts")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Account;
}

// Alternar el estado de una cuenta (ACTIVE <-> INACTIVE)
export async function toggleAccountStatus(id: string): Promise<Account> {
  const supabase = await createServerClientInstance();
  // Primero obtener el estado actual
  const { data: current, error: fetchError } = await supabase
    .from("accounts")
    .select("status")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const newStatus = current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const { data, error } = await supabase
    .from("accounts")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Account;
}

// Eliminar una cuenta permanentemente
export async function deleteAccountRecord(id: string): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

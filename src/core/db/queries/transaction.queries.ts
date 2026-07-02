import { createServerClientInstance } from "@/core/db/supabase.server";
import type {
  Transaction,
  TransactionWithDetails,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  PaginatedTransactions,
} from "@/core/models/transaction";

// Listar transacciones paginadas con filtros (vía RPC)
export async function selectTransactionsPaginated(
  filters: TransactionFilters
): Promise<PaginatedTransactions> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_transactions_paginated", {
    p_limit: filters.page_size,
    p_offset: (filters.page - 1) * filters.page_size,
    p_from_date: filters.from_date || null,
    p_to_date: filters.to_date || null,
    p_account_id: filters.account_id ?? null,
    p_category_id: filters.category_id ?? null,
    p_subscription_id: filters.subscription_id ?? null, // NUEVO
  });
  if (error) throw error;
  const rows = (data ?? []) as TransactionWithDetails[];
  const total = rows.length > 0 ? rows[0].total_count : 0;
  return {
    items: rows,
    total_count: total,
    page: filters.page,
    page_size: filters.page_size,
  };
}

// Obtener una transacción por ID
export async function selectTransactionById(
  id: string
): Promise<Transaction | null> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Transaction;
}

// Consultar tasa de cambio desde la tabla exchange_rates (asunción 8)
export async function selectExchangeRate(
  from: string,
  to: string
): Promise<number | null> {
  if (from === to) return 1.0;
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", from)
    .eq("to_currency", to)
    .maybeSingle();
  if (error || !data) return null;
  return data.rate as number;
}

// Cargar todas las tasas disponibles (para pre-llenar el formulario en cliente)
export async function selectAllExchangeRates(): Promise<
  { from_currency: string; to_currency: string; rate: number }[]
> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("from_currency, to_currency, rate");
  if (error || !data) return [];
  return data as { from_currency: string; to_currency: string; rate: number }[];
}

// Construir el objeto fila a insertar/actualizar según el tipo
function buildRow(
  input: CreateTransactionInput | UpdateTransactionInput
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    exchange_rate: input.exchange_rate,
    date: input.date.toISOString(),
    description: input.description || null,
  };
  if (input.type === "INCOME" || input.type === "EXPENSE") {
    row.account_id = input.account_id;
    row.category_id = input.category_id;
    row.from_account_id = null;
    row.to_account_id = null;
  } else {
    row.account_id = null;
    row.category_id = null;
    row.from_account_id = input.from_account_id;
    row.to_account_id = input.to_account_id;
  }
  return row;
}

// Insertar una nueva transacción
export async function insertTransaction(
  input: CreateTransactionInput,
  userId: string
): Promise<Transaction> {
  const supabase = await createServerClientInstance();
  const row = buildRow(input);
  row.user_id = userId;
  const { data, error } = await supabase
    .from("transactions")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

// Actualizar una transacción existente
export async function updateTransactionRecord(
  id: string,
  input: UpdateTransactionInput
): Promise<Transaction> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("transactions")
    .update(buildRow(input))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

// Eliminar una transacción (hard delete)
export async function deleteTransactionRecord(id: string): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

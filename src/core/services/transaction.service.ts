import { createServerClientInstance } from "@/core/db/supabase.server";
import {
  selectTransactionsPaginated,
  selectExchangeRate,
  insertTransaction,
  updateTransactionRecord,
  deleteTransactionRecord,
} from "@/core/db/queries/transaction.queries";
import { selectAccountById } from "@/core/db/queries/account.queries";
import { selectActiveCategoriesByType } from "@/core/db/queries/category.queries";
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  PaginatedTransactions,
} from "@/core/models/transaction";

// Obtener el ID del usuario autenticado
async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");
  return user.id;
}

// Listar transacciones paginadas con filtros
export async function listTransactions(
  filters: TransactionFilters,
): Promise<PaginatedTransactions> {
  return selectTransactionsPaginated(filters);
}

// Resolver la tasa de cambio: 1.0 si misma moneda, lookup en exchange_rates si difiere
export async function resolveExchangeRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<number | null> {
  return selectExchangeRate(fromCurrency, toCurrency);
}

// Crear una transacción (validando cuenta activa y categoría coherente)
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  const userId = await getAuthenticatedUserId();
  await validateTransactionAccounts(input);
  return insertTransaction(input, userId);
}

// Editar una transacción
export async function updateTransaction(
  input: UpdateTransactionInput,
): Promise<Transaction> {
  await validateTransactionAccounts(input);
  return updateTransactionRecord(input.id, input);
}

// Eliminar una transacción (hard delete — el trigger revierte el saldo)
export async function deleteTransaction(id: string): Promise<void> {
  return deleteTransactionRecord(id);
}

// Validar que las cuentas involucradas existen, pertenecen al usuario y están activas,
// y que la categoría (si aplica) es del tipo correcto.
async function validateTransactionAccounts(
  input: CreateTransactionInput | UpdateTransactionInput,
): Promise<void> {
  if (input.type === "INGRESO" || input.type === "GASTO") {
    const account = await selectAccountById(input.account_id!);
    if (!account) throw new Error("La cuenta seleccionada no existe");
    if (account.status !== "ACTIVE") {
      throw new Error("La cuenta seleccionada no está activa");
    }
    const cats = await selectActiveCategoriesByType(input.type);
    if (!cats.some((c) => c.id === input.category_id)) {
      throw new Error(
        "La categoría seleccionada no es válida para este tipo de transacción",
      );
    }
  } else {
    const from = await selectAccountById(input.from_account_id!);
    const to = await selectAccountById(input.to_account_id!);
    if (!from || !to) throw new Error("Una de las cuentas no existe");
    if (from.status !== "ACTIVE" || to.status !== "ACTIVE") {
      throw new Error("Ambas cuentas deben estar activas para transferir");
    }
  }
}

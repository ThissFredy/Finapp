import { z } from "zod";
import { CurrencySchema } from "@/core/models/account";

// --- Enums ---
export const TransactionTypeSchema = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

// --- Transaction (registro completo desde BD) ---
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  account_id: z.string().uuid().nullable(),
  from_account_id: z.string().uuid().nullable(),
  to_account_id: z.string().uuid().nullable(),
  category_id: z.string().uuid().nullable(),
  type: TransactionTypeSchema,
  amount: z.number(),
  currency: CurrencySchema,
  exchange_rate: z.number(),
  date: z.string().datetime(),
  description: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

// --- TransactionWithDetails (con joins desde RPC get_transactions_paginated) ---
export const TransactionWithDetailsSchema = TransactionSchema.extend({
  account_name: z.string().nullable(),
  account_currency: z.string().nullable(),
  from_account_name: z.string().nullable(),
  to_account_name: z.string().nullable(),
  category_name: z.string().nullable(),
  category_icon: z.string().nullable(),
  category_color: z.string().nullable(),
  category_deleted_at: z.string().datetime().nullable(),
  total_count: z.number(),
});

export type TransactionWithDetails = z.infer<typeof TransactionWithDetailsSchema>;

// --- Campos base reutilizables ---
const positiveAmount = z.coerce
  .number()
  .positive("El monto debe ser mayor a 0");

const exchangeRateField = z.coerce
  .number()
  .positive("La tasa debe ser mayor a 0")
  .default(1.0);

const dateField = z.coerce
  .date()
  .refine((d) => d <= new Date(), {
    message: "La fecha no puede ser futura",
  });

const descriptionField = z
  .string()
  .max(500, "Máximo 500 caracteres")
  .trim()
  .optional()
  .or(z.literal(""));

// --- CreateTransactionInput (formulario de creación) ---
export const CreateTransactionSchema = z
  .object({
    type: TransactionTypeSchema,
    amount: positiveAmount,
    currency: CurrencySchema,
    exchange_rate: exchangeRateField,
    date: dateField,
    description: descriptionField,
    account_id: z.string().uuid().optional(),
    from_account_id: z.string().uuid().optional(),
    to_account_id: z.string().uuid().optional(),
    category_id: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "INCOME" || data.type === "EXPENSE") {
      if (!data.account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecciona una cuenta",
          path: ["account_id"],
        });
      }
      if (!data.category_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecciona una categoría",
          path: ["category_id"],
        });
      }
      if (data.from_account_id || data.to_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Este tipo de transacción no usa cuentas origen/destino",
          path: ["account_id"],
        });
      }
    }
    if (data.type === "TRANSFER") {
      if (!data.from_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecciona la cuenta origen",
          path: ["from_account_id"],
        });
      }
      if (!data.to_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecciona la cuenta destino",
          path: ["to_account_id"],
        });
      }
      if (
        data.from_account_id &&
        data.to_account_id &&
        data.from_account_id === data.to_account_id
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La cuenta origen y destino deben ser diferentes",
          path: ["to_account_id"],
        });
      }
      if (data.category_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Las transferencias no llevan categoría",
          path: ["category_id"],
        });
      }
    }
  });

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

// --- UpdateTransactionInput (formulario de edición: incluye id) ---
export const UpdateTransactionSchema = CreateTransactionSchema.and(
  z.object({
    id: z.string().uuid("ID de transacción inválido"),
  })
);

export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

// --- TransactionFilters (historial paginado)
// Las fechas se reciben como strings "YYYY-MM-DD" desde los inputs date del navegador.
export const TransactionFiltersSchema = z.object({
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  account_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});

export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;

// --- PaginatedTransactions (resultado del listado) ---
export const PaginatedTransactionsSchema = z.object({
  items: z.array(TransactionWithDetailsSchema),
  total_count: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export type PaginatedTransactions = z.infer<typeof PaginatedTransactionsSchema>;

// --- DeleteTransactionInput ---
export const DeleteTransactionSchema = z.object({
  id: z.string().uuid("ID de transacción inválido"),
});

export type DeleteTransactionInput = z.infer<typeof DeleteTransactionSchema>;

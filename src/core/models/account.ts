import { z } from "zod";

// --- Enums compartidos ---
export const AccountTypeSchema = z.enum(["DEBIT", "CREDIT", "CASH"]);
export const AccountStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
export const CurrencySchema = z.enum(["COP", "USD", "EUR"]);

export type AccountType = z.infer<typeof AccountTypeSchema>;
export type AccountStatus = z.infer<typeof AccountStatusSchema>;
export type Currency = z.infer<typeof CurrencySchema>;

// --- Account (registro completo desde BD) ---
export const AccountSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  type: AccountTypeSchema,
  status: AccountStatusSchema,
  balance: z.number(),
  currency: CurrencySchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Account = z.infer<typeof AccountSchema>;

// --- AccountWithMeta (con flag has_transactions desde RPC) ---
export const AccountWithMetaSchema = AccountSchema.extend({
  has_transactions: z.boolean(),
});

export type AccountWithMeta = z.infer<typeof AccountWithMetaSchema>;

// --- CreateAccountInput (formulario de creación) ---
export const CreateAccountSchema = z
  .object({
    name: z
      .string()
      .min(1, "El nombre es requerido")
      .max(50, "Máximo 50 caracteres")
      .trim(),
    type: AccountTypeSchema,
    currency: CurrencySchema,
    initial_balance: z.coerce.number(),
  })
  .refine((data) => data.type !== "CASH" || data.initial_balance >= 0, {
    message: "Las cuentas de efectivo no pueden tener saldo negativo",
    path: ["initial_balance"],
  });

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;

// --- UpdateAccountInput (formulario de edición) ---
export const UpdateAccountSchema = z
  .object({
    name: z.string().min(1, "El nombre es requerido").max(50).trim().optional(),
    type: AccountTypeSchema.optional(),
    currency: CurrencySchema.optional(),
    initial_balance: z.coerce.number().optional(),
  })
  .refine(
    (data) =>
      !data.type ||
      data.initial_balance === undefined ||
      data.type !== "CASH" ||
      data.initial_balance >= 0,
    {
      message: "Las cuentas de efectivo no pueden tener saldo negativo",
      path: ["initial_balance"],
    },
  );

export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;

// --- UserBalance (desde tabla user_balances) ---
export const UserBalanceSchema = z.object({
  user_id: z.string().uuid(),
  total_balance: z.number(),
  currency: CurrencySchema,
  updated_at: z.string().datetime(),
});

export type UserBalance = z.infer<typeof UserBalanceSchema>;

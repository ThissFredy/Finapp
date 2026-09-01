import { z } from "zod";
import { CurrencySchema } from "@/core/models/account";

// --- Enums ---
export const BillingCycleSchema = z.enum(["MONTHLY", "YEARLY"]);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const SubscriptionStatusSchema = z.enum(["ACTIVE", "PAUSED", "CANCELLED"]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

// --- Subscription (registro completo desde BD) ---
export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  amount: z.number(),
  currency: CurrencySchema,
  billing_cycle: BillingCycleSchema,
  next_billing_date: z.string(), // "YYYY-MM-DD" desde BD (tipo date)
  category_id: z.string().uuid().nullable(),
  account_id: z.string().uuid().nullable(),
  status: SubscriptionStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

// --- SubscriptionWithMeta (con joins e is_paid_this_cycle desde RPC) ---
export const SubscriptionWithMetaSchema = SubscriptionSchema.extend({
  account_name: z.string().nullable(),
  account_currency: z.string().nullable(),
  account_status: z.string().nullable(),
  category_name: z.string().nullable(),
  category_icon: z.string().nullable(),
  category_color: z.string().nullable(),
  category_deleted_at: z.string().datetime().nullable(),
  is_paid_this_cycle: z.boolean(),
});

export type SubscriptionWithMeta = z.infer<typeof SubscriptionWithMetaSchema>;

// --- Campos base reutilizables ---
const positiveAmount = z.coerce
  .number()
  .positive("El monto debe ser mayor a 0");

const subscriptionName = z
  .string()
  .min(1, "El nombre es requerido")
  .max(50, "Máximo 50 caracteres")
  .trim();

// next_billing_date: puede ser pasada o futura (a diferencia de las transacciones)
const billingDateField = z.coerce.date({
  errorMap: () => ({ message: "Fecha inválida" }),
});

// --- CreateSubscriptionInput (formulario de creación) ---
export const CreateSubscriptionSchema = z.object({
  name: subscriptionName,
  amount: positiveAmount,
  currency: CurrencySchema,
  billing_cycle: BillingCycleSchema,
  next_billing_date: billingDateField,
  category_id: z.string().uuid("Selecciona una categoría"),
  account_id: z.string().uuid("Selecciona una cuenta"),
});

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;

// --- UpdateSubscriptionInput (formulario de edición: incluye id y status) ---
export const UpdateSubscriptionSchema = z.object({
  id: z.string().uuid("ID de suscripción inválido"),
  name: subscriptionName,
  amount: positiveAmount,
  currency: CurrencySchema,
  billing_cycle: BillingCycleSchema,
  next_billing_date: billingDateField,
  category_id: z.string().uuid("Selecciona una categoría"),
  account_id: z.string().uuid("Selecciona una cuenta"),
  status: SubscriptionStatusSchema,
});

export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;

// --- RegisterPaymentInput (diálogo de confirmación de pago) ---
const nonNegativeAmount = z.coerce
  .number()
  .min(0, "El monto no puede ser negativo");

const paymentDateField = z.coerce.date().refine((d) => d <= new Date(), {
  message: "La fecha no puede ser futura",
});

const descriptionField = z
  .string()
  .max(500, "Máximo 500 caracteres")
  .trim()
  .optional()
  .or(z.literal(""));

export const RegisterPaymentSchema = z.object({
  subscription_id: z.string().uuid("ID de suscripción inválido"),
  amount: nonNegativeAmount,
  exchange_rate: z.coerce
    .number()
    .positive("La tasa debe ser mayor a 0")
    .default(1.0),
  date: paymentDateField,
  description: descriptionField,
  account_id: z.string().uuid("Selecciona una cuenta"),
});

export type RegisterPaymentInput = z.infer<typeof RegisterPaymentSchema>;

// --- DeleteSubscriptionInput ---
export const DeleteSubscriptionSchema = z.object({
  id: z.string().uuid("ID de suscripción inválido"),
});

export type DeleteSubscriptionInput = z.infer<typeof DeleteSubscriptionSchema>;

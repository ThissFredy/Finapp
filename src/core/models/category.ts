import { z } from "zod";

// --- Enums compartidos ---
export const CategoryTypeSchema = z.enum(["INGRESO", "GASTO"]);

export type CategoryType = z.infer<typeof CategoryTypeSchema>;

// --- Category (registro completo desde BD) ---
export const CategorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  type: CategoryTypeSchema,
  icon: z.string(),
  color: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type Category = z.infer<typeof CategorySchema>;

// --- CategoryWithMeta (con flag has_transactions desde RPC) ---
export const CategoryWithMetaSchema = CategorySchema.extend({
  has_transactions: z.boolean(),
});

export type CategoryWithMeta = z.infer<typeof CategoryWithMetaSchema>;

// --- CreateCategoryInput (formulario de creación) ---
export const CreateCategorySchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "Máximo 50 caracteres")
    .trim(),
  type: CategoryTypeSchema,
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color HEX inválido (ej. #FF5733)"),
  icon: z
    .string()
    .min(1, "El ícono es requerido")
    .max(100, "Máximo 100 caracteres")
    .trim(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

// --- UpdateCategoryInput (formulario de edición: sin type) ---
export const UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "Máximo 50 caracteres")
    .trim()
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color HEX inválido (ej. #FF5733)")
    .optional(),
  icon: z
    .string()
    .min(1, "El ícono es requerido")
    .max(100, "Máximo 100 caracteres")
    .trim()
    .optional(),
});

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

// --- DeleteCategoryInput (estrategias de eliminación) ---
export const DeleteCategorySchema = z
  .object({
    id: z.string().uuid(),
    strategy: z.enum(["Eliminar", "Re-asignar", "Mantener en historial"]),
    reassignTo: z.string().uuid().optional(),
  })
  .refine(
    (data) => data.strategy !== "Re-asignar" || data.reassignTo !== undefined,
    {
      message: "Debe especificar la categoría destino al re-asignar",
      path: ["reassignTo"],
    },
  );

export type DeleteCategoryInput = z.infer<typeof DeleteCategorySchema>;

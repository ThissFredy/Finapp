import { createServerClientInstance } from "@/core/db/supabase.server";
import {
  selectCategoriesWithMeta,
  selectActiveCategoriesByType,
  insertCategory,
  updateCategoryRecord,
  softDeleteCategory,
  hardDeleteCategory,
  reassignAndDeleteCategory,
} from "@/core/db/queries/category.queries";
import type {
  Category,
  CategoryWithMeta,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/core/models/category";

// Obtener el ID del usuario autenticado
async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");
  return user.id;
}

// Listar categorías agrupadas por tipo (activas primero, luego eliminadas)
export async function listCategories(): Promise<{
  income: CategoryWithMeta[];
  expense: CategoryWithMeta[];
  deleted: CategoryWithMeta[];
}> {
  const all = await selectCategoriesWithMeta();
  return {
    income: all.filter((c) => c.type === "INCOME" && c.deleted_at === null),
    expense: all.filter((c) => c.type === "EXPENSE" && c.deleted_at === null),
    deleted: all.filter((c) => c.deleted_at !== null),
  };
}

// Crear una nueva categoría
export async function createCategory(
  input: CreateCategoryInput
): Promise<Category> {
  const userId = await getAuthenticatedUserId();
  return insertCategory(input, userId);
}

// Editar una categoría (name, color, icon — nunca type)
export async function updateCategory(
  input: UpdateCategoryInput
): Promise<Category> {
  return updateCategoryRecord(input.id, input);
}

// Eliminar una categoría según la estrategia seleccionada
export async function deleteCategory(input: {
  id: string;
  strategy: "hard" | "reassign" | "soft";
  reassignTo?: string;
}): Promise<void> {
  switch (input.strategy) {
    case "hard":
      await hardDeleteCategory(input.id);
      break;
    case "reassign":
      if (!input.reassignTo) {
        throw new Error("Debe especificar la categoría destino");
      }
      await reassignAndDeleteCategory(input.id, input.reassignTo);
      break;
    case "soft":
      await softDeleteCategory(input.id);
      break;
  }
}

// Obtener categorías activas por tipo (para selectores de otros módulos)
export async function getCategoriesByType(
  type: "INCOME" | "EXPENSE"
): Promise<Category[]> {
  return selectActiveCategoriesByType(type);
}

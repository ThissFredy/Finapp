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
<<<<<<< HEAD
    income: all.filter((c) => c.type === "INGRESO" && c.deleted_at === null),
    expense: all.filter((c) => c.type === "GASTO" && c.deleted_at === null),
=======
    income: all.filter((c) => c.type === "INCOME" && c.deleted_at === null),
    expense: all.filter((c) => c.type === "EXPENSE" && c.deleted_at === null),
>>>>>>> origin/master
    deleted: all.filter((c) => c.deleted_at !== null),
  };
}

// Crear una nueva categoría
export async function createCategory(
<<<<<<< HEAD
  input: CreateCategoryInput,
=======
  input: CreateCategoryInput
>>>>>>> origin/master
): Promise<Category> {
  const userId = await getAuthenticatedUserId();
  return insertCategory(input, userId);
}

// Editar una categoría (name, color, icon — nunca type)
export async function updateCategory(
<<<<<<< HEAD
  input: UpdateCategoryInput,
=======
  input: UpdateCategoryInput
>>>>>>> origin/master
): Promise<Category> {
  return updateCategoryRecord(input.id, input);
}

// Eliminar una categoría según la estrategia seleccionada
export async function deleteCategory(input: {
  id: string;
<<<<<<< HEAD
  strategy: "Eliminar" | "Re-asignar" | "Mantener en historial";
  reassignTo?: string;
}): Promise<void> {
  switch (input.strategy) {
    case "Eliminar":
      await hardDeleteCategory(input.id);
      break;
    case "Re-asignar":
=======
  strategy: "hard" | "reassign" | "soft";
  reassignTo?: string;
}): Promise<void> {
  switch (input.strategy) {
    case "hard":
      await hardDeleteCategory(input.id);
      break;
    case "reassign":
>>>>>>> origin/master
      if (!input.reassignTo) {
        throw new Error("Debe especificar la categoría destino");
      }
      await reassignAndDeleteCategory(input.id, input.reassignTo);
      break;
<<<<<<< HEAD
    case "Mantener en historial":
=======
    case "soft":
>>>>>>> origin/master
      await softDeleteCategory(input.id);
      break;
  }
}

// Obtener categorías activas por tipo (para selectores de otros módulos)
export async function getCategoriesByType(
<<<<<<< HEAD
  type: "INGRESO" | "GASTO",
=======
  type: "INCOME" | "EXPENSE"
>>>>>>> origin/master
): Promise<Category[]> {
  return selectActiveCategoriesByType(type);
}

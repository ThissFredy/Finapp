import { createServerClientInstance } from "@/core/db/supabase.server";
import type {
  Category,
  CategoryWithMeta,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/core/models/category";

// Obtener todas las categorías del usuario con flag has_transactions (vía RPC)
export async function selectCategoriesWithMeta(): Promise<CategoryWithMeta[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_categories_with_meta");
  if (error) throw error;
  return (data ?? []) as CategoryWithMeta[];
}

// Obtener categorías activas filtradas por tipo (para selectores de TransactionForm)
export async function selectActiveCategoriesByType(
  type: "INGRESO" | "GASTO",
): Promise<Category[]> {
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", type)
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

// Insertar una nueva categoría
export async function insertCategory(
  input: CreateCategoryInput,
  userId: string,
): Promise<Category> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: input.name,
      type: input.type,
      color: input.color,
      icon: input.icon,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

// Actualizar una categoría existente (solo name, color, icon — nunca type)
export async function updateCategoryRecord(
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  const supabase = await createServerClientInstance();
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.icon !== undefined) updateData.icon = input.icon;

  const { data, error } = await supabase
    .from("categories")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

// Soft delete: marcar deleted_at
export async function softDeleteCategory(id: string): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Hard delete: eliminar permanentemente
export async function hardDeleteCategory(id: string): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// Re-asignar transacciones y eliminar categoría origen (vía RPC)
export async function reassignAndDeleteCategory(
  sourceId: string,
  targetId: string,
): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase.rpc("reassign_category_transactions", {
    p_source_category_id: sourceId,
    p_target_category_id: targetId,
  });
  if (error) throw error;
}

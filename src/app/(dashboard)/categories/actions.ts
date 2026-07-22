"use server";

import { revalidatePath } from "next/cache";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  DeleteCategorySchema,
} from "@/core/models/category";
import * as categoryService from "@/core/services/category.service";
import type { Category } from "@/core/models/category";

type FieldErrors = Record<string, string[]>;

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: FieldErrors };

export async function createCategoryAction(
  formData: FormData,
): Promise<ActionResult<Category>> {
  const parsed = CreateCategorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color"),
    icon: formData.get("icon"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors,
    };
  }

  try {
    const category = await categoryService.createCategory(parsed.data);
    revalidatePath("/categories");
    return { success: true, data: category };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al crear la categoría";
    console.error("Error creating category:", error);
    if (message.includes("duplicate") || message.includes("23505")) {
      return {
        success: false,
        error: "Ya existe una categoría con ese nombre",
        fieldErrors: { name: ["Ya existe una categoría con ese nombre"] },
      };
    }
    return { success: false, error: message };
  }
}

export async function updateCategoryAction(
  formData: FormData,
): Promise<ActionResult<Category>> {
  const parsed = UpdateCategorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    color: formData.get("color") || undefined,
    icon: formData.get("icon") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors,
    };
  }

  try {
    const category = await categoryService.updateCategory(parsed.data);
    revalidatePath("/categories");
    return { success: true, data: category };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al actualizar la categoría";
    if (message.includes("duplicate") || message.includes("23505")) {
      return {
        success: false,
        error: "Ya existe una categoría con ese nombre",
        fieldErrors: { name: ["Ya existe una categoría con ese nombre"] },
      };
    }
    return { success: false, error: message };
  }
}

export async function deleteCategoryAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = DeleteCategorySchema.safeParse({
    id: formData.get("id"),
    strategy: formData.get("strategy"),
    reassignTo: formData.get("reassignTo") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors,
    };
  }

  try {
    await categoryService.deleteCategory(parsed.data);
    revalidatePath("/categories");
    return { success: true, data: undefined };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al eliminar la categoría";
    return { success: false, error: message };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import {
  CreateAccountSchema,
  UpdateAccountSchema,
} from "@/core/models/account";
import * as accountService from "@/core/services/account.service";
import type { Account } from "@/core/models/account";

type FieldErrors = Record<string, string[]>;

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: FieldErrors };

export async function createAccountAction(
  formData: FormData
): Promise<ActionResult<Account>> {
  const parsed = CreateAccountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    currency: formData.get("currency"),
    initial_balance: formData.get("initial_balance"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors,
    };
  }

  try {
    const account = await accountService.createAccount(parsed.data);
    revalidatePath("/accounts");
    return { success: true, data: account };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al crear la cuenta";
    // Detectar violación de constraint único (duplicate name)
    if (message.includes("duplicate") || message.includes("23505")) {
      return {
        success: false,
        error: "Ya existe una cuenta con ese nombre",
        fieldErrors: { name: ["Ya existe una cuenta con ese nombre"] },
      };
    }
    return { success: false, error: message };
  }
}

export async function updateAccountAction(
  id: string,
  formData: FormData
): Promise<ActionResult<Account>> {
  const parsed = UpdateAccountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    currency: formData.get("currency"),
    initial_balance: formData.get("initial_balance") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors,
    };
  }

  try {
    const account = await accountService.updateAccount(id, parsed.data);
    revalidatePath("/accounts");
    return { success: true, data: account };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al actualizar la cuenta";
    if (message.includes("duplicate") || message.includes("23505")) {
      return {
        success: false,
        error: "Ya existe una cuenta con ese nombre",
        fieldErrors: { name: ["Ya existe una cuenta con ese nombre"] },
      };
    }
    return { success: false, error: message };
  }
}

export async function toggleAccountStatusAction(
  id: string
): Promise<ActionResult> {
  try {
    await accountService.toggleStatus(id);
    revalidatePath("/accounts");
    return { success: true, data: undefined };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al cambiar el estado";
    return { success: false, error: message };
  }
}

export async function deleteAccountAction(id: string): Promise<ActionResult> {
  try {
    await accountService.deleteAccount(id);
    revalidatePath("/accounts");
    return { success: true, data: undefined };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al eliminar la cuenta";
    return { success: false, error: message };
  }
}

# Spec — Módulo 2: Categorización Dinámica

> **Proyecto:** FinApp — Sistema de Gestión Financiera Personal
> **Módulo:** 2 — Categorización Dinámica
> **Historias de Usuario:** HU-2.1, HU-2.2, HU-2.3
> **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL + Auth)
> **Fecha:** 2026-06-30
> **Prerrequisito:** Módulo 1 implementado (BD migrada + frontend de cuentas funcional)

---

## 1. Resumen

Módulo de gestión de categorías que permite al usuario clasificar sus ingresos y gastos mediante rubros personalizados con nombre, ícono y color. Incluye creación, edición (restringida), eliminación con tres estrategias (hard delete, re-asignación y soft delete) y listado agrupado por tipo.

Cubre las siguientes historias de usuario:

- **HU-2.1:** Crear categorías personalizadas definiendo un nombre, un ícono y un color.
- **HU-2.2:** Distinguir entre categorías exclusivas para "Ingresos" y exclusivas para "Gastos".
- **HU-2.3:** Editar o eliminar una categoría (re-asignando o manteniendo en el historial las transacciones asociadas).

---

## 2. Asunciones Validadas

1. **Campo `icon` ausente en el modelo de datos del README:** La HU-2.1 exige definir un "ícono", pero el modelo `categories` del README solo contempla `name`, `type` y `color`. La tabla `categories` ya fue creada en la migración del Módulo 1 con una columna `icon text` nullable. En este módulo se altera para que sea `NOT NULL` con default `'tag'`.
2. **Formato del ícono:** Nombre de ícono de la librería `lucide-react` (ej. `utensils`, `wallet`, `tag`). El frontend muestra una guía visual de íconos disponibles y un enlace a la documentación de lucide-react (`https://lucide.dev/icons`) para que el usuario conozca todas las opciones.
3. **Formato del color:** Cadena HEX de 7 caracteres (ej. `#FF5733`). El frontend usa un color picker nativo. Se valida con regex `/^#[0-9A-Fa-f]{6}$/` en Zod.
4. **Unicidad de nombres:** El nombre de la categoría debe ser único por usuario y por tipo (es decir, puede existir "Salario" como INCOME y "Salario" como EXPENSE, pero no dos "Salario" como INCOME para el mismo usuario). Constraint en BD: `UNIQUE (user_id, name, type) WHERE deleted_at IS NULL`.
5. **Categorías iniciales:** El usuario comienza sin categorías predefinidas y debe crear las suyas propias. No se siembran categorías por defecto al registrarse.
6. **Inmutabilidad del `type`:** Una vez creada una categoría, su tipo (INCOME/EXPENSE) no puede cambiarse en la edición, para preservar la integridad referencial con las transacciones ya registradas. Solo se pueden editar `name`, `icon` y `color`.
7. **Comportamiento al eliminar con transacciones asociadas (HU-2.3):** Al intentar eliminar una categoría que tiene transacciones asociadas, el sistema muestra un modal de confirmación con dos opciones:
   - **(a) Re-asignar:** El usuario selecciona otra categoría existente (del mismo tipo) para migrar las transacciones.
   - **(b) Mantener en historial:** Las transacciones conservan referencia pero la categoría se marca como "eliminada" (soft delete) y se muestra como "(Categoría eliminada)" en el historial.
8. **Eliminación sin transacciones:** Si una categoría no tiene transacciones asociadas, se elimina directamente (hard delete) tras una confirmación simple.
9. **Soft delete con columna `deleted_at`:** Se agrega una columna `deleted_at` (timestamp nullable) a la tabla `categories`. Una categoría con `deleted_at IS NOT NULL` no aparece en los selectores de nuevas transacciones, pero sí en el historial de transacciones como "(Categoría eliminada)".
10. **Sin límite de categorías:** No existe un límite en la cantidad de categorías que un usuario puede crear.
11. **Ordenamiento y visualización:** Las categorías se listan agrupadas por tipo (primero INCOME, luego EXPENSE) y ordenadas alfabéticamente por nombre dentro de cada grupo. Las categorías con `deleted_at IS NOT NULL` no aparecen en el listado principal.
12. **Validación de color e ícono:** Solo en frontend con Zod. El color debe ser HEX válido y el ícono debe ser un string no vacío. El backend confía en lo que envía el cliente (protegido por RLS).

---

## 3. Tracks de Implementación

El módulo se divide en dos tracks **secuenciales**: el Track A (migración de BD) debe completarse antes de iniciar el Track B (frontend).

### Track A — Backend (Supabase): Migración de la tabla `categories`

Responsable de alterar la tabla `categories` existente (creada en el Módulo 1) para añadir `deleted_at`, hacer `icon` NOT NULL, añadir constraint único y crear la función RPC `get_categories_with_meta`.

> **Contexto:** La tabla `categories` ya fue creada en la migración del Módulo 1 (sección A.3 del spec del Módulo 1) con la siguiente estructura:
> ```sql
> create table public.categories (
>   id uuid primary key default gen_random_uuid(),
>   user_id uuid not null references auth.users(id) on delete cascade,
>   name text not null,
>   type public.category_type not null,
>   icon text,
>   color text not null default '#6B7280',
>   created_at timestamptz not null default now(),
>   updated_at timestamptz not null default now()
> );
> ```
> El enum `public.category_type` ('INCOME', 'EXPENSE'), la política RLS y el trigger `categories_set_updated_at` ya existen.

**A.1. Migración — Alterar tabla `categories`: columna `deleted_at`**

```sql
-- Añadir columna deleted_at para soft delete
alter table public.categories
  add column deleted_at timestamptz;

-- Hacer icon NOT NULL con default 'tag'
-- Primero actualizar registros existentes con icon null
update public.categories set icon = 'tag' where icon is null;

alter table public.categories
  alter column icon set not null,
  alter column icon set default 'tag';
```

**A.2. Migración — Constraint único parcial**

```sql
-- Nombre único por usuario + tipo, solo para categorías no eliminadas
create unique index categories_unique_name_per_type
  on public.categories (user_id, name, type)
  where deleted_at is null;
```

> **Diseño:** Se usa un índice único parcial (`WHERE deleted_at IS NULL`) en lugar de un constraint `UNIQUE` estándar, porque Postgres no soporta `UNIQUE ... WHERE` como constraint de tabla. El índice parcial logra el mismo efecto: dos categorías activas no pueden tener el mismo nombre + tipo, pero una categoría eliminada (soft delete) libera el nombre para reutilización.

**A.3. Migración — Índice compuesto para listado agrupado**

```sql
create index idx_categories_user_type_name
  on public.categories (user_id, type, name)
  where deleted_at is null;
```

**A.4. Migración — Función RPC `get_categories_with_meta`**

Función que retorna las categorías del usuario autenticado con un flag `has_transactions` para que el frontend sepa si puede hacer hard delete o si debe ofrecer re-asignación/soft delete.

```sql
create or replace function public.get_categories_with_meta()
returns table (
  id uuid,
  user_id uuid,
  name text,
  type public.category_type,
  icon text,
  color text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  has_transactions boolean
)
language sql
security definer set search_path = public
as $$
  select
    c.id, c.user_id, c.name, c.type, c.icon, c.color,
    c.created_at, c.updated_at, c.deleted_at,
    exists(
      select 1 from public.transactions t
      where t.user_id = auth.uid()
        and t.category_id = c.id
    ) as has_transactions
  from public.categories c
  where c.user_id = auth.uid()
  order by (c.deleted_at is null) desc, c.type asc, c.name asc;
$$;

revoke execute on function public.get_categories_with_meta() from public;
grant execute on function public.get_categories_with_meta() to authenticated;
```

> **Ordenamiento:** `(deleted_at is null) desc` pone las categorías activas primero, las eliminadas al final. `c.type asc` agrupa INCOME antes que EXPENSE. `c.name asc` ordena alfabéticamente dentro de cada grupo.

**A.5. Migración — Función RPC `reassign_category_transactions`**

Función que re-asigna todas las transacciones de una categoría origen a una categoría destino (del mismo tipo), y luego elimina la categoría origen (hard delete). Opera atómicamente en una transacción.

```sql
create or replace function public.reassign_category_transactions(
  p_source_category_id uuid,
  p_target_category_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_source_type public.category_type;
  v_target_type public.category_type;
  v_source_user_id uuid;
  v_target_user_id uuid;
begin
  -- Validar que ambas categorías pertenecen al usuario autenticado
  select type, user_id into v_source_type, v_source_user_id
    from public.categories where id = p_source_category_id;
  select type, user_id into v_target_type, v_target_user_id
    from public.categories where id = p_target_category_id;

  if v_source_user_id is null or v_source_user_id <> auth.uid() then
    raise exception 'Categoría origen no encontrada o no pertenece al usuario';
  end if;
  if v_target_user_id is null or v_target_user_id <> auth.uid() then
    raise exception 'Categoría destino no encontrada o no pertenece al usuario';
  end if;
  if v_source_type <> v_target_type then
    raise exception 'Las categorías deben ser del mismo tipo';
  end if;

  -- Re-asignar transacciones
  update public.transactions
    set category_id = p_target_category_id
    where category_id = p_source_category_id
      and user_id = auth.uid();

  -- Eliminar la categoría origen
  delete from public.categories
    where id = p_source_category_id
      and user_id = auth.uid();
end;
$$;

revoke execute on function public.reassign_category_transactions(uuid, uuid) from public;
grant execute on function public.reassign_category_transactions(uuid, uuid) to authenticated;
```

> **Seguridad:** La función valida que ambas categorías pertenezcan al `auth.uid()` y sean del mismo `type`. Falla con excepción si no se cumplen las condiciones.

**A.6. Advisors**

Tras aplicar la migración, ejecutar `supabase_get_advisors` (security) para verificar:
- RLS sigue habilitada en `categories`.
- Las nuevas funciones `security definer` tienen `search_path` limitado a `public`.
- No hay políticas permissivas excesivas.

---

### Track B — Frontend (Next.js): Módulo 2

Responsable de la capa de presentación, modelos, servicios, server actions y componentes UI para la gestión de categorías.

> **Prerrequisito:** Track A completado (migración aplicada en Supabase).

**B.1. Dependencia nueva — `lucide-react`**

```bash
pnpm add lucide-react
```

> Si `lucide-react` ya está instalado (probablemente vía shadcn/ui), omitir este paso.

**B.2. Componentes base shadcn/ui a instalar**

```bash
pnpm dlx shadcn@latest add card input select label dialog badge dropdown-menu popover
```

**B.3. Modelos — `src/core/models/category.ts`**

```typescript
import { z } from "zod";

// --- Enums compartidos ---
export const CategoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);

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
export const DeleteCategorySchema = z.object({
  id: z.string().uuid(),
  strategy: z.enum(["hard", "reassign", "soft"]),
  reassignTo: z.string().uuid().optional(),
}).refine(
  (data) => data.strategy !== "reassign" || data.reassignTo !== undefined,
  {
    message: "Debe especificar la categoría destino al re-asignar",
    path: ["reassignTo"],
  }
);

export type DeleteCategoryInput = z.infer<typeof DeleteCategorySchema>;
```

**B.4. Queries — `src/core/db/queries/category.queries.ts`**

```typescript
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
  type: "INCOME" | "EXPENSE"
): Promise<Category[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    .eq("type", type)
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

// Insertar una nueva categoría
export async function insertCategory(
  input: CreateCategoryInput,
  userId: string
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
  input: UpdateCategoryInput
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
  targetId: string
): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase.rpc("reassign_category_transactions", {
    p_source_category_id: sourceId,
    p_target_category_id: targetId,
  });
  if (error) throw error;
}
```

**B.5. Servicios — `src/core/services/category.service.ts`**

```typescript
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
export async function deleteCategory(
  input: { id: string; strategy: "hard" | "reassign" | "soft"; reassignTo?: string }
): Promise<void> {
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
```

**B.6. Server Actions — `src/app/(dashboard)/categories/actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  DeleteCategorySchema,
} from "@/core/models/category";
import * as categoryService from "@/core/services/category.service";

export async function createCategoryAction(formData: FormData) {
  const parsed = CreateCategorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color"),
    icon: formData.get("icon"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await categoryService.createCategory(parsed.data);
    revalidatePath("/categories");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function updateCategoryAction(formData: FormData) {
  const parsed = UpdateCategorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    color: formData.get("color") || undefined,
    icon: formData.get("icon") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await categoryService.updateCategory(parsed.data);
    revalidatePath("/categories");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function deleteCategoryAction(formData: FormData) {
  const parsed = DeleteCategorySchema.safeParse({
    id: formData.get("id"),
    strategy: formData.get("strategy"),
    reassignTo: formData.get("reassignTo") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await categoryService.deleteCategory(parsed.data);
    revalidatePath("/categories");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}
```

**B.7. Componente UI — `src/components/ui/ColorPicker.tsx`**

Selector de color HEX. Usa un `<input type="color">` nativo del navegador y muestra el valor HEX.

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 cursor-pointer rounded-md border border-input"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={7}
        className="w-28 font-mono uppercase"
        placeholder="#6B7280"
      />
    </div>
  );
}
```

**B.8. Componente UI — `src/components/ui/IconPicker.tsx`**

Selector de ícono de `lucide-react`. Muestra una cuadrícula de íconos populares, un campo de búsqueda, y un enlace a la documentación completa.

```tsx
"use client";

import { useState } from "react";
import {
  Tag, Wallet, Utensils, Car, Home, ShoppingBag, Film, Plane,
  Heart, Gift, GraduationCap, Dumbbell, Coffee, Smartphone, Zap,
  Droplet, Wifi, Stethoscope, PiggyBank, CreditCard, Receipt,
  TrendingUp, Briefcase, Landmark, Coins, DollarSign, Plus,
  Minus, ArrowLeftRight, type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const POPULAR_ICONS: Record<string, LucideIcon> = {
  tag: Tag,
  wallet: Wallet,
  utensils: Utensils,
  car: Car,
  home: Home,
  "shopping-bag": ShoppingBag,
  film: Film,
  plane: Plane,
  heart: Heart,
  gift: Gift,
  graduation: GraduationCap,
  dumbbell: Dumbbell,
  coffee: Coffee,
  smartphone: Smartphone,
  zap: Zap,
  droplet: Droplet,
  wifi: Wifi,
  stethoscope: Stethoscope,
  piggybank: PiggyBank,
  "credit-card": CreditCard,
  receipt: Receipt,
  "trending-up": TrendingUp,
  briefcase: Briefcase,
  landmark: Landmark,
  coins: Coins,
  dollar: DollarSign,
  plus: Plus,
  minus: Minus,
  transfer: ArrowLeftRight,
};

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState("");
  const [customIcon, setCustomIcon] = useState("");

  const filteredIcons = Object.entries(POPULAR_ICONS).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const SelectedIcon = POPULAR_ICONS[value] ?? Tag;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-input bg-muted">
          <SelectedIcon className="h-5 w-5" />
        </div>
        <Input
          value={value}
          readOnly
          className="flex-1 font-mono"
          placeholder="Selecciona un ícono"
        />
      </div>

      <Input
        type="search"
        placeholder="Buscar ícono..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-6 gap-2 rounded-md border border-input p-3 max-h-48 overflow-y-auto">
        {filteredIcons.map(([name, Icon]) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${
              value === name
                ? "border-primary bg-primary/10"
                : "border-input hover:bg-muted"
            }`}
            title={name}
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Ícono personalizado (nombre lucide)"
          value={customIcon}
          onChange={(e) => setCustomIcon(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (customIcon.trim()) {
              onChange(customIcon.trim().toLowerCase());
              setCustomIcon("");
            }
          }}
        >
          Usar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        ¿No encuentras el ícono? Consulta el catálogo completo en{" "}
        <a
          href="https://lucide.dev/icons"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
        >
          lucide.dev/icons
        </a>{" "}
        y copia el nombre aquí.
      </p>
    </div>
  );
}
```

> **Diseño:** Se ofrece una cuadrícula de ~29 íconos populares para selección rápida. El campo de "Ícono personalizado" permite escribir el nombre exacto de cualquier ícono de lucide-react (ej. `utensils-crossed`) para usuarios avanzados. El enlace a `https://lucide.dev/icons` abre el catálogo completo.

**B.9. Componente — `src/components/forms/CategoryForm.tsx`**

Formulario modal para crear/editar categorías. En modo edición, el campo `type` está deshabilitado (solo lectura).

```tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { IconPicker } from "@/components/ui/IconPicker";
import { createCategoryAction, updateCategoryAction } from "@/app/(dashboard)/categories/actions";
import type { Category, CategoryType } from "@/core/models/category";

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null; // Si se pasa, modo edición
}

export function CategoryForm({ open, onClose, category }: CategoryFormProps) {
  const isEditing = !!category;
  const [name, setName] = useState(category?.name ?? "");
  const [type, setType] = useState<CategoryType>(category?.type ?? "EXPENSE");
  const [color, setColor] = useState(category?.color ?? "#6B7280");
  const [icon, setIcon] = useState(category?.icon ?? "tag");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("name", name);
    formData.set("type", type);
    formData.set("color", color);
    formData.set("icon", icon);

    let result;
    if (isEditing && category) {
      formData.set("id", category.id);
      result = await updateCategoryAction(formData);
    } else {
      result = await createCategoryAction(formData);
    }

    if (result?.error) {
      setErrors(result.error);
    } else {
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Ej. Salario, Comida, Transporte..."
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as CategoryType)}
              disabled={isEditing}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Ingreso</SelectItem>
                <SelectItem value="EXPENSE">Gasto</SelectItem>
              </SelectContent>
            </Select>
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                El tipo no puede modificarse después de crear la categoría.
              </p>
            )}
            {errors.type && <p className="text-sm text-destructive">{errors.type[0]}</p>}
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
            {errors.color && <p className="text-sm text-destructive">{errors.color[0]}</p>}
          </div>

          {/* Ícono */}
          <div className="space-y-2">
            <Label>Ícono</Label>
            <IconPicker value={icon} onChange={setIcon} />
            {errors.icon && <p className="text-sm text-destructive">{errors.icon[0]}</p>}
          </div>

          {errors._form && (
            <p className="text-sm text-destructive">{errors._form[0]}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{isEditing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**B.10. Componente — `src/components/categories/CategoryCard.tsx`**

Tarjeta individual que muestra una categoría con su ícono, nombre, color y badge de tipo. Incluye menú de acciones (editar, eliminar).

```tsx
"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as Icons from "lucide-react";
import type { CategoryWithMeta } from "@/core/models/category";

interface CategoryCardProps {
  category: CategoryWithMeta;
  onEdit: (category: CategoryWithMeta) => void;
  onDelete: (category: CategoryWithMeta) => void;
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[
    category.icon.charAt(0).toUpperCase() + category.icon.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  ] ?? Icons.Tag;

  return (
    <Card className="flex items-center gap-3 p-4">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: category.color + "20" }}
      >
        <IconComponent className="h-5 w-5" style={{ color: category.color }} />
      </div>

      <div className="flex-1">
        <p className="font-medium">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {category.has_transactions ? "Tiene transacciones" : "Sin transacciones"}
        </p>
      </div>

      <Badge variant={category.type === "INCOME" ? "default" : "secondary"}>
        {category.type === "INCOME" ? "Ingreso" : "Gasto"}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(category)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(category)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
}
```

**B.11. Componente — `src/components/categories/DeleteCategoryDialog.tsx`**

Modal de eliminación con tres estrategias según si la categoría tiene transacciones asociadas.

```tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteCategoryAction } from "@/app/(dashboard)/categories/actions";
import type { CategoryWithMeta } from "@/core/models/category";

interface DeleteCategoryDialogProps {
  category: CategoryWithMeta | null;
  availableTargets: CategoryWithMeta[]; // Categorías del mismo tipo, activas, excluyendo la actual
  onClose: () => void;
}

export function DeleteCategoryDialog({
  category,
  availableTargets,
  onClose,
}: DeleteCategoryDialogProps) {
  const [strategy, setStrategy] = useState<"hard" | "reassign" | "soft">("hard");
  const [reassignTo, setReassignTo] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (category) {
      if (category.has_transactions) {
        setStrategy("reassign");
      } else {
        setStrategy("hard");
      }
      setReassignTo("");
      setErrors({});
    }
  }, [category]);

  if (!category) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return;
    const formData = new FormData();
    formData.set("id", category.id);
    formData.set("strategy", strategy);
    if (strategy === "reassign") {
      formData.set("reassignTo", reassignTo);
    }
    const result = await deleteCategoryAction(formData);
    if (result?.error) {
      setErrors(result.error);
    } else {
      onClose();
    }
  }

  return (
    <Dialog open={!!category} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Eliminar categoría</DialogTitle>
          <DialogDescription>
            {category.has_transactions
              ? `La categoría "${category.name}" tiene transacciones asociadas. Elige cómo proceder.`
              : `¿Seguro que deseas eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {category.has_transactions && (
            <>
              <div className="space-y-2">
                <Label>Estrategia de eliminación</Label>
                <Select
                  value={strategy}
                  onValueChange={(v) => setStrategy(v as typeof strategy)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reassign">
                      Re-asignar transacciones a otra categoría
                    </SelectItem>
                    <SelectItem value="soft">
                      Mantener en historial (soft delete)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {strategy === "reassign" && (
                <div className="space-y-2">
                  <Label>Categoría destino</Label>
                  {availableTargets.length === 0 ? (
                    <p className="text-sm text-destructive">
                      No hay otras categorías de este tipo disponibles. Crea una nueva
                      categoría del mismo tipo antes de eliminar esta, o usa "mantener en historial".
                    </p>
                  ) : (
                    <Select
                      value={reassignTo}
                      onValueChange={setReassignTo}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTargets.map((target) => (
                          <SelectItem key={target.id} value={target.id}>
                            {target.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.reassignTo && (
                    <p className="text-sm text-destructive">{errors.reassignTo[0]}</p>
                  )}
                </div>
              )}

              {strategy === "soft" && (
                <p className="text-sm text-muted-foreground">
                  La categoría se marcará como eliminada. Las transacciones existentes
                  conservarán su referencia y se mostrará como "(Categoría eliminada)"
                  en el historial. No aparecerá en los selectores de nuevas transacciones.
                </p>
              )}
            </>
          )}

          {errors._form && (
            <p className="text-sm text-destructive">{errors._form[0]}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive">
              Eliminar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**B.12. Componente — `src/components/categories/CategorySelect.tsx`**

Dropdown reutilizable para seleccionar una categoría dentro del `TransactionForm` del Módulo 3. Solo muestra categorías activas del tipo especificado.

```tsx
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as Icons from "lucide-react";
import type { Category, CategoryType } from "@/core/models/category";

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  type: CategoryType;
  placeholder?: string;
}

export function CategorySelect({
  value,
  onChange,
  categories,
  type,
  placeholder = "Selecciona una categoría...",
}: CategorySelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No hay categorías de {type === "INCOME" ? "ingreso" : "gasto"}.{" "}
            <a href="/categories" className="text-primary underline">
              Crear una
            </a>
          </div>
        ) : (
          categories.map((cat) => {
            const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[
              cat.icon.charAt(0).toUpperCase() + cat.icon.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
            ] ?? Icons.Tag;
            return (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <IconComponent
                    className="h-4 w-4"
                    style={{ color: cat.color }}
                  />
                  {cat.name}
                </div>
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
}
```

**B.13. Página — `src/app/(dashboard)/categories/page.tsx`**

Página principal de categorías. Server Component que carga las categorías vía RPC y renderiza el listado agrupado.

```tsx
import { listCategories } from "@/core/services/category.service";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
  const { income, expense, deleted } = await listCategories();

  return <CategoriesClient income={income} expense={expense} deleted={deleted} />;
}
```

**B.14. Página (Client) — `src/app/(dashboard)/categories/CategoriesClient.tsx`**

Client Component que gestiona el estado de los modales (crear, editar, eliminar) y renderiza el listado agrupado.

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CategoryCard } from "@/components/categories/CategoryCard";
import { CategoryForm } from "@/components/forms/CategoryForm";
import { DeleteCategoryDialog } from "@/components/categories/DeleteCategoryDialog";
import type { CategoryWithMeta } from "@/core/models/category";

interface CategoriesClientProps {
  income: CategoryWithMeta[];
  expense: CategoryWithMeta[];
  deleted: CategoryWithMeta[];
}

export function CategoriesClient({ income, expense, deleted }: CategoriesClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithMeta | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithMeta | null>(null);

  function handleNew() {
    setEditingCategory(null);
    setFormOpen(true);
  }

  function handleEdit(category: CategoryWithMeta) {
    setEditingCategory(category);
    setFormOpen(true);
  }

  function handleDelete(category: CategoryWithMeta) {
    setDeletingCategory(category);
  }

  // Categorías disponibles para re-asignación (mismo tipo, activas, excluyendo la actual)
  const availableTargets = deletingCategory
    ? [...income, ...expense].filter(
        (c) =>
          c.id !== deletingCategory.id &&
          c.type === deletingCategory.type &&
          c.deleted_at === null
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorías</h1>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      {/* Ingresos */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-emerald-600">Ingresos</h2>
        {income.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay categorías de ingreso. Crea una para empezar a clasificar tus ingresos.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {income.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      {/* Gastos */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-rose-600">Gastos</h2>
        {expense.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay categorías de gasto. Crea una para empezar a clasificar tus gastos.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {expense.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      {/* Eliminadas (soft delete) */}
      {deleted.length > 0 && (
        <section className="space-y-3 opacity-60">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Categorías eliminadas (en historial)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deleted.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        </section>
      )}

      {/* Modales */}
      <CategoryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        category={editingCategory}
      />

      <DeleteCategoryDialog
        category={deletingCategory}
        availableTargets={availableTargets}
        onClose={() => setDeletingCategory(null)}
      />
    </div>
  );
}
```

**B.15. Navegación — Actualizar sidebar**

Añadir el enlace a `/categories` en el sidebar del dashboard (si existe un componente de navegación compartido). El ícono de navegación sugerido es `Tags` de lucide-react.

---

## 4. Estructura de Archivos del Módulo

```text
src/
├── app/(dashboard)/categories/
│   ├── page.tsx                    # Server Component — carga datos
│   ├── CategoriesClient.tsx        # Client Component — estado de modales
│   └── actions.ts                  # Server Actions (create, update, delete)
├── components/
│   ├── forms/
│   │   └── CategoryForm.tsx        # Modal crear/editar
│   ├── categories/
│   │   ├── CategoryCard.tsx        # Tarjeta individual
│   │   ├── CategorySelect.tsx      # Dropdown reutilizable para Módulo 3
│   │   └── DeleteCategoryDialog.tsx # Modal de eliminación (3 estrategias)
│   └── ui/
│       ├── ColorPicker.tsx         # Selector de color HEX
│       └── IconPicker.tsx          # Selector de ícono lucide + enlace a docs
└── core/
    ├── models/category.ts          # Esquemas Zod + tipos TypeScript
    ├── services/category.service.ts
    └── db/queries/category.queries.ts
```

---

## 5. Matriz de Cobertura de Historias de Usuario

| HU | Descripción | Track | Implementación |
|----|-------------|-------|----------------|
| HU-2.1 | Crear categorías con nombre, ícono y color | B | `CategoryForm` (modo crear) + `createCategoryAction` + `insertCategory` |
| HU-2.2 | Distinguir INCOME vs EXPENSE | B | Campo `type` en `CategoryForm` (Select) + agrupación en `CategoriesClient` |
| HU-2.3 | Editar categoría | B | `CategoryForm` (modo editar, `type` deshabilitado) + `updateCategoryAction` |
| HU-2.3 | Eliminar — hard delete | A+B | `hardDeleteCategory` (sin transacciones) |
| HU-2.3 | Eliminar — re-asignar | A+B | RPC `reassign_category_transactions` + `DeleteCategoryDialog` |
| HU-2.3 | Eliminar — soft delete | A+B | `softDeleteCategory` (set `deleted_at`) + `DeleteCategoryDialog` |

---

## 6. Notas de Diseño

### Renderizado dinámico de íconos lucide-react

El frontend renderiza íconos dinámicamente desde el nombre almacenado en BD. La convención de nombres de lucide-react usa `kebab-case` (ej. `shopping-bag`), pero los componentes de React usan `PascalCase` (ej. `ShoppingBag`). La conversión se hace en tiempo de ejecución:

```typescript
const iconName = "shopping-bag"; // valor desde BD
const pascalName = iconName
  .charAt(0).toUpperCase() + iconName.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
// => "ShoppingBag"
const IconComponent = (Icons as Record<string, React.ComponentType>)[pascalName] ?? Icons.Tag;
```

Si el ícono no existe en la librería, se usa `Tag` como fallback.

### Integridad referencial con transacciones

La tabla `transactions.category_id` ya tiene `on delete set null` (definido en el Módulo 1). Esto significa:
- **Hard delete:** Las transacciones asociadas quedan con `category_id = null`.
- **Re-asignar:** Las transacciones se mueven a la categoría destino antes de eliminar la origen.
- **Soft delete:** Las transacciones conservan `category_id` apuntando a la categoría eliminada. El frontend del Módulo 3 debe mostrar "(Categoría eliminada)" cuando `category.deleted_at IS NOT NULL`.

### Futura integración con Módulo 3 (Transacciones)

El componente `CategorySelect` está diseñado para ser reutilizado en el `TransactionForm` del Módulo 3. Recibe la lista de categorías activas filtradas por tipo y renderiza un dropdown con ícono + color + nombre.
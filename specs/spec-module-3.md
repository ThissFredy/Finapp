# Spec — Módulo 3: Transacciones (Ingresos, Gastos y Transferencias)

> **Proyecto:** FinApp — Sistema de Gestión Financiera Personal
> **Módulo:** 3 — Transacciones
> **Historias de Usuario:** HU-3.1, HU-3.2, HU-3.3
> **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL + Auth)
> **Fecha:** 2026-07-01
> **Prerrequisito:** Módulos 0, 1 y 2 implementados (BD migrada + frontend de cuentas y categorías funcional)

---

## 1. Resumen

Módulo motor de la aplicación para registrar movimientos de dinero. Permite registrar ingresos y gastos asociados a una cuenta y categoría, transferencias entre cuentas propias (sin afectar el balance neto global), y consultar un historial paginado con filtros por fecha, cuenta y categoría. Incluye además edición y eliminación de transacciones con reversión automática de saldos.

Cubre las siguientes historias de usuario:

- **HU-3.1:** Registrar un ingreso o gasto indicando monto, moneda de origen, cuenta afectada, categoría, fecha y una descripción opcional.
- **HU-3.2:** Registrar transferencias entre las propias cuentas sin que esto afecte el balance neto global.
- **HU-3.3:** Ver un historial paginado de transacciones con filtros por fecha, cuenta y categoría.

---

## 2. Asunciones Validadas

1. **Actualización automática de saldos:** Al registrar una transacción, el saldo de la cuenta afectada se actualiza automáticamente: un INGRESO suma al saldo de la cuenta, un GASTO lo resta, y una TRANSFERENCIA resta de la cuenta origen y suma a la cuenta destino. Esto ocurre de forma atómica en la base de datos (vía trigger), no en el frontend.
2. **Monto siempre positivo:** El usuario siempre ingresa el monto como un valor positivo. El signo lo determina el tipo de transacción (INGRESO suma, GASTO resta). No se permiten montos negativos ni iguales a cero.
3. **Validación de categoría según tipo:** Al registrar un INGRESO solo se pueden seleccionar categorías de tipo `INCOME`; al registrar un GASTO solo categorías `EXPENSE`. Las TRANSFERENCIAS no llevan categoría (`category_id` queda nulo).
4. **Solo cuentas activas:** Solo se pueden asociar transacciones a cuentas con estado `ACTIVE`. Las cuentas `INACTIVE` no aparecen en los selectores de nuevas transacciones (pero siguen visibles en el historial de transacciones pasadas).
5. **Transferencias entre cuentas propias y distintas:** El sistema valida que la cuenta origen y la cuenta destino pertenezcan al usuario autenticado y sean diferentes (no se permite transferir de una cuenta a sí misma).
6. **Transferencias multimoneda:** Se permite transferir entre cuentas con monedas distintas. En ese caso el usuario indica la tasa de conversión (`exchange_rate`) manualmente. Si ambas cuentas tienen la misma moneda, la tasa es 1.0 y el campo se oculta del formulario.
7. **Moneda de la transacción vs. moneda de la cuenta:** Una transacción de ingreso/gasto puede registrarse en una moneda distinta a la de la cuenta afectada. El monto se convierte a la moneda de la cuenta usando el `exchange_rate` que el usuario ingrese. Si la moneda coincide con la de la cuenta, la tasa es 1.0 y el campo no se muestra.
8. **Tasa desde la tabla `exchange_rates` (validado con el usuario):** Para este módulo no se consulta ninguna API externa de tipos de cambio. Cuando la moneda de la transacción difiere de la de la cuenta, el sistema consulta la tabla `exchange_rates` ya existente en el schema: si hay una tasa registrada para el par de monedas, se usa automáticamente (pre-llenando el campo, editable por el usuario); si no existe registro, el usuario la ingresa manualmente como respaldo. La automatización de tasas vía API externa queda fuera del alcance del Módulo 3.
9. **Edición y eliminación de transacciones (en alcance):** Aunque la HU-3.3 solo menciona "ver historial", el módulo también permite editar y eliminar transacciones existentes desde el historial, con la correspondiente reversión/ajuste automático de los saldos de las cuentas involucradas.
10. **Eliminación hard (no soft delete):** Las transacciones eliminadas se borran permanentemente (hard delete). No se agrega columna `deleted_at` a la tabla `transactions` (a diferencia de las categorías). La eliminación revierte el efecto sobre el saldo de las cuentas.
11. **Fecha de la transacción:** El usuario puede registrar transacciones con fecha pasada (ej. un gasto de hace tres días). No se permite registrar transacciones con fecha futura.
12. **Descripción opcional con límite:** La descripción es opcional, con un máximo de 500 caracteres.
13. **Paginación del historial:** El historial muestra 20 transacciones por página por defecto, ordenadas de la más reciente a la más antigua (descendente por fecha).
14. **Filtros del historial:** Los filtros disponibles son: rango de fechas (desde/hasta), cuenta específica y categoría específica. Los filtros son acumulables (AND) y opcionales (si no se selecciona ninguno, se listan todas las transacciones del usuario).
15. **Categoría eliminada en el historial:** Si una transacción está asociada a una categoría que fue eliminada con soft delete en el Módulo 2, el historial la muestra como "(Categoría eliminada)" con su color e ícono originales, pero no se puede volver a usar para nuevas transacciones.
16. **Sin límite de transacciones:** No existe un límite en la cantidad de transacciones que un usuario puede registrar.
17. **Transferencias no afectan el balance neto global:** Esto ya está cubierto por el diseño existente: el trigger `recalculate_user_balance` suma los saldos de todas las cuentas activas, y como una transferencia resta de una y suma a otra, el total se mantiene inalterado. No se requiere lógica adicional.
18. **Vista unificada de historial:** El historial muestra en una sola lista los tres tipos de transacción (INGRESOS, GASTOS y TRANSFERENCIAS), diferenciándolos visualmente con íconos y colores (verde para ingreso, rojo para gasto, gris/azul para transferencia).

---

## 3. Tracks de Implementación

El módulo se divide en dos tracks **secuenciales**: el Track A (migración de BD) debe completarse antes de iniciar el Track B (frontend).

### Track A — Backend (Supabase): Trigger de saldos y RPC de listado

Responsable de crear el trigger que mantiene los saldos de las cuentas sincronizados con las transacciones, y la función RPC para listar transacciones con filtros, paginación y joins.

> **Contexto:** La tabla `transactions` ya fue creada en la migración del Módulo 1 (sección A.4) con la siguiente estructura:
> ```sql
> create table public.transactions (
>   id uuid primary key default gen_random_uuid(),
>   user_id uuid not null references auth.users(id) on delete cascade,
>   account_id uuid references public.accounts(id) on delete restrict,
>   from_account_id uuid references public.accounts(id) on delete restrict,
>   to_account_id uuid references public.accounts(id) on delete restrict,
>   category_id uuid references public.categories(id) on delete set null,
>   type public.transaction_type not null,
>   amount decimal(18,2) not null,
>   currency public.preferred_currency not null default 'COP',
>   exchange_rate decimal(18,6) not null default 1.0,
>   date timestamptz not null default now(),
>   description text,
>   created_at timestamptz not null default now(),
>   updated_at timestamptz not null default now()
> );
> ```
> El enum `public.transaction_type` ('INCOME', 'EXPENSE', 'TRANSFER'), las políticas RLS (CRUD para el owner), el trigger `transactions_set_updated_at` y el trigger `recalculate_user_balance` (sobre `accounts`) ya existen. La tabla `exchange_rates` y `user_balances` también existen.

> **Semántica del `exchange_rate`:** El campo `transactions.amount` está expresado en `transactions.currency` (la "moneda de origen" de la HU-3.1). El `exchange_rate` es el factor que convierte ese monto a la moneda de la cuenta afectada:
> - **INGRESO/GASTO:** efecto sobre `account_id` = `amount * exchange_rate` (en la moneda de la cuenta).
> - **TRANSFERENCIA:** `amount` está en la moneda de la cuenta **origen**; `exchange_rate` convierte a la moneda de la cuenta **destino**. La cuenta origen pierde `amount`; la cuenta destino gana `amount * exchange_rate`.
> - Cuando la moneda de la transacción coincide con la de la cuenta, `exchange_rate = 1.0`.

**A.1. Migración — Función trigger `apply_transaction_balance()`**

Función `security definer` que, tras cualquier INSERT/UPDATE/DELETE en `transactions`, ajusta los saldos de las cuentas involucradas. En UPDATE revierte primero el efecto de los valores OLD y luego aplica el efecto de los valores NEW.

```sql
create or replace function public.apply_transaction_balance()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  ------------------------------------------------------------------
  -- DELETE: revertir el efecto original (signo opuesto)
  ------------------------------------------------------------------
  if TG_OP = 'DELETE' then
    if OLD.type = 'INCOME' then
      update public.accounts
        set balance = balance - (OLD.amount * OLD.exchange_rate)
        where id = OLD.account_id;
    elsif OLD.type = 'EXPENSE' then
      update public.accounts
        set balance = balance + (OLD.amount * OLD.exchange_rate)
        where id = OLD.account_id;
    elsif OLD.type = 'TRANSFER' then
      -- devolver a la cuenta origen lo que salió
      update public.accounts
        set balance = balance + OLD.amount
        where id = OLD.from_account_id;
      -- quitar de la cuenta destino lo que entró
      update public.accounts
        set balance = balance - (OLD.amount * OLD.exchange_rate)
        where id = OLD.to_account_id;
    end if;
    return OLD;
  end if;

  ------------------------------------------------------------------
  -- UPDATE: revertir efecto OLD primero
  ------------------------------------------------------------------
  if TG_OP = 'UPDATE' then
    if OLD.type = 'INCOME' then
      update public.accounts
        set balance = balance - (OLD.amount * OLD.exchange_rate)
        where id = OLD.account_id;
    elsif OLD.type = 'EXPENSE' then
      update public.accounts
        set balance = balance + (OLD.amount * OLD.exchange_rate)
        where id = OLD.account_id;
    elsif OLD.type = 'TRANSFER' then
      update public.accounts
        set balance = balance + OLD.amount
        where id = OLD.from_account_id;
      update public.accounts
        set balance = balance - (OLD.amount * OLD.exchange_rate)
        where id = OLD.to_account_id;
    end if;
  end if;

  ------------------------------------------------------------------
  -- INSERT o (UPDATE ya con OLD revertido): aplicar efecto NEW
  ------------------------------------------------------------------
  if NEW.type = 'INCOME' then
    update public.accounts
      set balance = balance + (NEW.amount * NEW.exchange_rate)
      where id = NEW.account_id;
  elsif NEW.type = 'EXPENSE' then
    update public.accounts
      set balance = balance - (NEW.amount * NEW.exchange_rate)
      where id = NEW.account_id;
  elsif NEW.type = 'TRANSFER' then
    update public.accounts
      set balance = balance - NEW.amount
      where id = NEW.from_account_id;
    update public.accounts
      set balance = balance + (NEW.amount * NEW.exchange_rate)
      where id = NEW.to_account_id;
  end if;

  return NEW;
end;
$$;

revoke execute on function public.apply_transaction_balance() from public;
revoke execute on function public.apply_transaction_balance() from anon;
revoke execute on function public.apply_transaction_balance() from authenticated;
```

> **Cadena de triggers:** Esta función actualiza `accounts.balance`. Como ya existe el trigger `accounts_balance_recalc_update` (after update on accounts) que ejecuta `recalculate_user_balance()`, la actualización del saldo de la cuenta dispara en cascada el recálculo de `user_balances.total_balance`. No se requiere lógica adicional para mantener el balance global sincronizado.

> **Seguridad:** La función es `security definer` con `search_path = public` para poder actualizar `accounts.balance` (que el cliente solo podría modificar vía RLS de update). La ejecución directa queda revocada para todos los roles; solo se invoca vía trigger.

**A.2. Migración — Triggers sobre `transactions`**

```sql
create trigger transactions_balance_after_insert
  after insert on public.transactions
  for each row execute function public.apply_transaction_balance();

create trigger transactions_balance_after_update
  after update on public.transactions
  for each row execute function public.apply_transaction_balance();

create trigger transactions_balance_after_delete
  after delete on public.transactions
  for each row execute function public.apply_transaction_balance();
```

> **Orden de triggers:** Existe el trigger `transactions_set_updated_at` (before update). Los nuevos triggers son `after`, por lo que se ejecutan tras la validación de constraints y la actualización de `updated_at`. No hay conflicto.

**A.3. Migración — Función RPC `get_transactions_paginated()`**

Retorna las transacciones del usuario autenticado con joins (nombre/moneda de cuenta, nombre/ícono/color/`deleted_at` de categoría), filtros opcionales acumulables (AND), orden descendente por fecha, y un `total_count` (repetido en cada fila vía window function) para que el frontend calcule la paginación.

```sql
create or replace function public.get_transactions_paginated(
  p_limit int default 20,
  p_offset int default 0,
  p_from_date date default null,
  p_to_date date default null,
  p_account_id uuid default null,
  p_category_id uuid default null
)
returns table (
  id uuid,
  user_id uuid,
  account_id uuid,
  from_account_id uuid,
  to_account_id uuid,
  category_id uuid,
  type public.transaction_type,
  amount decimal(18,2),
  currency public.preferred_currency,
  exchange_rate decimal(18,6),
  date timestamptz,
  description text,
  created_at timestamptz,
  updated_at timestamptz,
  account_name text,
  account_currency public.preferred_currency,
  from_account_name text,
  to_account_name text,
  category_name text,
  category_icon text,
  category_color text,
  category_deleted_at timestamptz,
  total_count bigint
)
language sql
security definer set search_path = public
as $$
  with filtered as (
    select
      t.id, t.user_id, t.account_id, t.from_account_id, t.to_account_id,
      t.category_id, t.type, t.amount, t.currency, t.exchange_rate,
      t.date, t.description, t.created_at, t.updated_at,
      a.name  as acc_name,
      a.currency as acc_currency,
      fa.name as from_acc_name,
      ta.name as to_acc_name,
      c.name  as cat_name,
      c.icon  as cat_icon,
      c.color as cat_color,
      c.deleted_at as cat_deleted_at
    from public.transactions t
    left join public.accounts a  on a.id  = t.account_id
    left join public.accounts fa on fa.id = t.from_account_id
    left join public.accounts ta on ta.id = t.to_account_id
    left join public.categories c on c.id = t.category_id
    where t.user_id = auth.uid()
      and (p_from_date is null or t.date >= p_from_date)
      and (p_to_date is null or t.date < (p_to_date + interval '1 day'))
      and (
        p_account_id is null
        or t.account_id = p_account_id
        or t.from_account_id = p_account_id
        or t.to_account_id = p_account_id
      )
      and (p_category_id is null or t.category_id = p_category_id)
  ),
  counted as (
    select f.*, count(*) over () as cnt
    from filtered f
  )
  select
    c.id, c.user_id, c.account_id, c.from_account_id, c.to_account_id,
    c.category_id, c.type, c.amount, c.currency, c.exchange_rate,
    c.date, c.description, c.created_at, c.updated_at,
    c.acc_name, c.acc_currency, c.from_acc_name, c.to_acc_name,
    c.cat_name, c.cat_icon, c.cat_color, c.cat_deleted_at,
    coalesce(c.cnt, 0) as total_count
  from counted c
  order by c.date desc, c.created_at desc
  limit p_limit offset p_offset;
$$;

revoke execute on function public.get_transactions_paginated(int, int, date, date, uuid, uuid) from public;
revoke execute on function public.get_transactions_paginated(int, int, date, date, uuid, uuid) from anon;
grant execute on function public.get_transactions_paginated(int, int, date, date, uuid, uuid) to authenticated;
```

> **Filtro por cuenta en transferencias:** Cuando se filtra por `p_account_id`, la condición cubre `account_id`, `from_account_id` y `to_account_id`, de modo que las transferencias que tocan esa cuenta también aparecen en el resultado.
>
> **Filtro por fecha:** `p_to_date` se trata como inclusivo del día completo usando `t.date < (p_to_date + interval '1 day')`.
>
> **`total_count`:** La window function `count(*) over ()` se calcula sobre el conjunto completo de `filtered` (antes de `LIMIT/OFFSET`), por lo que el total refleja el conteo sin paginar. Se repite en cada fila retornada; el frontend toma el valor de la primera fila (o 0 si no hay filas).

**A.4. Advisors**

Tras aplicar la migración, ejecutar `supabase_get_advisors` (security) para verificar:
- RLS sigue habilitada en `transactions`.
- Las nuevas funciones `security definer` (`apply_transaction_balance`, `get_transactions_paginated`) tienen `search_path` limitado a `public`.
- La ejecución directa de `apply_transaction_balance` está revocada (solo se invoca vía trigger).
- `get_transactions_paginated` solo es ejecutable por `authenticated`.

---

### Track B — Frontend (Next.js): Módulo 3

Responsable de la capa de presentación, modelos, servicios, server actions y componentes UI para la gestión de transacciones.

> **Prerrequisito:** Track A completado (migración aplicada en Supabase).

**B.1. Dependencias nuevas**

```bash
pnpm add date-fns
```

> `date-fns` se usa para formateo y manipulación de fechas en el historial y los filtros. `lucide-react` ya está instalado (Módulo 2).

**B.2. Componentes base shadcn/ui a instalar**

```bash
pnpm dlx shadcn@latest add tabs table pagination calendar
```

> `select`, `dialog`, `input`, `label`, `button`, `badge` ya fueron instalados en módulos anteriores.

**B.3. Modelos — `src/core/models/transaction.ts`**

```typescript
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
// Un único objeto con superRefine para validación condicional según `type`.
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

// --- TransactionFilters (historial paginado) ---
export const TransactionFiltersSchema = z.object({
  from_date: z.coerce.date().optional(),
  to_date: z.coerce.date().optional(),
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
```

> **Diseño — `superRefine` en lugar de `discriminatedUnion`:** Se usa un único objeto con validación condicional en `superRefine` porque `z.discriminatedUnion` no admite `.refine`/`.superRefine` sobre miembros individuales (devuelve `ZodEffects`, no `ZodObject`). Esto permite emitir errores específicos por campo (`account_id`, `category_id`, `from_account_id`, `to_account_id`) según el `type`, manteniendo el `flatten().fieldErrors` compatible con el patrón de server actions del proyecto.

**B.4. Queries — `src/core/db/queries/transaction.queries.ts`**

```typescript
import { createServerClientInstance } from "@/core/db/supabase.server";
import type {
  Transaction,
  TransactionWithDetails,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  PaginatedTransactions,
} from "@/core/models/transaction";

// Listar transacciones paginadas con filtros (vía RPC)
export async function selectTransactionsPaginated(
  filters: TransactionFilters
): Promise<PaginatedTransactions> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_transactions_paginated", {
    p_limit: filters.page_size,
    p_offset: (filters.page - 1) * filters.page_size,
    p_from_date: filters.from_date
      ? filters.from_date.toISOString().split("T")[0]
      : null,
    p_to_date: filters.to_date
      ? filters.to_date.toISOString().split("T")[0]
      : null,
    p_account_id: filters.account_id ?? null,
    p_category_id: filters.category_id ?? null,
  });
  if (error) throw error;
  const rows = (data ?? []) as TransactionWithDetails[];
  const total = rows.length > 0 ? rows[0].total_count : 0;
  return {
    items: rows,
    total_count: total,
    page: filters.page,
    page_size: filters.page_size,
  };
}

// Obtener una transacción por ID
export async function selectTransactionById(
  id: string
): Promise<Transaction | null> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Transaction;
}

// Consultar tasa de cambio desde la tabla exchange_rates (asunción 8)
export async function selectExchangeRate(
  from: string,
  to: string
): Promise<number | null> {
  if (from === to) return 1.0;
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", from)
    .eq("to_currency", to)
    .maybeSingle();
  if (error || !data) return null;
  return data.rate as number;
}

// Cargar todas las tasas disponibles (para pre-llenar el formulario en cliente)
export async function selectAllExchangeRates(): Promise<
  { from_currency: string; to_currency: string; rate: number }[]
> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("from_currency, to_currency, rate");
  if (error || !data) return [];
  return data as { from_currency: string; to_currency: string; rate: number }[];
}

// Construir el objeto fila a insertar/actualizar según el tipo
function buildRow(
  input: CreateTransactionInput | UpdateTransactionInput
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    exchange_rate: input.exchange_rate,
    date: input.date.toISOString(),
    description: input.description || null,
  };
  if (input.type === "INCOME" || input.type === "EXPENSE") {
    row.account_id = input.account_id;
    row.category_id = input.category_id;
    row.from_account_id = null;
    row.to_account_id = null;
  } else {
    row.account_id = null;
    row.category_id = null;
    row.from_account_id = input.from_account_id;
    row.to_account_id = input.to_account_id;
  }
  return row;
}

// Insertar una nueva transacción
export async function insertTransaction(
  input: CreateTransactionInput,
  userId: string
): Promise<Transaction> {
  const supabase = await createServerClientInstance();
  const row = buildRow(input);
  row.user_id = userId;
  const { data, error } = await supabase
    .from("transactions")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

// Actualizar una transacción existente
export async function updateTransactionRecord(
  id: string,
  input: UpdateTransactionInput
): Promise<Transaction> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("transactions")
    .update(buildRow(input))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

// Eliminar una transacción (hard delete)
export async function deleteTransactionRecord(id: string): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}
```

**B.5. Servicios — `src/core/services/transaction.service.ts`**

```typescript
import { createServerClientInstance } from "@/core/db/supabase.server";
import {
  selectTransactionsPaginated,
  selectTransactionById,
  selectExchangeRate,
  insertTransaction,
  updateTransactionRecord,
  deleteTransactionRecord,
} from "@/core/db/queries/transaction.queries";
import { selectAccountById } from "@/core/db/queries/account.queries";
import { selectActiveCategoriesByType } from "@/core/db/queries/category.queries";
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  PaginatedTransactions,
} from "@/core/models/transaction";

// Obtener el ID del usuario autenticado
async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");
  return user.id;
}

// Listar transacciones paginadas con filtros
export async function listTransactions(
  filters: TransactionFilters
): Promise<PaginatedTransactions> {
  return selectTransactionsPaginated(filters);
}

// Resolver la tasa de cambio: 1.0 si misma moneda, lookup en exchange_rates si difiere
export async function resolveExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  return selectExchangeRate(fromCurrency, toCurrency);
}

// Crear una transacción (validando cuenta activa y categoría coherente)
export async function createTransaction(
  input: CreateTransactionInput
): Promise<Transaction> {
  const userId = await getAuthenticatedUserId();
  await validateTransactionAccounts(input);
  return insertTransaction(input, userId);
}

// Editar una transacción
export async function updateTransaction(
  input: UpdateTransactionInput
): Promise<Transaction> {
  await validateTransactionAccounts(input);
  return updateTransactionRecord(input.id, input);
}

// Eliminar una transacción (hard delete — el trigger revierte el saldo)
export async function deleteTransaction(id: string): Promise<void> {
  return deleteTransactionRecord(id);
}

// Validar que las cuentas involucradas existen, pertenecen al usuario y están activas,
// y que la categoría (si aplica) es del tipo correcto.
async function validateTransactionAccounts(
  input: CreateTransactionInput | UpdateTransactionInput
): Promise<void> {
  if (input.type === "INCOME" || input.type === "EXPENSE") {
    const account = await selectAccountById(input.account_id!);
    if (!account) throw new Error("La cuenta seleccionada no existe");
    if (account.status !== "ACTIVE") {
      throw new Error("La cuenta seleccionada no está activa");
    }
    const cats = await selectActiveCategoriesByType(input.type);
    if (!cats.some((c) => c.id === input.category_id)) {
      throw new Error(
        "La categoría seleccionada no es válida para este tipo de transacción"
      );
    }
  } else {
    const from = await selectAccountById(input.from_account_id!);
    const to = await selectAccountById(input.to_account_id!);
    if (!from || !to) throw new Error("Una de las cuentas no existe");
    if (from.status !== "ACTIVE" || to.status !== "ACTIVE") {
      throw new Error("Ambas cuentas deben estar activas para transferir");
    }
  }
}
```

> **Doble validación:** La validación de cuentas/categoría se hace en el servicio (capa de aplicación) para dar mensajes claros al usuario. El trigger `apply_transaction_balance` opera sobre los IDs tal cual; si un ID no existe, el `UPDATE ... WHERE id = ...` simplemente no afecta filas (no falla), por lo que la validación previa en el servicio es la que protege la integridad.

**B.6. Server Actions — `src/app/(dashboard)/transactions/actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
  TransactionFiltersSchema,
} from "@/core/models/transaction";
import type { TransactionFilters } from "@/core/models/transaction";
import * as transactionService from "@/core/services/transaction.service";

function parseTransactionFormData(formData: FormData) {
  return {
    type: formData.get("type"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    exchange_rate: formData.get("exchange_rate") || undefined,
    date: formData.get("date"),
    description: formData.get("description") || undefined,
    account_id: formData.get("account_id") || undefined,
    from_account_id: formData.get("from_account_id") || undefined,
    to_account_id: formData.get("to_account_id") || undefined,
    category_id: formData.get("category_id") || undefined,
  };
}

export async function createTransactionAction(formData: FormData) {
  const parsed = CreateTransactionSchema.safeParse(
    parseTransactionFormData(formData)
  );
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await transactionService.createTransaction(parsed.data);
    revalidatePath("/transactions");
    revalidatePath("/"); // el dashboard muestra balances
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function updateTransactionAction(formData: FormData) {
  const parsed = UpdateTransactionSchema.safeParse({
    id: formData.get("id"),
    ...parseTransactionFormData(formData),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await transactionService.updateTransaction(parsed.data);
    revalidatePath("/transactions");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function deleteTransactionAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: { _form: ["ID de transacción requerido"] } };
  try {
    await transactionService.deleteTransaction(id);
    revalidatePath("/transactions");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function listTransactionsAction(filters: TransactionFilters) {
  const parsed = TransactionFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    return { data: await transactionService.listTransactions(parsed.data) };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}
```

> **`revalidatePath("/")`:** Las transacciones modifican `accounts.balance` y `user_balances` (vía trigger en cascada). Se revalida la ruta del dashboard para que los balances mostrados allí se actualicen sin necesidad de recargar.

**B.7. Componente — `src/components/forms/TransactionForm.tsx`**

Modal de creación/edición. Usa tabs para seleccionar el tipo (Ingreso/Gasto/Transferencia). El campo `exchange_rate` aparece solo cuando la moneda de la transacción difiere de la de la cuenta afectada; se auto-llena desde la tabla `exchange_rates` (pasada como prop) y permanece editable.

```tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategorySelect } from "@/components/categories/CategorySelect";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/app/(dashboard)/transactions/actions";
import type { Account, Currency } from "@/core/models/account";
import type { Category } from "@/core/models/category";
import type {
  TransactionType,
  TransactionWithDetails,
} from "@/core/models/transaction";

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  exchangeRates: ExchangeRateRow[];
  transaction?: TransactionWithDetails | null;
}

export function TransactionForm({
  open,
  onClose,
  accounts,
  incomeCategories,
  expenseCategories,
  exchangeRates,
  transaction,
}: TransactionFormProps) {
  const isEdit = !!transaction;
  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");

  const [type, setType] = useState<TransactionType>(
    transaction?.type ?? "EXPENSE"
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : ""
  );
  const [currency, setCurrency] = useState<Currency>(
    transaction?.currency ?? "COP"
  );
  const [exchangeRate, setExchangeRate] = useState<string>(
    transaction ? String(transaction.exchange_rate) : "1"
  );
  const [accountId, setAccountId] = useState(transaction?.account_id ?? "");
  const [fromAccountId, setFromAccountId] = useState(
    transaction?.from_account_id ?? ""
  );
  const [toAccountId, setToAccountId] = useState(
    transaction?.to_account_id ?? ""
  );
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [date, setDate] = useState(
    transaction
      ? transaction.date.split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  // Moneda de la cuenta afectada (para decidir si mostrar exchange_rate)
  const affectedAccountCurrency = useMemo<Currency | null>(() => {
    if (type === "TRANSFER") {
      const from = activeAccounts.find((a) => a.id === fromAccountId);
      return from ? from.currency : null;
    }
    const acc = activeAccounts.find((a) => a.id === accountId);
    return acc ? acc.currency : null;
  }, [type, accountId, fromAccountId, activeAccounts]);

  const showExchangeRate =
    affectedAccountCurrency !== null && currency !== affectedAccountCurrency;

  // Auto-llenar la tasa desde exchange_rates cuando cambia la moneda o la cuenta
  useEffect(() => {
    if (showExchangeRate && affectedAccountCurrency) {
      const found = exchangeRates.find(
        (r) =>
          r.from_currency === currency &&
          r.to_currency === affectedAccountCurrency
      );
      if (found) setExchangeRate(String(found.rate));
    } else if (!showExchangeRate) {
      setExchangeRate("1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, affectedAccountCurrency, showExchangeRate]);

  const categories =
    type === "INCOME"
      ? incomeCategories
      : type === "EXPENSE"
        ? expenseCategories
        : [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    formData.set("exchange_rate", exchangeRate);
    if (type === "INCOME" || type === "EXPENSE") {
      formData.set("category_id", categoryId);
    }
    if (isEdit && transaction) formData.set("id", transaction.id);

    const action = isEdit ? updateTransactionAction : createTransactionAction;
    const result = await action(formData);
    setPending(false);
    if (result.error) {
      setErrors(result.error as Record<string, string[]>);
    } else {
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar transacción" : "Nueva transacción"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <Tabs
            value={type}
            onValueChange={(v) => setType(v as TransactionType)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="INCOME">Ingreso</TabsTrigger>
              <TabsTrigger value="EXPENSE">Gasto</TabsTrigger>
              <TabsTrigger value="TRANSFER">Transferencia</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Monto + Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency">Moneda</Label>
              <Select
                name="currency"
                value={currency}
                onValueChange={(v) => setCurrency(v as Currency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Exchange rate condicional */}
          {showExchangeRate ? (
            <div className="space-y-1">
              <Label htmlFor="exchange_rate">
                Tasa de cambio ({currency} &rarr; {affectedAccountCurrency})
              </Label>
              <Input
                id="exchange_rate"
                name="exchange_rate"
                type="number"
                step="0.000001"
                min="0"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Tasa sugerida desde la tabla de conversiones. Puedes ajustarla
                si es necesario.
              </p>
            </div>
          ) : (
            <input type="hidden" name="exchange_rate" value="1" />
          )}

          {/* Cuentas según tipo */}
          {type === "TRANSFER" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Desde</Label>
                <Select
                  name="from_account_id"
                  value={fromAccountId}
                  onValueChange={setFromAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cuenta origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Hacia</Label>
                <Select
                  name="to_account_id"
                  value={toAccountId}
                  onValueChange={setToAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cuenta destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Cuenta</Label>
              <Select
                name="account_id"
                value={accountId}
                onValueChange={setAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Categoría (solo INCOME/EXPENSE) */}
          {type !== "TRANSFER" && (
            <div className="space-y-1">
              <Label>Categoría</Label>
              <CategorySelect
                value={categoryId}
                onChange={setCategoryId}
                categories={categories}
                type={type}
              />
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-1">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={date}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Ej. Compra en supermercado"
            />
          </div>

          {errors._form && (
            <p className="text-sm text-destructive">{errors._form[0]}</p>
          )}
          {Object.entries(errors)
            .filter(([k]) => k !== "_form")
            .map(([k, v]) => (
              <p key={k} className="text-sm text-destructive">
                {v[0]}
              </p>
            ))}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Guardando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

> **Reutilización del Módulo 2:** El selector de categoría usa `CategorySelect` (creado en el Módulo 2), que recibe la lista de categorías activas filtradas por tipo y renderiza ícono + color + nombre. Solo se ofrecen categorías con `deleted_at IS NULL`.

**B.8. Componente — `src/components/transactions/TransactionItem.tsx`**

Fila individual del historial. Diferencia visualmente los tres tipos con ícono y color, y muestra "(Categoría eliminada)" cuando `category_deleted_at` no es nulo.

```tsx
"use client";

import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/core/utils/currency";
import type { Currency } from "@/core/models/account";
import type { TransactionWithDetails } from "@/core/models/transaction";

interface TransactionItemProps {
  transaction: TransactionWithDetails;
  onEdit: (t: TransactionWithDetails) => void;
  onDelete: (t: TransactionWithDetails) => void;
}

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const {
    type,
    amount,
    currency,
    exchange_rate,
    date,
    description,
    account_name,
    from_account_name,
    to_account_name,
    category_name,
    category_color,
    category_deleted_at,
  } = transaction;

  const isIncome = type === "INCOME";
  const isExpense = type === "EXPENSE";
  const isTransfer = type === "TRANSFER";

  const Icon = isIncome
    ? ArrowDownCircle
    : isExpense
      ? ArrowUpCircle
      : ArrowLeftRight;

  const colorClass = isIncome
    ? "text-emerald-600"
    : isExpense
      ? "text-rose-600"
      : "text-muted-foreground";

  const sign = isIncome ? "+" : isExpense ? "-" : "";
  const accountLabel = isTransfer
    ? `${from_account_name} → ${to_account_name}`
    : account_name;

  const categoryLabel = category_deleted_at
    ? "(Categoría eliminada)"
    : category_name;

  const formattedAmount = formatCurrency(amount, currency as Currency);
  const convertedNote =
    !isTransfer && exchange_rate !== 1
      ? ` · equiv. ${formatCurrency(amount * exchange_rate, currency as Currency)} en ${account_name}`
      : "";

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: category_color ? `${category_color}22` : undefined,
          }}
        >
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {description || categoryLabel || "Transacción"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {accountLabel} · {new Date(date).toLocaleDateString("es-CO")}
            {convertedNote}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${colorClass}`}>
          {sign}
          {formattedAmount}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(transaction)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={() => onDelete(transaction)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

**B.9. Componente — `src/components/transactions/TransactionList.tsx`**

Lista paginada del historial. Renderiza `TransactionItem` por fila y controles de paginación.

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import type { TransactionWithDetails } from "@/core/models/transaction";

interface TransactionListProps {
  items: TransactionWithDetails[];
  total_count: number;
  page: number;
  page_size: number;
  onPageChange: (page: number) => void;
  onEdit: (t: TransactionWithDetails) => void;
  onDelete: (t: TransactionWithDetails) => void;
}

export function TransactionList({
  items,
  total_count,
  page,
  page_size,
  onPageChange,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const totalPages = Math.max(1, Math.ceil(total_count / page_size));

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No hay transacciones que coincidan con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="rounded-lg border bg-card px-4">
        {items.map((t) => (
          <TransactionItem
            key={t.id}
            transaction={t}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          Página {page} de {totalPages} · {total_count} transacciones
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**B.10. Componente — `src/components/transactions/TransactionFilters.tsx`**

Filtros del historial: rango de fechas, cuenta y categoría. Botón "Limpiar filtros".

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account } from "@/core/models/account";
import type { Category } from "@/core/models/category";

interface TransactionFiltersProps {
  accounts: Account[];
  categories: Category[];
  from_date: string;
  to_date: string;
  account_id: string;
  category_id: string;
  onChange: (filters: {
    from_date: string;
    to_date: string;
    account_id: string;
    category_id: string;
  }) => void;
}

export function TransactionFilters({
  accounts,
  categories,
  from_date,
  to_date,
  account_id,
  category_id,
  onChange,
}: TransactionFiltersProps) {
  const hasFilters = from_date || to_date || account_id || category_id;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor="from_date">Desde</Label>
        <Input
          id="from_date"
          type="date"
          value={from_date}
          onChange={(e) => onChange({ from_date: e.target.value, to_date, account_id, category_id })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to_date">Hasta</Label>
        <Input
          id="to_date"
          type="date"
          value={to_date}
          onChange={(e) => onChange({ from_date, to_date: e.target.value, account_id, category_id })}
        />
      </div>
      <div className="space-y-1">
        <Label>Cuenta</Label>
        <Select
          value={account_id || "all"}
          onValueChange={(v) =>
            onChange({ from_date, to_date, account_id: v === "all" ? "" : v, category_id })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las cuentas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Categoría</Label>
        <Select
          value={category_id || "all"}
          onValueChange={(v) =>
            onChange({ from_date, to_date, account_id, category_id: v === "all" ? "" : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <div className="flex items-end lg:col-span-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({ from_date: "", to_date: "", account_id: "", category_id: "" })
            }
          >
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
```

**B.11. Componente — `src/components/transactions/DeleteTransactionDialog.tsx`**

Confirmación de eliminación hard, con advertencia de reversión de saldo.

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteTransactionAction } from "@/app/(dashboard)/transactions/actions";
import type { TransactionWithDetails } from "@/core/models/transaction";

interface DeleteTransactionDialogProps {
  transaction: TransactionWithDetails | null;
  onClose: () => void;
}

export function DeleteTransactionDialog({
  transaction,
  onClose,
}: DeleteTransactionDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!transaction) return;
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", transaction.id);
    const result = await deleteTransactionAction(formData);
    setPending(false);
    if (result.error) {
      setError(result.error._form?.[0] ?? "Error al eliminar");
    } else {
      onClose();
    }
  }

  return (
    <Dialog open={!!transaction} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar transacción</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. La transacción se eliminará
            permanentemente y se <strong>revertirá su efecto</strong> sobre el
            saldo de la cuenta involucrada.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**B.12. Página — `src/app/(dashboard)/transactions/page.tsx`**

Server Component que carga la primera página de transacciones, las cuentas, las categorías y las tasas para los selectores y el formulario.

```tsx
import { listTransactions } from "@/core/services/transaction.service";
import { getAccountsWithMeta } from "@/core/services/account.service";
import { listCategories } from "@/core/services/category.service";
import { selectAllExchangeRates } from "@/core/db/queries/transaction.queries";
import { TransactionsClient } from "./TransactionsClient";

export default async function TransactionsPage() {
  const [{ items, total_count, page, page_size }, accounts, grouped, exchangeRates] =
    await Promise.all([
      listTransactions({ page: 1, page_size: 20 }),
      getAccountsWithMeta(),
      listCategories(),
      selectAllExchangeRates(),
    ]);

  return (
    <TransactionsClient
      initialItems={items}
      initialTotal={total_count}
      initialPage={page}
      initialPageSize={page_size}
      accounts={accounts}
      incomeCategories={grouped.income}
      expenseCategories={grouped.expense}
      allCategories={[...grouped.income, ...grouped.expense]}
      exchangeRates={exchangeRates}
    />
  );
}
```

**B.13. Página (Client) — `src/app/(dashboard)/transactions/TransactionsClient.tsx`**

Client Component que gestiona el estado de filtros, paginación y modales. Al cambiar filtros o página, invoca `listTransactionsAction` para refrescar la lista.

```tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { DeleteTransactionDialog } from "@/components/transactions/DeleteTransactionDialog";
import { listTransactionsAction } from "@/app/(dashboard)/transactions/actions";
import type { Account } from "@/core/models/account";
import type { Category } from "@/core/models/category";
import type { TransactionWithDetails } from "@/core/models/transaction";

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface TransactionsClientProps {
  initialItems: TransactionWithDetails[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  accounts: Account[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  allCategories: Category[];
  exchangeRates: ExchangeRateRow[];
}

export function TransactionsClient({
  initialItems,
  initialTotal,
  initialPage,
  initialPageSize,
  accounts,
  incomeCategories,
  expenseCategories,
  allCategories,
  exchangeRates,
}: TransactionsClientProps) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    account_id: "",
    category_id: "",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionWithDetails | null>(null);
  const [deleting, setDeleting] = useState<TransactionWithDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(
    async (nextPage: number, nextFilters = filters) => {
      setLoading(true);
      const result = await listTransactionsAction({
        from_date: nextFilters.from_date || undefined,
        to_date: nextFilters.to_date || undefined,
        account_id: nextFilters.account_id || undefined,
        category_id: nextFilters.category_id || undefined,
        page: nextPage,
        page_size: pageSize,
      });
      setLoading(false);
      if (result.data) {
        setItems(result.data.items);
        setTotal(result.data.total_count);
        setPage(result.data.page);
      }
    },
    [filters, pageSize]
  );

  function handleFiltersChange(next: typeof filters) {
    setFilters(next);
    refresh(1, next);
  }

  function handlePageChange(nextPage: number) {
    refresh(nextPage);
  }

  function handleNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(t: TransactionWithDetails) {
    setEditing(t);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transacciones</h1>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva transacción
        </Button>
      </div>

      <TransactionFilters
        accounts={accounts}
        categories={allCategories}
        from_date={filters.from_date}
        to_date={filters.to_date}
        account_id={filters.account_id}
        category_id={filters.category_id}
        onChange={handleFiltersChange}
      />

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Cargando...
        </p>
      ) : (
        <TransactionList
          items={items}
          total_count={total}
          page={page}
          page_size={pageSize}
          onPageChange={handlePageChange}
          onEdit={handleEdit}
          onDelete={setDeleting}
        />
      )}

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        accounts={accounts}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        exchangeRates={exchangeRates}
        transaction={editing}
      />

      <DeleteTransactionDialog
        transaction={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
```

> **Refresco tras crear/editar/eliminar:** Las server actions invocan `revalidatePath("/transactions")`, lo que provoca que el Server Component `page.tsx` se vuelva a ejecutar y reenvíe `initialItems` actualizados al cliente. El estado local (`items`) se reinicia con los datos frescos. Para los cambios de filtros/paginación sin mutación, se usa `listTransactionsAction` directamente desde el cliente.

**B.14. Navegación — Actualizar sidebar**

Añadir el enlace a `/transactions` en el sidebar del dashboard (si existe un componente de navegación compartido). El ícono de navegación sugerido es `ArrowLeftRight` de lucide-react.

---

## 4. Estructura de Archivos del Módulo

```text
src/
├── app/(dashboard)/transactions/
│   ├── page.tsx                    # Server Component — carga inicial
│   ├── TransactionsClient.tsx      # Client Component — estado filtros/paginación/modales
│   └── actions.ts                  # Server Actions (create, update, delete, list)
├── components/
│   ├── forms/
│   │   └── TransactionForm.tsx     # Modal crear/editar (tabs Ingreso/Gasto/Transferencia)
│   └── transactions/
│       ├── TransactionList.tsx     # Lista paginada del historial
│       ├── TransactionItem.tsx     # Fila individual (ícono/color por tipo)
│       ├── TransactionFilters.tsx  # Filtros fecha/cuenta/categoría
│       └── DeleteTransactionDialog.tsx # Confirmación de eliminación hard
└── core/
    ├── models/transaction.ts       # Esquemas Zod + tipos TypeScript
    ├── services/transaction.service.ts
    └── db/queries/transaction.queries.ts
```

---

## 5. Matriz de Cobertura de Historias de Usuario

| HU | Descripción | Track | Implementación |
|----|-------------|-------|----------------|
| HU-3.1 | Registrar ingreso/gasto (monto, moneda, cuenta, categoría, fecha, descripción) | A+B | `TransactionForm` (tabs Ingreso/Gasto) + `createTransactionAction` + `insertTransaction` + trigger `apply_transaction_balance` |
| HU-3.1 | Moneda de origen con conversión | A+B | Campo `currency` + `exchange_rate` (auto desde `exchange_rates`) + efecto `amount * exchange_rate` en el trigger |
| HU-3.2 | Transferencia entre cuentas propias | A+B | `TransactionForm` (tab Transferencia) + validación `from ≠ to` en `superRefine` + trigger (resta origen / suma destino) |
| HU-3.2 | Sin afectar balance neto global | A | El trigger `recalculate_user_balance` (existente) suma saldos de todas las cuentas; la transferencia mueve dinero entre ellas sin cambiar el total |
| HU-3.3 | Historial paginado | A+B | RPC `get_transactions_paginated` + `TransactionList` (paginación anterior/siguiente) |
| HU-3.3 | Filtros por fecha, cuenta y categoría | A+B | Parámetros `p_from_date/p_to_date/p_account_id/p_category_id` en el RPC + `TransactionFilters` |
| (ext) | Editar transacción | A+B | `TransactionForm` (modo editar) + `updateTransactionAction` + trigger (revierte OLD, aplica NEW) |
| (ext) | Eliminar transacción | A+B | `DeleteTransactionDialog` + `deleteTransactionAction` + trigger (revierte efecto) |
| (ext) | Categoría eliminada en historial | A+B | Join `category_deleted_at` en el RPC + "(Categoría eliminada)" en `TransactionItem` |

---

## 6. Notas de Diseño

### Semántica del `exchange_rate` por tipo de transacción

El campo `exchange_rate` tiene una semántica ligeramente distinta según el tipo, pero siempre convierte el `amount` (en `transactions.currency`) a la moneda de la cuenta **receptora del efecto**:

- **INGRESO/GASTO:** `exchange_rate` convierte de `transactions.currency` a la moneda de `account_id`. Efecto sobre la cuenta = `amount * exchange_rate`.
- **TRANSFERENCIA:** `amount` está en la moneda de la cuenta **origen** (que coincide con `transactions.currency`). `exchange_rate` convierte a la moneda de la cuenta **destino**. La cuenta origen pierde `amount` (sin conversión, misma moneda); la cuenta destino gana `amount * exchange_rate`.

Cuando la moneda de la transacción coincide con la de la cuenta afectada, `exchange_rate = 1.0` y el campo se oculta del formulario.

### Cadena de triggers y consistencia de saldos

```
INSERT/UPDATE/DELETE en transactions
        │
        ▼
apply_transaction_balance()        ← nuevo trigger (este módulo)
  actualiza accounts.balance
        │
        ▼
recalculate_user_balance()         ← trigger existente (Módulo 1)
  recalcula user_balances.total_balance
```

Toda mutación de una transacción deja los saldos de las cuentas y el balance global del usuario sincronizados de forma atómica (dentro de la misma transacción SQL). No hay ventana de inconsistencia.

### Reversión en UPDATE

Al editar una transacción, el trigger `apply_transaction_balance` revierte primero el efecto de los valores **OLD** (usando el monto, tasa, tipo y cuentas anteriores) y luego aplica el efecto de los valores **NEW**. Esto permite cambiar cualquier campo (monto, cuenta, tipo, tasa) sin dejar saldos huérfanos. Si el usuario cambia el `type` (ej. de GASTO a TRANSFERENCIA), la reversión usa el tipo antiguo y la aplicación usa el tipo nuevo.

### Resolución de tasa desde `exchange_rates` (asunción 8)

El formulario recibe todas las tasas disponibles (`selectAllExchangeRates`) como prop. Cuando el usuario selecciona una moneda de transacción distinta a la de la cuenta afectada, un `useEffect` busca el par `from_currency → to_currency` en el arreglo y pre-llena el campo `exchange_rate`. El campo permanece **editable** para que el usuario pueda ajustarlo. Si no existe un registro para el par, el campo queda vacío y el usuario debe ingresarlo manualmente. No se consulta ninguna API externa en este módulo.

### Categoría eliminada (soft delete del Módulo 2) en el historial

El RPC `get_transactions_paginated` hace un `LEFT JOIN` con `categories` e incluye `category_deleted_at`. Si la categoría fue eliminada con soft delete en el Módulo 2, las transacciones históricas conservan la referencia (`category_id` no es nulo) y el frontend muestra "(Categoría eliminada)" con su color e ícono originales. Al crear/editar transacciones, el `CategorySelect` solo ofrece categorías con `deleted_at IS NULL` (filtro aplicado en `selectActiveCategoriesByType`).

### Filtro por cuenta en transferencias

El filtro `p_account_id` del RPC cubre `account_id`, `from_account_id` y `to_account_id`. Así, al filtrar por una cuenta, aparecen tanto los ingresos/gastos registrados en ella como las transferencias donde fue origen o destino.

### Paginación y `total_count`

La window function `count(*) over ()` calcula el total de filas que cumplen los filtros (sin `LIMIT/OFFSET`). El valor se repite en cada fila retornada por el RPC; el frontend lo toma de la primera fila (o 0 si no hay resultados). El tamaño de página por defecto es 20, configurable hasta 100.

### Futura integración con Módulo 4 (Suscripciones)

El Módulo 4 (HU-4.3) requiere un botón "Registrar pago de este mes" que genere automáticamente una transacción de gasto. Esa integración deberá invocar `createTransaction` (o `insertTransaction` directamente) con `type: "EXPENSE"`, el `category_id` y `account_id` de la suscripción, dejando que el trigger `apply_transaction_balance` actualice el saldo. El diseño de este módulo (servicio + trigger) ya lo permite sin cambios adicionales.

# Spec — Módulo 1: Gestión de Cuentas (Cajas/Bancos)

> **Proyecto:** FinApp — Sistema de Gestión Financiera Personal
> **Módulo:** 1 — Gestión de Cuentas (Cajas/Bancos)
> **Historias de Usuario:** HU-1.1, HU-1.2, HU-1.3
> **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL + Auth)
> **Fecha:** 2026-06-22
> **Prerrequisito:** Módulo 0 implementado (Auth + profiles + middleware)

---

## 1. Resumen

Módulo de gestión de cuentas que permite al usuario reflejar dónde está su dinero (efectivo, cuentas bancarias, tarjetas de crédito). Incluye creación, edición, activación/desactivación y eliminación de cuentas, así como el cálculo del balance total convertido a la moneda principal del usuario.

**Prerrequisito crítico:** Antes del desarrollo frontend, se migra **completa** la base de datos a Supabase —todas las tablas de los módulos 1 a 4, tablas de soporte (`exchange_rates`, `user_balances`), enums, constraints, triggers y políticas RLS— para que la base quede lista para los módulos futuros.

Cubre las siguientes historias de usuario:

- **HU-1.1:** Crear cuentas especificando nombre, tipo y saldo inicial.
- **HU-1.2:** Editar o desactivar una cuenta que ya no se utiliza.
- **HU-1.3:** Ver el balance total sumado de todas las cuentas, convertido a la moneda principal.

---

## 2. Asunciones Validadas

1. Las cuentas solo pueden crearse en una de las tres monedas del enum existente `preferred_currency`: **COP, USD o EUR** (consistencia con el perfil del usuario).
2. El saldo inicial se guarda directamente en el campo `balance` de la cuenta al crearla. **No** se genera una transacción automática en el Módulo 3 para justificarlo. El balance posterior solo cambia mediante transacciones del Módulo 3.
3. **"Desactivar" = soft delete (`status = INACTIVE`):** La cuenta conserva todo su historial de transacciones, no aparece en los selectores para nuevas transacciones (Módulo 3), no contribuye al balance total (HU-1.3), aparece en el listado con un indicador visual de "inactiva" y puede ser reactivada en cualquier momento.
4. **Campos editables:** Al editar una cuenta se pueden modificar: nombre, tipo y moneda. El saldo **no es editable** directamente si la cuenta tiene transacciones asociadas. Si la cuenta no tiene transacciones, el saldo inicial sí es editable.
5. **Semántica de saldo por tipo de cuenta:** DEBIT y CASH → saldo positivo = dinero disponible. CREDIT → saldo negativo = deuda pendiente; saldo positivo = saldo a favor. En el balance total, las deudas (saldos negativos) se restan del patrimonio neto.
6. **Saldo inicial negativo permitido** para DEBIT y CREDIT (ej. sobregiro o deuda existente). **No permitido** para CASH (constraint en BD + validación Zod).
7. **Nombre de cuenta único por usuario** (constraint único `user_id + name` en la base de datos).
8. **Sin límite de cuentas** por usuario.
9. **Conversión de moneda para el balance total (HU-1.3):** El balance total se calcula en la `preferred_currency` del perfil del usuario. Para las cuentas en otra moneda, el sistema obtiene la tasa de cambio desde una API externa gratuita, cacheada en la tabla `exchange_rates`. Si no hay tasa disponible, se usa 1:1 como fallback.
10. **Eliminación permanente prohibida si hay transacciones:** Una cuenta con transacciones asociadas no puede eliminarse, solo desactivarse. Una cuenta sin transacciones sí puede eliminarse permanentemente (acción destructiva con confirmación).
11. **Vista de listado de cuentas:** La página `/accounts` muestra el balance total convertido a la moneda principal en la parte superior, seguido de un listado en forma de tarjetas (una por cuenta) con: nombre, tipo (con ícono), moneda, saldo en moneda original y estado (activa/inactiva). Las cuentas activas aparecen primero, ordenadas alfabéticamente; las inactivas al final. Botón "Nueva cuenta" y acciones por cuenta (editar, desactivar/activar, eliminar si aplica).
12. **Formulario de cuenta:** Campos: nombre (texto, requerido, máx. 50 caracteres), tipo (select: Débito/Crédito/Efectivo), moneda (select: COP/USD/EUR), saldo inicial (numérico, requerido, puede ser negativo según tipo). Sin campo de descripción.
13. **Balance total precalculado con triggers:** Campo `total_balance` en tabla `user_balances`, actualizado automáticamente por un trigger de base de datos tras cada INSERT/UPDATE/DELETE sobre `accounts`. El cálculo suma los saldos de las cuentas activas, convirtiendo a la `preferred_currency` del usuario mediante las tasas cacheadas en `exchange_rates`.

---

## 3. Tracks de Implementación

El módulo se divide en dos tracks **secuenciales**: el Track A (migración de BD) debe completarse antes de iniciar el Track B (frontend), según requisito explícito del usuario.

### Track A — Backend (Supabase): Migración Completa de Base de Datos

Responsable de crear toda la estructura de base de datos para los módulos 1 a 4, tablas de soporte, triggers y políticas RLS.

**A.1. Migración — Enums nuevos**

```sql
create type public.account_type as enum ('DEBIT', 'CREDIT', 'CASH');
create type public.account_status as enum ('ACTIVE', 'INACTIVE');
create type public.category_type as enum ('INCOME', 'EXPENSE');
create type public.transaction_type as enum ('INCOME', 'EXPENSE', 'TRANSFER');
create type public.billing_cycle as enum ('MONTHLY', 'YEARLY');
```

> **Nota:** El enum `public.preferred_currency` ('COP', 'USD', 'EUR') ya existe desde la migración del Módulo 0. No se recrea.

**A.2. Migración — Tabla `public.accounts`**

```sql
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.account_type not null,
  status public.account_status not null default 'ACTIVE',
  balance decimal(18,2) not null default 0,
  currency public.preferred_currency not null default 'COP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

-- Constraint: CASH no puede tener saldo negativo
alter table public.accounts
  add constraint chk_cash_non_negative
  check (type <> 'CASH' or balance >= 0);

-- Índices
create index idx_accounts_user_id on public.accounts(user_id);
create index idx_accounts_user_status on public.accounts(user_id, status);
```

**A.3. Migración — Tabla `public.categories`**

```sql
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.category_type not null,
  icon text,
  color text not null default '#6B7280',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_categories_user_id on public.categories(user_id);
```

> **Nota:** El campo `icon` no aparece en el modelo de datos del README pero la HU-2.1 lo menciona explícitamente ("definiendo un nombre, un ícono y un color"). Se incluye como `text` nullable.

**A.4. Migración — Tabla `public.transactions`**

```sql
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete restrict,
  from_account_id uuid references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  type public.transaction_type not null,
  amount decimal(18,2) not null,
  currency public.preferred_currency not null default 'COP',
  exchange_rate decimal(18,6) not null default 1.0,
  date timestamptz not null default now(),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_user_date on public.transactions(user_id, date desc);
create index idx_transactions_account_id on public.transactions(account_id);
create index idx_transactions_from_account on public.transactions(from_account_id);
create index idx_transactions_to_account on public.transactions(to_account_id);
```

> **Nota:** Se añaden `from_account_id` y `to_account_id` (nullable) para soportar transferencias entre cuentas (HU-3.2). Para transacciones INCOME/EXPENSE se usa `account_id`; para TRANSFER se usan `from_account_id` y `to_account_id`, y `account_id` es null. El constraint `on delete restrict` impide eliminar cuentas con transacciones a nivel de BD (refuerza la asunción #10).

**A.5. Migración — Tabla `public.subscriptions`**

```sql
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount decimal(18,2) not null,
  currency public.preferred_currency not null default 'COP',
  billing_cycle public.billing_cycle not null default 'MONTHLY',
  next_billing_date date not null,
  category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_next_billing on public.subscriptions(user_id, next_billing_date);
```

**A.6. Migración — Tabla de soporte `public.exchange_rates`**

```sql
create table public.exchange_rates (
  from_currency public.preferred_currency not null,
  to_currency public.preferred_currency not null,
  rate decimal(18,6) not null,
  fetched_at timestamptz not null default now(),
  primary key (from_currency, to_currency)
);
```

> **Diseño:** Clave primaria compuesta `(from_currency, to_currency)` para permitir upserts limpios. No tiene `user_id` —es datos de referencia globales. Se popula mediante un route handler cron (ver A.11).

**A.7. Migración — Tabla de soporte `public.user_balances`**

```sql
create table public.user_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_balance decimal(18,2) not null default 0,
  currency public.preferred_currency not null default 'COP',
  updated_at timestamptz not null default now()
);
```

> **Diseño:** Una fila por usuario. Se actualiza automáticamente por el trigger `recalculate_user_balance` (ver A.10). No tiene `created_at` —la fila se crea en el primer upsert del trigger.

**A.8. Migración — Habilitar RLS en todas las tablas nuevas**

```sql
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.user_balances enable row level security;
```

**A.9. Migración — Políticas RLS**

```sql
-- accounts: CRUD completo para el propietario
create policy "accounts_select_own"
  on public.accounts for select
  using (user_id = auth.uid());

create policy "accounts_insert_own"
  on public.accounts for insert
  with check (user_id = auth.uid());

create policy "accounts_update_own"
  on public.accounts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "accounts_delete_own"
  on public.accounts for delete
  using (user_id = auth.uid());

-- categories: CRUD completo para el propietario
create policy "categories_select_own"
  on public.categories for select
  using (user_id = auth.uid());

create policy "categories_insert_own"
  on public.categories for insert
  with check (user_id = auth.uid());

create policy "categories_update_own"
  on public.categories for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "categories_delete_own"
  on public.categories for delete
  using (user_id = auth.uid());

-- transactions: CRUD completo para el propietario
create policy "transactions_select_own"
  on public.transactions for select
  using (user_id = auth.uid());

create policy "transactions_insert_own"
  on public.transactions for insert
  with check (user_id = auth.uid());

create policy "transactions_update_own"
  on public.transactions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "transactions_delete_own"
  on public.transactions for delete
  using (user_id = auth.uid());

-- subscriptions: CRUD completo para el propietario
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (user_id = auth.uid());

create policy "subscriptions_insert_own"
  on public.subscriptions for insert
  with check (user_id = auth.uid());

create policy "subscriptions_update_own"
  on public.subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "subscriptions_delete_own"
  on public.subscriptions for delete
  using (user_id = auth.uid());

-- exchange_rates: solo lectura para usuarios autenticados
-- (INSERT/UPDATE/DELETE se gestiona vía service role key en el cron)
create policy "exchange_rates_select_authenticated"
  on public.exchange_rates for select
  using (auth.uid() is not null);

-- user_balances: solo lectura para el propietario
-- (INSERT/UPDATE se gestiona vía trigger security definer)
create policy "user_balances_select_own"
  on public.user_balances for select
  using (user_id = auth.uid());
```

**A.10. Migración — Función RPC `get_accounts_with_meta`**

Función que retorna las cuentas del usuario autenticado con un flag `has_transactions` para que el frontend sepa si puede mostrar la opción de eliminación permanente.

```sql
create or replace function public.get_accounts_with_meta()
returns table (
  id uuid,
  user_id uuid,
  name text,
  type public.account_type,
  status public.account_status,
  balance decimal(18,2),
  currency public.preferred_currency,
  created_at timestamptz,
  updated_at timestamptz,
  has_transactions boolean
)
language sql
security definer set search_path = public
as $$
  select
    a.id, a.user_id, a.name, a.type, a.status, a.balance, a.currency,
    a.created_at, a.updated_at,
    exists(
      select 1 from public.transactions t
      where t.user_id = auth.uid()
        and (t.account_id = a.id
             or t.from_account_id = a.id
             or t.to_account_id = a.id)
    ) as has_transactions
  from public.accounts a
  where a.user_id = auth.uid()
  order by (a.status = 'ACTIVE') desc, a.name asc;
$$;

revoke execute on function public.get_accounts_with_meta() from public;
grant execute on function public.get_accounts_with_meta() to authenticated;
```

**A.11. Migración — Trigger `updated_at` automático**

Función compartida que actualiza `updated_at` en cualquier UPDATE. Se aplica a `accounts`, `categories`, `transactions` y `subscriptions`.

```sql
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.update_updated_at();

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.update_updated_at();

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.update_updated_at();

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.update_updated_at();
```

**A.12. Migración — Trigger `recalculate_user_balance`**

Función que recalcula el balance total del usuario tras cada cambio en `accounts`. Suma los saldos de las cuentas activas, convirtiendo a la `preferred_currency` del usuario mediante las tasas en `exchange_rates`.

```sql
create or replace function public.recalculate_user_balance()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_uuid uuid;
  pref_currency public.preferred_currency;
  total decimal(18,2) := 0;
  acc_balance decimal(18,2);
  acc_currency public.preferred_currency;
  conv_rate decimal(18,6);
begin
  -- Determinar el user_id según la operación
  if TG_OP = 'DELETE' then
    user_uuid := OLD.user_id;
  else
    user_uuid := NEW.user_id;
  end if;

  -- Obtener la moneda preferida del usuario
  select preferred_currency into pref_currency
  from public.profiles
  where id = user_uuid;

  if pref_currency is null then
    pref_currency := 'COP';
  end if;

  -- Sumar saldos de cuentas activas, convirtiendo a la moneda preferida
  for acc_balance, acc_currency in
    select balance, currency from public.accounts
    where user_id = user_uuid and status = 'ACTIVE'
  loop
    if acc_currency = pref_currency then
      total := total + acc_balance;
    else
      select rate into conv_rate
      from public.exchange_rates
      where from_currency = acc_currency and to_currency = pref_currency;
      if conv_rate is null then
        -- Fallback: usar 1:1 si no hay tasa disponible
        total := total + acc_balance;
      else
        total := total + (acc_balance * conv_rate);
      end if;
    end if;
  end loop;

  -- Upsert en user_balances
  insert into public.user_balances (user_id, total_balance, currency, updated_at)
  values (user_uuid, total, pref_currency, now())
  on conflict (user_id) do update
  set total_balance = excluded.total_balance,
      currency = excluded.currency,
      updated_at = excluded.updated_at;

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

create trigger accounts_balance_recalc_insert
  after insert on public.accounts
  for each row execute function public.recalculate_user_balance();

create trigger accounts_balance_recalc_update
  after update on public.accounts
  for each row execute function public.recalculate_user_balance();

create trigger accounts_balance_recalc_delete
  after delete on public.accounts
  for each row execute function public.recalculate_user_balance();
```

> **Nota futura:** Cuando se implemente el Módulo 3 (Transacciones), se añadirá un trigger sobre `transactions` que actualice el `balance` de la cuenta afectada, lo que a su vez disparará `recalculate_user_balance` mediante el trigger `accounts_balance_recalc_update`. Cuando se implemente la edición del perfil (cambio de `preferred_currency`), se añadirá un trigger sobre `profiles` que invoque `recalculate_user_balance`.

**A.13. Route Handler — Sincronización de tasas de cambio (`/api/cron/sync-rates`)**

Route Handler que se ejecuta diariamente vía Vercel Cron, consulta una API gratuita de tasas y hace upsert en `exchange_rates`.

```typescript
// src/app/api/cron/sync-rates/route.ts
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  // Verificar autorización (Vercel Cron envía CRON_SECRET)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch tasas desde API gratuita (open.er-api.com, sin API key)
  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  const data = await response.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const currencies = ["COP", "USD", "EUR"] as const;
  const rates: Array<{
    from_currency: string;
    to_currency: string;
    rate: number;
    fetched_at: string;
  }> = [];

  for (const from of currencies) {
    for (const to of currencies) {
      if (from === to) {
        rates.push({ from_currency: from, to_currency: to, rate: 1, fetched_at: new Date().toISOString() });
      } else {
        const fromRate = from === "USD" ? 1 : data.rates[from];
        const toRate = to === "USD" ? 1 : data.rates[to];
        rates.push({ from_currency: from, to_currency: to, rate: toRate / fromRate, fetched_at: new Date().toISOString() });
      }
    }
  }

  const { error } = await supabase
    .from("exchange_rates")
    .upsert(rates, { onConflict: "from_currency,to_currency" });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
```

Configuración de Vercel Cron en `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-rates",
      "schedule": "0 9 * * *"
    }
  ]
}
```

> **Variable de entorno nueva:** `CRON_SECRET` — string aleatorio para autorizar el cron.

**A.14. Advisors**

Tras aplicar la migración, ejecutar `supabase_get_advisors` (security) para verificar:
- RLS habilitada en todas las tablas.
- Sin políticas permissivas excesivas.
- Funciones `security definer` con `search_path` limitado a `public`.

---

### Track B — Frontend (Next.js): Módulo 1

Responsable de la capa de presentación, modelos, servicios, server actions y componentes UI para la gestión de cuentas.

> **Prerrequisito:** Track A completado (migración aplicada en Supabase).

**B.1. Componentes base shadcn/ui a instalar**

```bash
pnpm dlx shadcn@latest add card input select label dialog badge
```

**B.2. Modelos — `src/core/models/account.ts`**

```typescript
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
  .refine(
    (data) => data.type !== "CASH" || data.initial_balance >= 0,
    {
      message: "Las cuentas de efectivo no pueden tener saldo negativo",
      path: ["initial_balance"],
    }
  );

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
      !data.initial_balance ||
      data.type !== "CASH" ||
      data.initial_balance >= 0,
    {
      message: "Las cuentas de efectivo no pueden tener saldo negativo",
      path: ["initial_balance"],
    }
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
```

**B.3. Utilidades — `src/core/utils/currency.ts`**

```typescript
import type { Currency } from "@/core/models/account";

const localeMap: Record<Currency, string> = {
  COP: "es-CO",
  USD: "en-US",
  EUR: "es-ES",
};

export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(localeMap[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "COP" ? 0 : 2,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(amount);
}

export function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "hace menos de un minuto";
  if (diffMins < 60) return `hace ${diffMins} minutos`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours} horas`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} días`;
}
```

**B.4. Queries — `src/core/db/queries/account.queries.ts`**

```typescript
import { createServerClientInstance } from "@/core/db/supabase.server";
import type {
  Account,
  AccountWithMeta,
  CreateAccountInput,
  UpdateAccountInput,
  UserBalance,
} from "@/core/models/account";

// Obtener todas las cuentas del usuario con flag has_transactions (vía RPC)
export async function selectAccountsWithMeta(): Promise<AccountWithMeta[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_accounts_with_meta");
  if (error) throw error;
  return (data ?? []) as AccountWithMeta[];
}

// Obtener una cuenta por ID
export async function selectAccountById(id: string): Promise<Account | null> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Account;
}

// Obtener el balance total del usuario
export async function selectUserBalance(): Promise<UserBalance | null> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("user_balances")
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return data as UserBalance;
}

// Insertar una nueva cuenta
export async function insertAccount(
  input: CreateAccountInput,
  userId: string
): Promise<Account> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: input.name,
      type: input.type,
      currency: input.currency,
      balance: input.initial_balance,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Account;
}

// Actualizar una cuenta existente
export async function updateAccountRecord(
  id: string,
  input: UpdateAccountInput,
  hasTransactions: boolean
): Promise<Account> {
  const supabase = await createServerClientInstance();
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.currency !== undefined) updateData.currency = input.currency;
  // Solo actualizar balance si la cuenta no tiene transacciones
  if (input.initial_balance !== undefined && !hasTransactions) {
    updateData.balance = input.initial_balance;
  }

  const { data, error } = await supabase
    .from("accounts")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Account;
}

// Alternar el estado de una cuenta (ACTIVE <-> INACTIVE)
export async function toggleAccountStatus(id: string): Promise<Account> {
  const supabase = await createServerClientInstance();
  // Primero obtener el estado actual
  const { data: current, error: fetchError } = await supabase
    .from("accounts")
    .select("status")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const newStatus = current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const { data, error } = await supabase
    .from("accounts")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Account;
}

// Eliminar una cuenta permanentemente
export async function deleteAccountRecord(id: string): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}
```

**B.5. Servicios — `src/core/services/account.service.ts`**

```typescript
import { createServerClientInstance } from "@/core/db/supabase.server";
import {
  selectAccountsWithMeta,
  selectAccountById,
  selectUserBalance,
  insertAccount,
  updateAccountRecord,
  toggleAccountStatus,
  deleteAccountRecord,
} from "@/core/db/queries/account.queries";
import type {
  Account,
  AccountWithMeta,
  CreateAccountInput,
  UpdateAccountInput,
  UserBalance,
} from "@/core/models/account";

// Obtener el ID del usuario autenticado
async function getCurrentUserId(): Promise<string> {
  const supabase = await createServerClientInstance();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

// --- Operaciones de lectura ---
export async function getAccountsWithMeta(): Promise<AccountWithMeta[]> {
  return selectAccountsWithMeta();
}

export async function getAccountById(id: string): Promise<Account | null> {
  return selectAccountById(id);
}

export async function getUserBalance(): Promise<UserBalance | null> {
  return selectUserBalance();
}

// --- Operaciones de escritura ---
export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const userId = await getCurrentUserId();
  return insertAccount(input, userId);
}

export async function updateAccount(
  id: string,
  input: UpdateAccountInput
): Promise<Account> {
  // Verificar si la cuenta tiene transacciones antes de actualizar el balance
  const accounts = await selectAccountsWithMeta();
  const account = accounts.find((a) => a.id === id);
  const hasTransactions = account?.has_transactions ?? false;
  return updateAccountRecord(id, input, hasTransactions);
}

export async function toggleStatus(id: string): Promise<Account> {
  return toggleAccountStatus(id);
}

export async function deleteAccount(id: string): Promise<void> {
  // Verificar que la cuenta no tenga transacciones
  const accounts = await selectAccountsWithMeta();
  const account = accounts.find((a) => a.id === id);
  if (account?.has_transactions) {
    throw new Error(
      "No se puede eliminar una cuenta con transacciones asociadas. Desactívala en su lugar."
    );
  }
  return deleteAccountRecord(id);
}
```

**B.6. Server Actions — `src/app/(dashboard)/accounts/actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import {
  CreateAccountSchema,
  UpdateAccountSchema,
} from "@/core/models/account";
import * as accountService from "@/core/services/account.service";

type FieldErrors = Record<string, string[]>;

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: FieldErrors };

export async function createAccountAction(
  formData: FormData
): Promise<ActionResult> {
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
): Promise<ActionResult> {
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
```

**B.7. Páginas**

| Ruta | Archivo | Tipo | Descripción |
|------|---------|------|-------------|
| `/accounts` | `src/app/(dashboard)/accounts/page.tsx` | Server Component | Listado de cuentas + balance total. Fetch via `getAccountsWithMeta()` + `getUserBalance()`. |
| — | `src/app/(dashboard)/accounts/actions.ts` | Server Actions | CRUD: `createAccountAction`, `updateAccountAction`, `toggleAccountStatusAction`, `deleteAccountAction`. |

**Estructura de la página `/accounts`:**

```typescript
// src/app/(dashboard)/accounts/page.tsx
import { getAccountsWithMeta, getUserBalance } from "@/core/services/account.service";
import { TotalBalanceCard } from "@/components/accounts/TotalBalanceCard";
import { AccountList } from "@/components/accounts/AccountList";
import { AccountForm } from "@/components/forms/AccountForm";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AccountsPage() {
  const [accounts, balance] = await Promise.all([
    getAccountsWithMeta(),
    getUserBalance(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Balance total */}
      <TotalBalanceCard balance={balance} />

      {/* Header + botón crear */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Mis Cuentas</h2>
        <AccountForm mode="create" />
      </div>

      {/* Listado o estado vacío */}
      {accounts.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Banknote className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No tienes cuentas aún</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea tu primera cuenta para empezar a gestionar tus finanzas.
          </p>
          <AccountForm
            mode="create"
            trigger={<Button className="mt-4">Crear primera cuenta</Button>}
          />
        </div>
      ) : (
        <AccountList accounts={accounts} />
      )}
    </div>
  );
}
```

**B.8. Actualización del layout del dashboard — `src/app/(dashboard)/layout.tsx`**

Se añade un componente `NavBar` con enlaces de navegación entre el logo y el `UserMenu`. Solo se enlazan las páginas implementadas (`/dashboard` y `/accounts`); el resto se añadirá en módulos futuros.

```typescript
// src/components/layout/NavBar.tsx  ('use client')
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/accounts", label: "Cuentas" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.href || pathname.startsWith(item.href + "/")
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

El layout actualizado inserta `<NavBar />` entre el logo y `<UserMenu />`:

```typescript
// src/app/(dashboard)/layout.tsx (modificación)
// Dentro del <header>, entre el Link del logo y <UserMenu />:
// <NavBar />
```

---

## 4. Endpoints / Rutas

| Ruta | Método | Tipo | Auth | Descripción |
|------|--------|------|------|-------------|
| `/accounts` | GET | Server Component | Requerida | Listado de cuentas + balance total |
| `/accounts` | POST | Server Action | Requerida | Crear cuenta (`createAccountAction`) |
| `/accounts/[id]` | PATCH | Server Action | Requerida | Editar cuenta (`updateAccountAction`) |
| `/accounts/[id]/toggle` | POST | Server Action | Requerida | Activar/desactivar cuenta (`toggleAccountStatusAction`) |
| `/accounts/[id]` | DELETE | Server Action | Requerida | Eliminar cuenta permanente (`deleteAccountAction`) |
| `/api/cron/sync-rates` | GET | Route Handler | CRON_SECRET | Sincronizar tasas de cambio diarias |

> **Nota:** Las Server Actions se invocan desde el cliente vía `action` de formulario o llamadas directas. No son rutas HTTP REST expuestas —se ejecutan en el servidor mediante el protocolo de Server Actions de Next.js.

---

## 5. DTOs / Esquemas

### `Account`

```typescript
type Account = {
  id: string;                  // UUID
  user_id: string;             // UUID, auth.uid()
  name: string;                // 1-50 chars, único por usuario
  type: "DEBIT" | "CREDIT" | "CASH";
  status: "ACTIVE" | "INACTIVE";
  balance: number;             // decimal(18,2), puede ser negativo
  currency: "COP" | "USD" | "EUR";
  created_at: string;          // ISO 8601
  updated_at: string;          // ISO 8601
};
```

### `AccountWithMeta`

```typescript
type AccountWithMeta = Account & {
  has_transactions: boolean;   // true si tiene transacciones asociadas
};
```

### `CreateAccountInput`

```typescript
type CreateAccountInput = {
  name: string;                // 1-50 chars, trimado
  type: "DEBIT" | "CREDIT" | "CASH";
  currency: "COP" | "USD" | "EUR";
  initial_balance: number;     // >= 0 si type === "CASH"
};
```

### `UpdateAccountInput`

```typescript
type UpdateAccountInput = {
  name?: string;
  type?: "DEBIT" | "CREDIT" | "CASH";
  currency?: "COP" | "USD" | "EUR";
  initial_balance?: number;    // Solo se aplica si !has_transactions
};
```

### `UserBalance`

```typescript
type UserBalance = {
  user_id: string;             // UUID
  total_balance: number;       // decimal(18,2), en preferred_currency
  currency: "COP" | "USD" | "EUR";
  updated_at: string;          // ISO 8601
};
```

### `ActionResult`

```typescript
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
```

---

## 6. Componentes UI — Detalle

### `TotalBalanceCard`

- **Tipo:** Server Component.
- **Ubicación:** Parte superior de `/accounts`.
- **Props:** `{ balance: UserBalance | null }`.
- **Comportamiento:**
  - Si `balance` es null (usuario sin cuentas): muestra `$ 0` en la moneda preferida del perfil y el texto "Crea una cuenta para ver tu balance".
  - Si `balance` existe: muestra `formatCurrency(total_balance, currency)` en grande y "Actualizado: {formatRelativeTime(updated_at)}" debajo.
- **Estilos:** Card destacada con fondo primario, texto en grande (text-3xl font-bold).

### `AccountList`

- **Tipo:** Server Component (presentacional).
- **Props:** `{ accounts: AccountWithMeta[] }`.
- **Comportamiento:** Renderiza un grid responsive de `AccountCard` (1 columna móvil, 2 tablet, 3 desktop).
- **Orden:** Las cuentas ya vienen ordenadas desde la RPC (activas primero, alfabético).

### `AccountCard`

- **Tipo:** Client Component (`'use client'`).
- **Props:** `{ account: AccountWithMeta }`.
- **Contenido:**
  - Header: `AccountTypeIcon` + nombre de la cuenta + dropdown menu de acciones.
  - Body: saldo en grande (`formatCurrency(balance, currency)`) + badges de estado y tipo.
  - Si `status === 'INACTIVE'`: la tarjeta tiene `opacity-60`.
- **Dropdown menu de acciones:**
  - "Editar" → abre `AccountForm` en modo edit.
  - "Desactivar" / "Activar" → invoca `toggleAccountStatusAction(account.id)`.
  - "Eliminar" (solo si `!has_transactions`) → abre `DeleteAccountDialog`.
- **Estilos:** Card de shadcn/ui con padding cómodo, sombra sutil.

### `AccountForm`

- **Tipo:** Client Component (`'use client'`).
- **Props:**
  ```typescript
  interface AccountFormProps {
    mode: "create" | "edit";
    account?: AccountWithMeta;
    trigger?: React.ReactNode;  // Botón personalizado que abre el diálogo
    open?: boolean;             // Controlado externamente
    onOpenChange?: (open: boolean) => void;
  }
  ```
- **Campos:**
  - `name`: Input de texto, requerido, máx. 50 caracteres.
  - `type`: Select con opciones "Débito", "Crédito", "Efectivo".
  - `currency`: Select con opciones "COP", "USD", "EUR".
  - `initial_balance`: Input numérico, requerido en modo create. En modo edit:
    - Si `account.has_transactions`: **deshabilitado**, muestra el saldo actual como solo lectura con un tooltip "El saldo se modifica mediante transacciones".
    - Si `!account.has_transactions`: editable.
- **Validación:** Zod (`CreateAccountSchema` / `UpdateAccountSchema`) en el cliente antes de enviar. Errores mostrados inline bajo cada campo.
- **Submit:**
  - Mode create: invoca `createAccountAction(formData)`.
  - Mode edit: invoca `updateAccountAction(account.id, formData)`.
- **Estados:** `idle` | `submitting` (botón muestra spinner y se deshabilita) | `error` (mensaje de error del servidor mostrado en la parte inferior del formulario).
- **Trigger por defecto:** Si no se pasa `trigger`, renderiza un `<Button>Nueva cuenta</Button>` (modo create) o un item del dropdown (modo edit).

### `DeleteAccountDialog`

- **Tipo:** Client Component (`'use client'`).
- **Props:** `{ account: AccountWithMeta; open: boolean; onOpenChange: (open: boolean) => void }`.
- **Contenido:**
  - Título: "Eliminar cuenta".
  - Descripción: `¿Estás seguro de que quieres eliminar "{account.name}"? Esta acción no se puede deshacer.`
  - Botones: "Cancelar" (outline) + "Eliminar" (destructive).
- **Submit:** Invoca `deleteAccountAction(account.id)`. Si error, muestra mensaje inline. Si éxito, cierra el diálogo (la página se revalida automáticamente).
- **Estado:** `idle` | `deleting` (botón "Eliminar" muestra spinner).

### `AccountTypeIcon`

- **Tipo:** Server Component (presentacional).
- **Props:** `{ type: AccountType; className?: string }`.
- **Íconos (lucide-react):**
  - `DEBIT` → `Landmark`
  - `CREDIT` → `CreditCard`
  - `CASH` → `Banknote`

### `NavBar`

- **Tipo:** Client Component (`'use client'`).
- **Ubicación:** Header del `(dashboard)/layout.tsx`, entre el logo y `UserMenu`.
- **Items:**
  - "Inicio" → `/dashboard`
  - "Cuentas" → `/accounts`
- **Active state:** Usa `usePathname()` para resaltar el enlace activo con `bg-secondary`.

---

## 7. Flujos Clave

### Flujo 1 — Crear cuenta (HU-1.1)

```
Usuario click "Nueva cuenta" en /accounts
  → AccountForm (mode="create") abre diálogo
  → Usuario completa: nombre, tipo, moneda, saldo inicial
  → Validación Zod en cliente (incluye regla CASH >= 0)
  → Si inválido: errores inline, no se envía
  → Si válido: createAccountAction(formData)
  → Server Action valida con Zod nuevamente
  → accountService.createAccount(input)
  → insertAccount(input, userId) → INSERT en accounts
  → Trigger accounts_balance_recalc_insert dispara
  → recalculate_user_balance() recalcula y upserta user_balances
  → revalidatePath('/accounts')
  → Página se re-renderiza con nueva cuenta + balance actualizado
  → Diálogo se cierra
  → Si error (duplicate name): mensaje "Ya existe una cuenta con ese nombre"
```

### Flujo 2 — Editar cuenta (HU-1.2)

```
Usuario click "Editar" en dropdown de AccountCard
  → AccountForm (mode="edit", account={...}) abre diálogo pre-poblado
  → Si account.has_transactions:
      campo initial_balance deshabilitado (solo lectura)
  → Usuario modifica campos deseados
  → Validación Zod en cliente
  → updateAccountAction(account.id, formData)
  → Server Action valida con Zod
  → accountService.updateAccount(id, input)
  → Verifica has_transactions (si true, ignora initial_balance)
  → updateAccountRecord(id, input, hasTransactions) → UPDATE en accounts
  → Trigger accounts_balance_recalc_update dispara (si balance/currency/status cambió)
  → revalidatePath('/accounts')
  → Página re-renderizada
  → Diálogo se cierra
```

### Flujo 3 — Desactivar / Activar cuenta (HU-1.2)

```
Usuario click "Desactivar" (o "Activar") en dropdown de AccountCard
  → toggleAccountStatusAction(account.id)
  → accountService.toggleStatus(id)
  → toggleAccountStatus(id) → SELECT status + UPDATE status
  → Trigger accounts_balance_recalc_update dispara
  → recalculate_user_balance():
      - Si desactivó: la cuenta deja de sumar al balance total
      - Si activó: la cuenta vuelve a sumar al balance total
  → revalidatePath('/accounts')
  → Página re-renderizada (tarjeta con opacity-60 si inactiva, balance actualizado)
```

### Flujo 4 — Eliminar cuenta permanente (HU-1.2)

```
Usuario click "Eliminar" en dropdown de AccountCard (solo visible si !has_transactions)
  → DeleteAccountDialog abre
  → Usuario confirma click "Eliminar"
  → deleteAccountAction(account.id)
  → accountService.deleteAccount(id)
  → Verifica has_transactions (si true, throw error)
  → deleteAccountRecord(id) → DELETE en accounts
  → Trigger accounts_balance_recalc_delete dispara
  → revalidatePath('/accounts')
  → Página re-renderizada (cuenta desaparece, balance actualizado)
  → Si error (FK constraint): mensaje "No se puede eliminar una cuenta con transacciones"
```

### Flujo 5 — Visualizar balance total (HU-1.3)

```
Usuario navega a /accounts
  → Server Component ejecuta Promise.all([getAccountsWithMeta(), getUserBalance()])
  → getAccountsWithMeta() → RPC get_accounts_with_meta() en Supabase
  → getUserBalance() → SELECT de user_balances (precalculado por trigger)
  → Render TotalBalanceCard con balance.total_balance en preferred_currency
  → Render AccountList con tarjetas individuales (saldo en moneda original)
  → TotalBalanceCard muestra "Actualizado: hace X minutos"
```

### Flujo 6 — Sincronización de tasas (background)

```
Vercel Cron dispara GET /api/cron/sync-rates diariamente a las 09:00 UTC
  → Route Handler verifica CRON_SECRET
  → Fetch https://open.er-api.com/v6/latest/USD
  → Calcula cross-rates para COP, USD, EUR
  → Upsert en exchange_rates (service role key)
  → Las tasas quedan disponibles para el trigger recalculate_user_balance
```

---

## 8. Criterios de Aceptación

### HU-1.1 — Crear cuentas

- [ ] Existe un botón "Nueva cuenta" en `/accounts`.
- [ ] Al hacer clic, se abre un formulario con campos: nombre, tipo, moneda, saldo inicial.
- [ ] El campo tipo ofrece: Débito, Crédito, Efectivo.
- [ ] El campo moneda ofrece: COP, USD, EUR.
- [ ] No se permite saldo negativo para cuentas tipo Efectivo (validación Zod + constraint BD).
- [ ] No se permiten dos cuentas con el mismo nombre para el mismo usuario (constraint BD + mensaje de error).
- [ ] Tras crear, la cuenta aparece en el listado y el balance total se actualiza.
- [ ] El formulario muestra errores de validación inline.

### HU-1.2 — Editar / Desactivar cuenta

- [ ] Cada tarjeta de cuenta tiene un menú de acciones con "Editar" y "Desactivar"/"Activar".
- [ ] Al editar, el formulario viene pre-poblado con los datos actuales.
- [ ] Si la cuenta tiene transacciones, el saldo no es editable (campo deshabilitado).
- [ ] Si la cuenta no tiene transacciones, el saldo inicial es editable.
- [ ] Al desactivar, la tarjeta cambia a aspecto atenuado (opacity-60) y el badge muestra "Inactiva".
- [ ] Al desactivar, la cuenta deja de contribuir al balance total.
- [ ] Al activar, la cuenta vuelve a contribuir al balance total.
- [ ] Una cuenta sin transacciones muestra la opción "Eliminar" en el menú.
- [ ] Una cuenta con transacciones NO muestra la opción "Eliminar".
- [ ] Al eliminar, se muestra un diálogo de confirmación.
- [ ] Tras confirmar la eliminación, la cuenta desaparece del listado y el balance se actualiza.

### HU-1.3 — Balance total

- [ ] La parte superior de `/accounts` muestra el balance total en la moneda preferida del usuario.
- [ ] El balance total suma solo las cuentas activas.
- [ ] Las cuentas en moneda distinta a la preferida se convierten usando tasas de `exchange_rates`.
- [ ] El balance total se actualiza automáticamente al crear, editar, activar/desactivar o eliminar una cuenta (trigger).
- [ ] Se muestra la hora de última actualización del balance.
- [ ] Si el usuario no tiene cuentas, el balance muestra `$ 0`.

---

## 9. Dependencias y Riesgos

### Dependencias de paquetes

Ya instaladas desde M0:
- `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`.

Nuevas a instalar (shadcn/ui):
- `card`, `input`, `select`, `label`, `dialog`, `badge` — vía `pnpm dlx shadcn@latest add card input select label dialog badge`.

### Variables de entorno

| Variable | Uso | Ámbito |
|----------|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Ya configurada (M0) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | Ya configurada (M0) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (cron sync-rates) | Server (no expone al cliente) |
| `CRON_SECRET` | Autorización del cron de Vercel | Server |

### Riesgos

1. **Tasas de cambio no disponibles:** Si el cron no ha corrido y `exchange_rates` está vacía, el trigger usa 1:1 como fallback. El balance total puede ser inexacto si el usuario tiene cuentas en múltiples monedas. Mitigación: el cron corre diariamente y la API `open.er-api.com` es gratuita y fiable.
2. **Constraint único `(user_id, name)`:** La validación a nivel BD puede generar un error `23505` que el Server Action debe interceptar y traducir a un mensaje user-friendly. Manejado en `createAccountAction` y `updateAccountAction`.
3. **Trigger `security definer`:** Las funciones `recalculate_user_balance` y `get_accounts_with_meta` usan `security definer` con `search_path = public` para evitar ataques de search path. Solo conceder `EXECUTE` a `authenticated`.
4. **Eliminación con FK restrict:** El constraint `on delete restrict` en `transactions.account_id` impide la eliminación a nivel de BD, pero la aplicación ya verifica `has_transactions` antes de intentar. Doble capa de seguridad.
5. **Performance del trigger:** El trigger `recalculate_user_balance` itera sobre las cuentas activas del usuario en cada cambio. Para uso personal (decenas de cuentas, no miles), el impacto es despreciable.
6. **Case sensitivity en nombres:** PostgreSQL `text` es case-sensitive. "Ahorros" y "ahorros" son nombres diferentes. El formulario hace `.trim()` pero no normaliza case. Se documenta como comportamiento esperado.

---

## 10. Orden de Implementación Sugerido

### Track A — Backend (Supabase) — EJECUTAR PRIMERO

1. Crear migración `20260622120000_module1_full_db_schema.sql` con:
   - Enums nuevos (A.1).
   - Tablas: `accounts` (A.2), `categories` (A.3), `transactions` (A.4), `subscriptions` (A.5).
   - Tablas de soporte: `exchange_rates` (A.6), `user_balances` (A.7).
   - Habilitar RLS (A.8) + políticas (A.9).
   - Función RPC `get_accounts_with_meta` (A.10).
   - Triggers `updated_at` (A.11) + `recalculate_user_balance` (A.12).
2. Aplicar migración con `supabase_apply_migration`.
3. Ejecutar `supabase_get_advisors` (security) y resolver advertencias críticas.
4. Crear route handler `/api/cron/sync-rates` (A.13).
5. Configurar `vercel.json` con el cron schedule.
6. Ejecutar manualmente el sync de tasas para poblar `exchange_rates` inicialmente.

### Track B — Frontend (Next.js) — EJECUTAR DESPUÉS DE TRACK A

1. Instalar componentes shadcn/ui: `pnpm dlx shadcn@latest add card input select label dialog badge`.
2. Crear `src/core/models/account.ts` (B.2).
3. Crear `src/core/utils/currency.ts` (B.3).
4. Crear `src/core/db/queries/account.queries.ts` (B.4).
5. Crear `src/core/services/account.service.ts` (B.5).
6. Crear `src/app/(dashboard)/accounts/actions.ts` (B.6).
7. Crear componentes UI:
   - `src/components/accounts/AccountTypeIcon.tsx`.
   - `src/components/accounts/TotalBalanceCard.tsx`.
   - `src/components/accounts/AccountCard.tsx`.
   - `src/components/accounts/AccountList.tsx`.
   - `src/components/accounts/DeleteAccountDialog.tsx`.
   - `src/components/forms/AccountForm.tsx`.
8. Crear `src/components/layout/NavBar.tsx` y actualizar `src/app/(dashboard)/layout.tsx`.
9. Crear `src/app/(dashboard)/accounts/page.tsx`.
10. Configurar `CRON_SECRET` en `.env.local`.
11. Verificar `pnpm lint` y `pnpm build`.

**Punto de sincronización:** Track A debe completar antes de iniciar Track B.

---

## 11. Definición de Hecho (Definition of Done)

### Base de datos
- [ ] Migración aplicada en Supabase: todas las tablas (`accounts`, `categories`, `transactions`, `subscriptions`, `exchange_rates`, `user_balances`) creadas con enums, constraints e índices.
- [ ] RLS habilitada en todas las tablas con políticas correctas.
- [ ] Función RPC `get_accounts_with_meta` creada y con `EXECUTE` restringido a `authenticated`.
- [ ] Triggers `updated_at` y `recalculate_user_balance` activos y funcionando.
- [ ] No hay advisors de seguridad críticos.
- [ ] Route handler `/api/cron/sync-rates` funcional y `exchange_rates` poblada.

### Frontend
- [ ] Página `/accounts` renderiza balance total + listado de cuentas.
- [ ] Crear cuenta funciona end-to-end (formulario → BD → trigger → revalidate).
- [ ] Editar cuenta funciona (campos editables según `has_transactions`).
- [ ] Desactivar/Activar cuenta funciona (toggle status + balance se actualiza).
- [ ] Eliminar cuenta funciona (solo sin transacciones, con confirmación).
- [ ] Validación Zod funciona en cliente y servidor.
- [ ] Errores de duplicate name se muestran correctamente.
- [ ] NavBar con enlaces a `/dashboard` y `/accounts` en el layout.
- [ ] Estado vacío se muestra cuando no hay cuentas.
- [ ] Código pasa `pnpm lint` y `pnpm build`.

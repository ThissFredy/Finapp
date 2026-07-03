# Spec — Módulo 5: Dashboard y Analítica

> **Proyecto:** FinApp — Sistema de Gestión Financiera Personal
> **Módulo:** 5 — Dashboard y Analítica
> **Historias de Usuario:** HU-5.1, HU-5.2, HU-5.3, HU-5.4 (nueva), HU-5.5 (nueva)
> **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL + Auth) + Recharts (vía shadcn/ui charts)
> **Fecha:** 2026-07-02
> **Prerrequisito:** Módulos 0, 1, 2 y 3 implementados (BD migrada + frontend de cuentas, categorías y transacciones funcional). La tabla `subscriptions` ya existe en la BD (creada en la migración del Módulo 1), aunque el frontend del Módulo 4 aún no está implementado.

---

## 1. Resumen

Módulo de visualización que consolida la salud financiera del usuario en una pantalla principal. Muestra un gráfico de barras comparando ingresos vs gastos del mes actual, un gráfico circular de gastos por categoría, un resumen de patrimonio neto distribuido por cuenta, un listado de suscripciones activas con próxima fecha de cobro y las últimas 10 transacciones registradas. Reemplaza el placeholder estático actual en `/dashboard`.

Cubre las siguientes historias de usuario:

- **HU-5.1:** Ver un gráfico de barras comparando mis Ingresos vs Gastos del mes actual.
- **HU-5.2:** Un gráfico circular (Pie chart) que desglose mis gastos por categoría para identificar fugas de capital.
- **HU-5.3:** Un resumen de mi patrimonio neto actual distribuido por cuentas.
- **HU-5.4 (nueva):** Ver mis suscripciones activas con la próxima fecha de cobro.
- **HU-5.5 (nueva):** Ver las últimas 10 transacciones registradas.

---

## 2. Asunciones Validadas

1. **Período del dashboard:** El dashboard muestra exclusivamente los datos del **mes calendario en curso** (del 1° al último día del mes actual, según la zona horaria del usuario), no un mes móvil de 30 días. No habrá selector de período ni navegación entre meses en esta versión.

2. **Moneda de consolidación:** Todos los montos del dashboard (gráficas y resumen) se muestran en la **moneda principal del usuario** (`preferred_currency` del perfil), convirtiendo las transacciones multimoneda usando los `exchange_rates` existentes en la BD.

3. **Librería de gráficas:** Se usará **`recharts`** integrado vía los componentes de chart de **shadcn/ui**, aprovechando que `globals.css` ya define las variables `--chart-1` a `--chart-5`.

4. **Exclusión de transferencias:** Las transferencias (`type=TRANSFER`) **no aparecen** en el gráfico de Ingresos vs Gastos (HU-5.1) ni en el Pie chart de gastos por categoría (HU-5.2), ya que mover dinero entre cuentas propias no es un ingreso ni un gasto real.

5. **Granularidad del gráfico de barras (HU-5.1):** El gráfico mostrará **dos barras** (Ingresos y Gastos) con los totales acumulados del mes actual, no un desglose día por día a lo largo del mes.

6. **Pie chart de gastos (HU-5.2):** Mostrará los gastos del mes actual agrupados por categoría, incluyendo **solo categorías con gastos > 0**. Las categorías sin movimiento en el mes no aparecen.

7. **Cuentas de crédito como deuda:** Las cuentas de tipo `CREDIT` se tratan como **obligaciones/deudas**, por lo que su balance **se resta** del patrimonio neto total (o se representa como valor negativo), a diferencia de las cuentas `DEBIT` y `CASH` que suman al patrimonio.

8. **Cuentas inactivas en el patrimonio:** El resumen de patrimonio neto (HU-5.3) **excluye las cuentas inactivas** (`status=INACTIVE`), mostrando solo las cuentas activas del usuario.

9. **Inclusión del Módulo 4 (Suscripciones):** El dashboard **sí incluye** un widget de suscripciones activas con la próxima fecha de cobro. La tabla `subscriptions` ya existe en la BD (creada en el Módulo 1), por lo que este widget puede implementarse sin esperar al frontend completo del Módulo 4.

10. **Estados vacíos:** Cuando el usuario no tiene transacciones en el mes actual (ej. usuario nuevo), se mostrarán **estados vacíos amigables** (mensajes + íconos) en lugar de gráficas vacías o en cero.

11. **Consultas analíticas como RPC:** Las consultas de agregación (totales mensuales, gastos por categoría, patrimonio, suscripciones, transacciones recientes) se implementarán como **funciones RPC de PostgreSQL**, siguiendo el patrón de los módulos anteriores (`get_accounts_with_meta`, `get_transactions_paginated`).

12. **Datos en tiempo real:** El dashboard consulta datos en **tiempo real** mediante Server Components en cada carga, sin cacheo estático agresivo, ya que es una app de uso personal.

13. **Ubicación de la ruta:** El dashboard se implementa en la ruta existente `/dashboard` (`src/app/(dashboard)/dashboard/page.tsx`), reemplazando el placeholder actual. Además de las 3 HU originales (gráfico de barras, Pie chart, patrimonio neto), el dashboard también muestra las suscripciones activas del usuario y las últimas 10 transacciones registradas.

---

## 3. Tracks de Implementación

El módulo se divide en dos tracks **secuenciales**: el Track A (migración de BD) debe completarse antes de iniciar el Track B (frontend).

### Track A — Backend (Supabase): RPCs de analítica

Responsable de crear las funciones RPC que agregan los datos del dashboard: totales mensuales de ingresos/gastos, gastos por categoría, patrimonio neto por cuenta, suscripciones activas y transacciones recientes.

> **Contexto:** Las tablas `accounts`, `categories`, `transactions`, `subscriptions`, `exchange_rates`, `user_balances` y `profiles` ya existen (Módulos 0-3). El enum `public.preferred_currency` ('COP', 'USD', 'EUR') ya está definido. Las políticas RLS ya están activas en todas las tablas. El trigger `recalculate_user_balance` ya mantiene `user_balances.total_balance` sincronizado.

> **Semántica de conversión de moneda:** Para consolidar montos multimoneda en la `preferred_currency` del usuario, las RPCs consultan la tabla `exchange_rates` para obtener la tasa `from_currency → preferred_currency`. Si no existe una tasa registrada para el par, se asume tasa 1.0 (mismo comportamiento que `recalculate_user_balance`). El monto convertido = `amount * exchange_rate_to_preferred`.

**A.1. Migración — RPC `get_dashboard_monthly_summary()`**

Retorna los totales de ingresos y gastos del mes actual en la moneda principal del usuario. Excluye transferencias.

```sql
create or replace function public.get_dashboard_monthly_summary()
returns table (
  total_income decimal(18,2),
  total_expense decimal(18,2),
  net_savings decimal(18,2),
  currency public.preferred_currency
)
language plpgsql
security definer set search_path = public
as $$
declare
  user_uuid uuid := auth.uid();
  pref_currency public.preferred_currency;
  month_start timestamptz := date_trunc('month', now());
  month_end timestamptz := date_trunc('month', now()) + interval '1 month';
begin
  if user_uuid is null then
    return;
  end if;

  select preferred_currency into pref_currency
  from public.profiles
  where id = user_uuid;

  if pref_currency is null then
    pref_currency := 'COP';
  end if;

  return query
  select
    coalesce(sum(
      case when t.type = 'INCOME'
        then t.amount * coalesce(
          (select rate from public.exchange_rates
           where from_currency = t.currency and to_currency = pref_currency),
          1.0
        )
        else 0
      end
    ), 0)::decimal(18,2) as total_income,

    coalesce(sum(
      case when t.type = 'EXPENSE'
        then t.amount * coalesce(
          (select rate from public.exchange_rates
           where from_currency = t.currency and to_currency = pref_currency),
          1.0
        )
        else 0
      end
    ), 0)::decimal(18,2) as total_expense,

    coalesce(sum(
      case when t.type = 'INCOME'
        then t.amount * coalesce(
          (select rate from public.exchange_rates
           where from_currency = t.currency and to_currency = pref_currency),
          1.0
        )
        else -t.amount * coalesce(
          (select rate from public.exchange_rates
           where from_currency = t.currency and to_currency = pref_currency),
          1.0
        )
      end
    ), 0)::decimal(18,2) as net_savings,

    pref_currency as currency

  from public.transactions t
  where t.user_id = user_uuid
    and t.type in ('INCOME', 'EXPENSE')
    and t.date >= month_start
    and t.date < month_end;
end;
$$;

revoke execute on function public.get_dashboard_monthly_summary() from public;
revoke execute on function public.get_dashboard_monthly_summary() from anon;
grant execute on function public.get_dashboard_monthly_summary() to authenticated;
```

> **Diseño:** La función usa `auth.uid()` para identificar al usuario (patrón de los módulos anteriores). Calcula el mes actual con `date_trunc('month', now())`. La conversión de moneda usa una subconsulta correlacionada a `exchange_rates` con `coalesce(..., 1.0)` para manejar pares sin tasa registrada. `net_savings = total_income - total_expense`.

**A.2. Migración — RPC `get_dashboard_expenses_by_category()`**

Retorna los gastos del mes actual agrupados por categoría, con nombre, color, ícono y monto convertido a la moneda principal. Solo categorías con gastos > 0.

```sql
create or replace function public.get_dashboard_expenses_by_category()
returns table (
  category_id uuid,
  category_name text,
  category_color text,
  category_icon text,
  amount decimal(18,2),
  currency public.preferred_currency
)
language plpgsql
security definer set search_path = public
as $$
declare
  user_uuid uuid := auth.uid();
  pref_currency public.preferred_currency;
  month_start timestamptz := date_trunc('month', now());
  month_end timestamptz := date_trunc('month', now()) + interval '1 month';
begin
  if user_uuid is null then
    return;
  end if;

  select preferred_currency into pref_currency
  from public.profiles
  where id = user_uuid;

  if pref_currency is null then
    pref_currency := 'COP';
  end if;

  return query
  select
    c.id as category_id,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon,
    sum(
      t.amount * coalesce(
        (select rate from public.exchange_rates
         where from_currency = t.currency and to_currency = pref_currency),
        1.0
      )
    )::decimal(18,2) as amount,
    pref_currency as currency
  from public.transactions t
  inner join public.categories c on c.id = t.category_id
  where t.user_id = user_uuid
    and t.type = 'EXPENSE'
    and t.date >= month_start
    and t.date < month_end
  group by c.id, c.name, c.color, c.icon
  having sum(
      t.amount * coalesce(
        (select rate from public.exchange_rates
         where from_currency = t.currency and to_currency = pref_currency),
        1.0
      )
    ) > 0
  order by amount desc;
end;
$$;

revoke execute on function public.get_dashboard_expenses_by_category() from public;
revoke execute on function public.get_dashboard_expenses_by_category() from anon;
grant execute on function public.get_dashboard_expenses_by_category() to authenticated;
```

> **Diseño:** Usa `INNER JOIN` con `categories` (no `LEFT JOIN`) porque solo interesan las categorías que tienen gastos. El `HAVING sum(...) > 0` filtra las categorías con monto neto cero. Ordenado por monto descendente para que las categorías con mayor gasto aparezcan primero en el Pie chart. Incluye categorías eliminadas (soft delete) si tienen transacciones en el mes, ya que no se filtra por `deleted_at`.

**A.3. Migración — RPC `get_dashboard_net_worth_by_account()`**

Retorna las cuentas activas del usuario con su balance convertido a la moneda principal, diferenciando activos (DEBIT, CASH) de deudas (CREDIT), más los totales agregados.

```sql
create or replace function public.get_dashboard_net_worth_by_account()
returns table (
  account_id uuid,
  account_name text,
  account_type public.account_type,
  account_currency public.preferred_currency,
  balance decimal(18,2),
  balance_converted decimal(18,2),
  total_assets decimal(18,2),
  total_debts decimal(18,2),
  net_worth decimal(18,2),
  currency public.preferred_currency
)
language plpgsql
security definer set search_path = public
as $$
declare
  user_uuid uuid := auth.uid();
  pref_currency public.preferred_currency;
  v_total_assets decimal(18,2) := 0;
  v_total_debts decimal(18,2) := 0;
  v_net_worth decimal(18,2) := 0;
begin
  if user_uuid is null then
    return;
  end if;

  select preferred_currency into pref_currency
  from public.profiles
  where id = user_uuid;

  if pref_currency is null then
    pref_currency := 'COP';
  end if;

  return query
  with accounts_converted as (
    select
      a.id, a.name, a.type, a.currency, a.balance,
      case
        when a.currency = pref_currency then a.balance
        else a.balance * coalesce(
          (select rate from public.exchange_rates
           where from_currency = a.currency and to_currency = pref_currency),
          1.0
        )
      end::decimal(18,2) as bal_converted
    from public.accounts a
    where a.user_id = user_uuid
      and a.status = 'ACTIVE'
  ),
  totals as (
    select
      coalesce(sum(
        case when type in ('DEBIT', 'CASH') then bal_converted else 0 end
      ), 0)::decimal(18,2) as tot_assets,
      coalesce(sum(
        case when type = 'CREDIT' then bal_converted else 0 end
      ), 0)::decimal(18,2) as tot_debts
    from accounts_converted
  )
  select
    ac.id,
    ac.name,
    ac.type,
    ac.currency,
    ac.balance,
    ac.bal_converted,
    t.tot_assets,
    t.tot_debts,
    (t.tot_assets - t.tot_debts)::decimal(18,2) as net_worth,
    pref_currency
  from accounts_converted ac
  cross join totals t
  order by
    (ac.type = 'CREDIT') asc,  -- activos primero, deudas después
    ac.name asc;
end;
$$;

revoke execute on function public.get_dashboard_net_worth_by_account() from public;
revoke execute on function public.get_dashboard_net_worth_by_account() from anon;
grant execute on function public.get_dashboard_net_worth_by_account() to authenticated;
```

> **Diseño:** `total_assets` = suma de balances convertidos de cuentas DEBIT y CASH. `total_debts` = suma de balances convertidos de cuentas CREDIT. `net_worth = total_assets - total_debts`. Las cuentas CREDIT pueden tener balance positivo (saldo a favor) o negativo (deuda), pero se agrupan como deudas para el cálculo del patrimonio. El ordenamiento muestra primero los activos (DEBIT, CASH) y luego las deudas (CREDIT), alfabéticamente dentro de cada grupo. Los totales se repiten en cada fila (patrón de `cross join` con CTE de totales).

**A.4. Migración — RPC `get_dashboard_subscriptions()`**

Retorna las suscripciones activas del usuario con la próxima fecha de cobro y el nombre de la categoría asociada.

```sql
create or replace function public.get_dashboard_subscriptions()
returns table (
  id uuid,
  name text,
  amount decimal(18,2),
  currency public.preferred_currency,
  billing_cycle public.billing_cycle,
  next_billing_date date,
  category_name text,
  category_color text,
  category_icon text
)
language sql
security definer set search_path = public
as $$
  select
    s.id,
    s.name,
    s.amount,
    s.currency,
    s.billing_cycle,
    s.next_billing_date,
    c.name  as category_name,
    c.color as category_color,
    c.icon  as category_icon
  from public.subscriptions s
  left join public.categories c on c.id = s.category_id
  where s.user_id = auth.uid()
  order by s.next_billing_date asc;
$$;

revoke execute on function public.get_dashboard_subscriptions() from public;
revoke execute on function public.get_dashboard_subscriptions() from anon;
grant execute on function public.get_dashboard_subscriptions() to authenticated;
```

> **Diseño:** Usa `LEFT JOIN` con `categories` porque el `category_id` es nullable en `subscriptions` (FK con `ON DELETE SET NULL`). Ordenado por `next_billing_date` ascendente para que las suscripciones más próximas a cobrar aparezcan primero. No se filtra por fecha (muestra todas las suscripciones del usuario, incluso las con `next_billing_date` pasada, ya que el frontend puede resaltarlas visualmente). Esta RPC es de solo lectura y no genera transacciones de pago (esa funcionalidad corresponde al Módulo 4, HU-4.3).

**A.5. Migración — RPC `get_dashboard_recent_transactions()`**

Retorna las últimas N transacciones del usuario con metadatos de cuenta y categoría, ordenadas de la más reciente a la más antigua.

```sql
create or replace function public.get_dashboard_recent_transactions(
  p_limit int default 10
)
returns table (
  id uuid,
  type public.transaction_type,
  amount decimal(18,2),
  currency public.preferred_currency,
  date timestamptz,
  description text,
  account_name text,
  category_name text,
  category_color text,
  category_icon text
)
language sql
security definer set search_path = public
as $$
  select
    t.id,
    t.type,
    t.amount,
    t.currency,
    t.date,
    t.description,
    coalesce(
      a.name,
      fa.name || ' → ' || ta.name
    ) as account_name,
    c.name  as category_name,
    c.color as category_color,
    c.icon  as category_icon
  from public.transactions t
  left join public.accounts a  on a.id  = t.account_id
  left join public.accounts fa on fa.id = t.from_account_id
  left join public.accounts ta on ta.id = t.to_account_id
  left join public.categories c on c.id = t.category_id
  where t.user_id = auth.uid()
  order by t.date desc, t.created_at desc
  limit greatest(p_limit, 1);
$$;

revoke execute on function public.get_dashboard_recent_transactions(int) from public;
revoke execute on function public.get_dashboard_recent_transactions(int) from anon;
grant execute on function public.get_dashboard_recent_transactions(int) to authenticated;
```

> **Diseño:** Para las transferencias, `account_name` se construye como `"Origen → Destino"` concatenando los nombres de las cuentas origen y destino. Para ingresos/gastos, usa el nombre de `account_id`. `coalesce` prioriza `account_id` (no nulo en ingresos/gastos) sobre la concatenación de transferencia. `p_limit` usa `greatest(p_limit, 1)` para garantizar al menos 1 resultado si se pasa 0 o negativo. El ordenamiento es `date desc, created_at desc` (mismo patrón que `get_transactions_paginated`).

**A.6. Migración — Security hardening**

```sql
-- All dashboard RPCs are security definer with search_path = public.
-- They use auth.uid() internally to scope all queries to the authenticated user.
-- Execute is revoked from public/anon and granted only to authenticated.
-- No new tables, triggers, or policies are created in this migration.
```

---

### Track B — Frontend (Next.js): Dashboard con gráficas

Responsable de instalar `recharts`, crear el componente base `chart` de shadcn/ui, los modelos Zod, las queries, el servicio, los componentes de dashboard y la página Server Component.

**B.1. Dependencias — Instalar `recharts` y componente `chart` de shadcn/ui**

```bash
pnpm add recharts
pnpm dlx shadcn@latest add chart
```

> El componente `chart.tsx` se generará en `src/components/ui/chart.tsx` y expondrá los wrappers `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent` sobre recharts, usando las variables CSS `--chart-1` a `--chart-5` definidas en `globals.css`.

**B.2. Modelos — `src/core/models/dashboard.ts`**

Esquemas Zod y tipos TypeScript para los datos del dashboard.

```typescript
import { z } from "zod";
import { CurrencySchema, AccountTypeSchema } from "@/core/models/account";
import { TransactionTypeSchema } from "@/core/models/transaction";

// --- MonthlySummary (HU-5.1) ---
export const MonthlySummarySchema = z.object({
  total_income: z.number(),
  total_expense: z.number(),
  net_savings: z.number(),
  currency: CurrencySchema,
});
export type MonthlySummary = z.infer<typeof MonthlySummarySchema>;

// --- ExpenseByCategory (HU-5.2) ---
export const ExpenseByCategoryItemSchema = z.object({
  category_id: z.string().uuid(),
  category_name: z.string(),
  category_color: z.string(),
  category_icon: z.string(),
  amount: z.number(),
  currency: CurrencySchema,
});
export type ExpenseByCategoryItem = z.infer<typeof ExpenseByCategoryItemSchema>;

// --- NetWorthByAccount (HU-5.3) ---
export const NetWorthAccountSchema = z.object({
  account_id: z.string().uuid(),
  account_name: z.string(),
  account_type: AccountTypeSchema,
  account_currency: CurrencySchema,
  balance: z.number(),
  balance_converted: z.number(),
  total_assets: z.number(),
  total_debts: z.number(),
  net_worth: z.number(),
  currency: CurrencySchema,
});
export type NetWorthAccount = z.infer<typeof NetWorthAccountSchema>;

// --- UserSubscriptionItem (HU-5.4) ---
export const BillingCycleSchema = z.enum(["MONTHLY", "YEARLY"]);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const UserSubscriptionItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  amount: z.number(),
  currency: CurrencySchema,
  billing_cycle: BillingCycleSchema,
  next_billing_date: z.string(),
  category_name: z.string().nullable(),
  category_color: z.string().nullable(),
  category_icon: z.string().nullable(),
});
export type UserSubscriptionItem = z.infer<typeof UserSubscriptionItemSchema>;

// --- RecentTransactionItem (HU-5.5) ---
export const RecentTransactionItemSchema = z.object({
  id: z.string().uuid(),
  type: TransactionTypeSchema,
  amount: z.number(),
  currency: CurrencySchema,
  date: z.string().datetime(),
  description: z.string().nullable(),
  account_name: z.string().nullable(),
  category_name: z.string().nullable(),
  category_color: z.string().nullable(),
  category_icon: z.string().nullable(),
});
export type RecentTransactionItem = z.infer<typeof RecentTransactionItemSchema>;

// --- DashboardData (agregado) ---
export const DashboardDataSchema = z.object({
  monthly_summary: MonthlySummarySchema.nullable(),
  expenses_by_category: z.array(ExpenseByCategoryItemSchema),
  net_worth_accounts: z.array(NetWorthAccountSchema),
  net_worth_totals: z.object({
    total_assets: z.number(),
    total_debts: z.number(),
    net_worth: z.number(),
    currency: CurrencySchema,
  }).nullable(),
  subscriptions: z.array(UserSubscriptionItemSchema),
  recent_transactions: z.array(RecentTransactionItemSchema),
});
export type DashboardData = z.infer<typeof DashboardDataSchema>;
```

> **Diseño:** `monthly_summary` y `net_worth_totals` son nullable porque las RPCs pueden retornar 0 filas si el usuario no está autenticado (caso edge). Los arrays se inicializan como vacíos `[]` en el servicio si la RPC retorna null. `next_billing_date` se tipa como `z.string()` (no `z.string().date()`) porque PostgreSQL `date` se serializa como string `"YYYY-MM-DD"` en JSON.

**B.3. Queries — `src/core/db/queries/dashboard.queries.ts`**

Funciones que invocan las RPCs de analítica.

```typescript
import { createServerClientInstance } from "@/core/db/supabase.server";
import type {
  MonthlySummary,
  ExpenseByCategoryItem,
  NetWorthAccount,
  UserSubscriptionItem,
  RecentTransactionItem,
} from "@/core/models/dashboard";

// HU-5.1: Totales de ingresos y gastos del mes actual
export async function selectMonthlySummary(): Promise<MonthlySummary | null> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_dashboard_monthly_summary");
  if (error) throw error;
  return (data as MonthlySummary | null) ?? null;
}

// HU-5.2: Gastos por categoría del mes actual
export async function selectExpensesByCategory(): Promise<ExpenseByCategoryItem[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_dashboard_expenses_by_category");
  if (error) throw error;
  return (data ?? []) as ExpenseByCategoryItem[];
}

// HU-5.3: Patrimonio neto por cuenta
export async function selectNetWorthByAccount(): Promise<NetWorthAccount[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_dashboard_net_worth_by_account");
  if (error) throw error;
  return (data ?? []) as NetWorthAccount[];
}

// HU-5.4: Suscripciones activas
export async function selectUserSubscriptions(): Promise<UserSubscriptionItem[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_dashboard_subscriptions");
  if (error) throw error;
  return (data ?? []) as UserSubscriptionItem[];
}

// HU-5.5: Últimas N transacciones
export async function selectRecentTransactions(
  limit: number = 10
): Promise<RecentTransactionItem[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_dashboard_recent_transactions", {
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as RecentTransactionItem[];
}
```

> **Diseño:** Cada función usa `createServerClientInstance()` (patrón de los módulos anteriores). Las funciones que retornan arrays usan `(data ?? [])` para manejar null. `selectMonthlySummary` retorna `null` si no hay datos (la RPC retorna 0 o 1 fila).

**B.4. Service — `src/core/services/dashboard.service.ts`**

Orquesta las queries y valida los datos con Zod.

```typescript
import {
  selectMonthlySummary,
  selectExpensesByCategory,
  selectNetWorthByAccount,
  selectUserSubscriptions,
  selectRecentTransactions,
} from "@/core/db/queries/dashboard.queries";
import {
  MonthlySummarySchema,
  ExpenseByCategoryItemSchema,
  NetWorthAccountSchema,
  UserSubscriptionItemSchema,
  RecentTransactionItemSchema,
} from "@/core/models/dashboard";
import type { DashboardData } from "@/core/models/dashboard";

// Obtener todos los datos del dashboard en una sola llamada
export async function getDashboardData(): Promise<DashboardData> {
  // Ejecutar todas las queries en paralelo
  const [
    monthlySummaryRaw,
    expensesByCategoryRaw,
    netWorthAccountsRaw,
    subscriptionsRaw,
    recentTransactionsRaw,
  ] = await Promise.all([
    selectMonthlySummary(),
    selectExpensesByCategory(),
    selectNetWorthByAccount(),
    selectUserSubscriptions(),
    selectRecentTransactions(10),
  ]);

  // Validar con Zod
  const monthly_summary = monthlySummaryRaw
    ? MonthlySummarySchema.parse(monthlySummaryRaw)
    : null;

  const expenses_by_category = expensesByCategoryRaw.map((item) =>
    ExpenseByCategoryItemSchema.parse(item)
  );

  const net_worth_accounts = netWorthAccountsRaw.map((item) =>
    NetWorthAccountSchema.parse(item)
  );

  const net_worth_totals = net_worth_accounts.length > 0
    ? {
        total_assets: net_worth_accounts[0].total_assets,
        total_debts: net_worth_accounts[0].total_debts,
        net_worth: net_worth_accounts[0].net_worth,
        currency: net_worth_accounts[0].currency,
      }
    : null;

  const subscriptions = subscriptionsRaw.map((item) =>
    UserSubscriptionItemSchema.parse(item)
  );

  const recent_transactions = recentTransactionsRaw.map((item) =>
    RecentTransactionItemSchema.parse(item)
  );

  return {
    monthly_summary,
    expenses_by_category,
    net_worth_accounts,
    net_worth_totals,
    subscriptions,
    recent_transactions,
  };
}
```

> **Diseño:** Usa `Promise.all` para ejecutar las 5 queries en paralelo y minimizar el tiempo de carga. Los totales del patrimonio se extraen de la primera fila de `net_worth_accounts` (ya que las RPCs repiten los totales en cada fila), evitando una query adicional. Si no hay cuentas activas, `net_worth_totals` es `null`.

**B.5. Componente UI — `src/components/ui/chart.tsx`**

Componente base de shadcn/ui para gráficas recharts. Generado por `pnpm dlx shadcn@latest add chart`. Expone:

- `ChartContainer` — Wrapper que configura el `ResponsiveContainer` de recharts con las variables CSS de color.
- `ChartTooltip` / `ChartTooltipContent` — Tooltip estilizado.
- `ChartLegend` / `ChartLegendContent` — Leyenda estilizada.
- `ChartStyle` — Helper para inyectar estilos de color por serie.

> No se incluye el código aquí porque se genera automáticamente por shadcn/ui.

**B.6. Componente — `src/components/dashboard/MonthlySummaryChart.tsx`**

Gráfico de barras (HU-5.1) que compara Ingresos vs Gastos del mes actual.

```typescript
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { MonthlySummary } from "@/core/models/dashboard";
import { formatCurrency } from "@/core/utils/currency";

interface MonthlySummaryChartProps {
  data: MonthlySummary;
}

export function MonthlySummaryChart({ data }: MonthlySummaryChartProps) {
  const chartData = [
    { label: "Ingresos", value: data.total_income, fill: "var(--chart-1)" },
    { label: "Gastos", value: data.total_expense, fill: "var(--chart-2)" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground">
        Ingresos vs Gastos
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Resumen del mes actual en {data.currency}
      </p>
      <ChartContainer
        config={{
          income: { label: "Ingresos", color: "var(--chart-1)" },
          expense: { label: "Gastos", color: "var(--chart-2)" },
        }}
        className="mt-4 h-[250px] w-full"
      >
        <BarChart data={chartData}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value, data.currency, true)}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" radius={8} />
        </BarChart>
      </ChartContainer>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Balance neto del mes:</span>
        <span
          className={
            data.net_savings >= 0
              ? "font-semibold text-green-600"
              : "font-semibold text-red-600"
          }
        >
          {formatCurrency(data.net_savings, data.currency)}
        </span>
      </div>
    </div>
  );
}
```

> **Diseño:** Dos barras con colores `--chart-1` (ingresos) y `--chart-2` (gastos). El eje Y formatea los valores con `formatCurrency` (notación compacta, ej. "$1.2M"). Debajo del gráfico se muestra el balance neto del mes (`net_savings`), en verde si es positivo, rojo si es negativo. El componente es Client Component (`"use client"`) porque recharts requiere renderizado en cliente.

**B.7. Componente — `src/components/dashboard/ExpensesByCategoryChart.tsx`**

Gráfico circular (HU-5.2) que desglosa los gastos por categoría.

```typescript
"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import * as Icons from "lucide-react";
import type { ExpenseByCategoryItem } from "@/core/models/dashboard";
import { formatCurrency } from "@/core/utils/currency";

interface ExpensesByCategoryChartProps {
  data: ExpenseByCategoryItem[];
  currency: string;
}

export function ExpensesByCategoryChart({
  data,
  currency,
}: ExpensesByCategoryChartProps) {
  // Mapear colores: usar el color de la categoría si existe, si no, rotar --chart-1..5
  const chartConfig = data.reduce((acc, item, index) => {
    acc[item.category_id] = {
      label: item.category_name,
      color: item.category_color || `var(--chart-${(index % 5) + 1})`,
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground">
        Gastos por categoría
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Desglose del mes actual en {currency}
      </p>
      <ChartContainer
        config={chartConfig}
        className="mt-4 mx-auto h-[250px] w-full"
      >
        <PieChart>
          <ChartTooltip
            content={<ChartTooltipContent nameKey="category_name" />}
          />
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category_name"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((item, index) => (
              <Cell
                key={item.category_id}
                fill={item.category_color || `var(--chart-${(index % 5) + 1})`}
              />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="category_name" />} />
        </PieChart>
      </ChartContainer>
    </div>
  );
}
```

> **Diseño:** Pie chart tipo donut (`innerRadius=60`, `outerRadius=100`). Cada slice usa el `category_color` de la categoría (HEX), con fallback a las variables `--chart-1..5` si el color está vacío. La leyenda muestra el nombre de cada categoría. El tooltip muestra el monto formateado. Si `data` es un array vacío, el componente padre (`DashboardPage`) renderiza un `DashboardEmptyState` en su lugar.

**B.8. Componente — `src/components/dashboard/NetWorthSummary.tsx`**

Resumen de patrimonio neto (HU-5.3) distribuido por cuentas.

```typescript
import { CreditCard, Wallet, Banknote } from "lucide-react";
import type { NetWorthAccount } from "@/core/models/dashboard";
import { formatCurrency } from "@/core/utils/currency";

interface NetWorthSummaryProps {
  accounts: NetWorthAccount[];
  totals: {
    total_assets: number;
    total_debts: number;
    net_worth: number;
    currency: string;
  } | null;
}

const accountTypeIcon = {
  DEBIT: Banknote,
  CREDIT: CreditCard,
  CASH: Wallet,
} as const;

export function NetWorthSummary({ accounts, totals }: NetWorthSummaryProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground">
        Patrimonio neto
      </h2>

      {totals && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Activos</p>
            <p className="mt-1 text-sm font-semibold text-green-600">
              {formatCurrency(totals.total_assets, totals.currency)}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Deudas</p>
            <p className="mt-1 text-sm font-semibold text-red-600">
              {formatCurrency(totals.total_debts, totals.currency)}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Neto</p>
            <p
              className={
                totals.net_worth >= 0
                  ? "mt-1 text-sm font-semibold text-foreground"
                  : "mt-1 text-sm font-semibold text-red-600"
              }
            >
              {formatCurrency(totals.net_worth, totals.currency)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {accounts.map((account) => {
          const Icon = accountTypeIcon[account.account_type];
          return (
            <div
              key={account.account_id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {account.account_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account.account_currency}
                    {account.account_currency !== account.currency &&
                      ` → ${account.currency}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={
                    account.account_type === "CREDIT"
                      ? "text-sm font-semibold text-red-600"
                      : "text-sm font-semibold text-foreground"
                  }
                >
                  {formatCurrency(account.balance_converted, account.currency)}
                </p>
                {account.account_currency !== account.currency && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(account.balance, account.account_currency)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

> **Diseño:** Tres tarjetas superiores con Activos (verde), Deudas (rojo) y Neto. Debajo, lista de cuentas con ícono según tipo (`Banknote` para DEBIT, `CreditCard` para CREDIT, `Wallet` para CASH). Las cuentas CREDIT se muestran en rojo. Si la moneda de la cuenta difiere de la moneda principal, se muestra el balance original debajo del convertido (ej. "USD 100.00" debajo de "COP 400,000"). Este componente es un Server Component (no necesita `"use client"`) porque no usa recharts.

**B.9. Componente — `src/components/dashboard/SubscriptionsWidget.tsx`**

Widget de suscripciones activas (HU-5.4) con próxima fecha de cobro.

```typescript
import { CalendarClock, RefreshCw } from "lucide-react";
import type { UserSubscriptionItem } from "@/core/models/dashboard";
import { formatCurrency } from "@/core/utils/currency";

interface SubscriptionsWidgetProps {
  subscriptions: UserSubscriptionItem[];
}

function formatNextBillingDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "Vencida";
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays <= 7) return `En ${diffDays} días`;
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SubscriptionsWidget({ subscriptions }: SubscriptionsWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-card-foreground">
          Suscripciones
        </h2>
      </div>

      {subscriptions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No tienes suscripciones registradas.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {sub.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sub.billing_cycle === "MONTHLY" ? "Mensual" : "Anual"}
                    {sub.category_name && ` · ${sub.category_name}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(sub.amount, sub.currency)}
                </p>
                <p
                  className={
                    "text-xs " +
                    (sub.next_billing_date < new Date().toISOString().slice(0, 10)
                      ? "text-red-600 font-medium"
                      : "text-muted-foreground")
                  }
                >
                  {formatNextBillingDate(sub.next_billing_date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

> **Diseño:** Lista de suscripciones con nombre, frecuencia (Mensual/Anual), categoría (si existe), monto y próxima fecha de cobro. La fecha se muestra relativa ("Hoy", "Mañana", "En 3 días") si está cerca, o en formato "2 Jul 2026" si está lejos. Las suscripciones con fecha pasada se marcan como "Vencida" en rojo. Este widget es de solo lectura: no incluye el botón "Registrar pago" (esa funcionalidad corresponde al Módulo 4, HU-4.3).

**B.10. Componente — `src/components/dashboard/RecentTransactionsWidget.tsx`**

Widget con las últimas 10 transacciones (HU-5.5).

```typescript
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight } from "lucide-react";
import * as Icons from "lucide-react";
import type { RecentTransactionItem } from "@/core/models/dashboard";
import { formatCurrency } from "@/core/utils/currency";

interface RecentTransactionsWidgetProps {
  transactions: RecentTransactionItem[];
}

const transactionTypeConfig = {
  INCOME: {
    icon: ArrowDownRight,
    color: "text-green-600",
    bg: "bg-green-600/10",
    sign: "+",
  },
  EXPENSE: {
    icon: ArrowUpRight,
    color: "text-red-600",
    bg: "bg-red-600/10",
    sign: "-",
  },
  TRANSFER: {
    icon: ArrowLeftRight,
    color: "text-blue-600",
    bg: "bg-blue-600/10",
    sign: "",
  },
} as const;

export function RecentTransactionsWidget({
  transactions,
}: RecentTransactionsWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-card-foreground">
          Transacciones recientes
        </h2>
        <Link
          href="/transactions"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Ver todas
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No tienes transacciones registradas.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {transactions.map((tx) => {
            const config = transactionTypeConfig[tx.type];
            const TypeIcon = config.icon;
            const CategoryIcon = tx.category_icon
              ? (Icons as Record<string, Icons.LucideIcon>)[tx.category_icon] ??
                Icons.Tag
              : Icons.Tag;

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={
                      "flex h-9 w-9 items-center justify-center rounded-full " +
                      config.bg
                    }
                  >
                    <TypeIcon className={"h-4 w-4 " + config.color} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {tx.description || tx.category_name || "Transacción"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.account_name || "—"}
                      {" · "}
                      {new Date(tx.date).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={"text-sm font-semibold " + config.color}>
                    {config.sign}
                    {formatCurrency(tx.amount, tx.currency)}
                  </p>
                  {tx.category_name && (
                    <div className="flex items-center justify-end gap-1">
                      <CategoryIcon
                        className="h-3 w-3"
                        style={{ color: tx.category_color || undefined }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {tx.category_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

> **Diseño:** Cada transacción muestra un ícono de tipo (flecha verde abajo para ingreso, flecha roja arriba para gasto, flechas azules para transferencia), descripción o nombre de categoría, nombre de cuenta, fecha, monto con signo y color, y categoría con ícono y color. El enlace "Ver todas" redirige a `/transactions`. Para transferencias, `account_name` ya viene como `"Origen → Destino"` desde la RPC.

**B.11. Componente — `src/components/dashboard/DashboardEmptyState.tsx`**

Estado vacío para cuando no hay datos suficientes.

```typescript
import { BarChart3 } from "lucide-react";

interface DashboardEmptyStateProps {
  title: string;
  message: string;
}

export function DashboardEmptyState({
  title,
  message,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
```

> **Diseño:** Componente reutilizable para estados vacíos de cualquier widget del dashboard. Recibe `title` y `message` configurables.

**B.12. Página — `src/app/(dashboard)/dashboard/page.tsx`**

Server Component que carga los datos y orquesta el layout del dashboard.

```typescript
import { getDashboardData } from "@/core/services/dashboard.service";
import { MonthlySummaryChart } from "@/components/dashboard/MonthlySummaryChart";
import { ExpensesByCategoryChart } from "@/components/dashboard/ExpensesByCategoryChart";
import { NetWorthSummary } from "@/components/dashboard/NetWorthSummary";
import { SubscriptionsWidget } from "@/components/dashboard/SubscriptionsWidget";
import { RecentTransactionsWidget } from "@/components/dashboard/RecentTransactionsWidget";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";

export default async function DashboardPage() {
  const data = await getDashboardData();

  const hasMonthlyData =
    data.monthly_summary !== null &&
    (data.monthly_summary.total_income > 0 ||
      data.monthly_summary.total_expense > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Dashboard
      </h1>
      <p className="mt-2 text-muted-foreground">
        Resumen de tu salud financiera del mes actual.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Columna izquierda: Gráficas */}
        <div className="space-y-6">
          {hasMonthlyData && data.monthly_summary ? (
            <MonthlySummaryChart data={data.monthly_summary} />
          ) : (
            <DashboardEmptyState
              title="Sin movimientos este mes"
              message="Aún no has registrado ingresos ni gastos en el mes actual. Crea una transacción para ver tu resumen."
            />
          )}

          {data.expenses_by_category.length > 0 ? (
            <ExpensesByCategoryChart
              data={data.expenses_by_category}
              currency={
                data.monthly_summary?.currency ??
                data.net_worth_totals?.currency ??
                "COP"
              }
            />
          ) : (
            <DashboardEmptyState
              title="Sin gastos por categoría"
              message="No tienes gastos registrados en el mes actual para desglosar por categoría."
            />
          )}
        </div>

        {/* Columna derecha: Patrimonio, Suscripciones y Transacciones */}
        <div className="space-y-6">
          {data.net_worth_accounts.length > 0 ? (
            <NetWorthSummary
              accounts={data.net_worth_accounts}
              totals={data.net_worth_totals}
            />
          ) : (
            <DashboardEmptyState
              title="Sin cuentas activas"
              message="No tienes cuentas activas. Crea una cuenta para empezar a registrar tus finanzas."
            />
          )}

          <SubscriptionsWidget subscriptions={data.subscriptions} />

          <RecentTransactionsWidget
            transactions={data.recent_transactions}
          />
        </div>
      </div>
    </div>
  );
}
```

> **Diseño:** Layout de 2 columnas en desktop (`lg:grid-cols-2`), apilado en móvil. Columna izquierda: gráficas (barras + pie). Columna derecha: patrimonio + suscripciones + transacciones recientes. Cada widget renderiza un `DashboardEmptyState` si no hay datos. La página es un Server Component `async` que llama a `getDashboardData()` directamente (no necesita Server Actions porque el dashboard es de solo lectura). No se usa `revalidate` ni `cache` explícito: cada navegación al dashboard fetchea datos frescos.

**B.13. Navegación — Actualizar NavBar**

La NavBar ya incluye el enlace a `/dashboard` con label "Inicio", por lo que **no requiere cambios**. El usuario puede navegar al dashboard desde cualquier página del dashboard.

---

## 4. Estructura de Archivos del Módulo

```text
src/
├── app/(dashboard)/dashboard/
│   └── page.tsx                              # Server Component — carga datos y orquesta layout
├── components/
│   ├── ui/
│   │   └── chart.tsx                         # Componente base shadcn/ui para recharts (generado)
│   └── dashboard/
│       ├── MonthlySummaryChart.tsx           # Gráfico de barras Ingresos vs Gastos (Client Component)
│       ├── ExpensesByCategoryChart.tsx       # Pie chart de gastos por categoría (Client Component)
│       ├── NetWorthSummary.tsx               # Resumen de patrimonio neto por cuenta (Server Component)
│       ├── SubscriptionsWidget.tsx           # Lista de suscripciones activas (Server Component)
│       ├── RecentTransactionsWidget.tsx      # Últimas 10 transacciones (Server Component)
│       └── DashboardEmptyState.tsx           # Estado vacío reutilizable (Server Component)
└── core/
    ├── models/dashboard.ts                  # Esquemas Zod + tipos TypeScript
    ├── services/dashboard.service.ts         # Orquestación de queries + validación Zod
    └── db/queries/dashboard.queries.ts       # Invocación de RPCs de analítica

supabase/migrations/
└── 20260702120000_module5_dashboard_analytics_rpc.sql  # 5 RPCs de analítica
```

---

## 5. Matriz de Cobertura de Historias de Usuario

| HU | Descripción | Track | Implementación |
|----|-------------|-------|----------------|
| HU-5.1 | Gráfico de barras Ingresos vs Gastos del mes actual | A+B | RPC `get_dashboard_monthly_summary` + `MonthlySummaryChart` (recharts BarChart) |
| HU-5.1 | Conversión a moneda principal | A | Subconsulta a `exchange_rates` con `coalesce(..., 1.0)` en la RPC |
| HU-5.1 | Exclusión de transferencias | A | Filtro `t.type in ('INCOME', 'EXPENSE')` en la RPC |
| HU-5.2 | Pie chart de gastos por categoría | A+B | RPC `get_dashboard_expenses_by_category` + `ExpensesByCategoryChart` (recharts PieChart) |
| HU-5.2 | Solo categorías con gastos > 0 | A | `HAVING sum(...) > 0` en la RPC |
| HU-5.2 | Color e ícono de categoría | A+B | Join con `categories` (color, icon) + `Cell` fill en recharts |
| HU-5.3 | Resumen de patrimonio neto por cuenta | A+B | RPC `get_dashboard_net_worth_by_account` + `NetWorthSummary` |
| HU-5.3 | Cuentas de crédito como deuda | A | `CASE WHEN type = 'CREDIT'` en CTE de totales (resta del neto) |
| HU-5.3 | Exclusión de cuentas inactivas | A | Filtro `a.status = 'ACTIVE'` en la RPC |
| HU-5.3 | Conversión a moneda principal | A | `CASE WHEN currency = pref_currency THEN balance ELSE balance * rate` |
| HU-5.4 | Listado de suscripciones activas | A+B | RPC `get_dashboard_subscriptions` + `SubscriptionsWidget` |
| HU-5.4 | Próxima fecha de cobro | A+B | Campo `next_billing_date` + `formatNextBillingDate` (relativa) |
| HU-5.5 | Últimas 10 transacciones | A+B | RPC `get_dashboard_recent_transactions` (p_limit=10) + `RecentTransactionsWidget` |
| HU-5.5 | Metadatos de cuenta y categoría | A | Joins con `accounts` y `categories` en la RPC |
| (ext) | Estados vacíos | B | `DashboardEmptyState` condicional por widget |
| (ext) | Datos en tiempo real | B | Server Component sin cacheo estático |

---

## 6. Criterios de Aceptación

### HU-5.1: Gráfico de barras Ingresos vs Gastos

- [ ] **AC-5.1.1:** Al navegar a `/dashboard`, el usuario ve un gráfico de barras con dos barras: "Ingresos" (verde/chart-1) y "Gastos" (gris/chart-2).
- [ ] **AC-5.1.2:** Los valores de las barras corresponden a la suma de ingresos y gastos del mes calendario en curso (del 1° al último día del mes actual).
- [ ] **AC-5.1.3:** Las transferencias no se incluyen en ningún total.
- [ ] **AC-5.1.4:** Todos los montos se muestran en la moneda principal del usuario (`preferred_currency`), convertidos desde su moneda de origen usando `exchange_rates`.
- [ ] **AC-5.1.5:** Debajo del gráfico se muestra el "Balance neto del mes" (ingresos - gastos), en verde si es ≥ 0, en rojo si es < 0.
- [ ] **AC-5.1.6:** Si el usuario no tiene transacciones en el mes actual, se muestra un estado vacío con el mensaje "Sin movimientos este mes".
- [ ] **AC-5.1.7:** El eje Y muestra los valores en notación compacta (ej. "$1.2M") usando `formatCurrency`.

### HU-5.2: Pie chart de gastos por categoría

- [ ] **AC-5.2.1:** Al navegar a `/dashboard`, el usuario ve un gráfico circular (donut) que desglosa los gastos del mes actual por categoría.
- [ ] **AC-5.2.2:** Cada slice del pie chart usa el color de la categoría (`category_color` en HEX).
- [ ] **AC-5.2.3:** Solo aparecen las categorías con gastos > 0 en el mes actual.
- [ ] **AC-5.2.4:** Las slices se ordenan de mayor a menor monto.
- [ ] **AC-5.2.5:** La leyenda muestra el nombre de cada categoría.
- [ ] **AC-5.2.6:** El tooltip muestra el monto formateado al pasar el cursor sobre un slice.
- [ ] **AC-5.2.7:** Si el usuario no tiene gastos en el mes actual, se muestra un estado vacío con el mensaje "Sin gastos por categoría".
- [ ] **AC-5.2.8:** Los montos se muestran en la moneda principal del usuario.

### HU-5.3: Resumen de patrimonio neto por cuentas

- [ ] **AC-5.3.1:** Al navegar a `/dashboard`, el usuario ve tres tarjetas superiores: "Activos", "Deudas" y "Neto".
- [ ] **AC-5.3.2:** "Activos" = suma de balances convertidos de cuentas DEBIT y CASH activas.
- [ ] **AC-5.3.3:** "Deudas" = suma de balances convertidos de cuentas CREDIT activas.
- [ ] **AC-5.3.4:** "Neto" = Activos - Deudas, en color normal si ≥ 0, en rojo si < 0.
- [ ] **AC-5.3.5:** Debajo de las tarjetas se lista cada cuenta activa con su nombre, ícono según tipo, balance convertido a la moneda principal y balance original si la moneda difiere.
- [ ] **AC-5.3.6:** Las cuentas CREDIT se muestran en rojo.
- [ ] **AC-5.3.7:** Las cuentas inactivas no aparecen.
- [ ] **AC-5.3.8:** Si el usuario no tiene cuentas activas, se muestra un estado vacío con el mensaje "Sin cuentas activas".

### HU-5.4: Suscripciones activas

- [ ] **AC-5.4.1:** Al navegar a `/dashboard`, el usuario ve un widget "Suscripciones" con todas sus suscripciones registradas.
- [ ] **AC-5.4.2:** Cada suscripción muestra nombre, frecuencia (Mensual/Anual), categoría (si existe), monto y próxima fecha de cobro.
- [ ] **AC-5.4.3:** La fecha de cobro se muestra relativa ("Hoy", "Mañana", "En N días") si está a 7 días o menos, o en formato fecha ("2 Jul 2026") si está más lejos.
- [ ] **AC-5.4.4:** Las suscripciones con fecha de cobro pasada se marcan como "Vencida" en rojo.
- [ ] **AC-5.4.5:** Las suscripciones se ordenan por próxima fecha de cobro ascendente.
- [ ] **AC-5.4.6:** Si el usuario no tiene suscripciones, se muestra el mensaje "No tienes suscripciones registradas."

### HU-5.5: Últimas transacciones

- [ ] **AC-5.5.1:** Al navegar a `/dashboard`, el usuario ve un widget "Transacciones recientes" con las últimas 10 transacciones.
- [ ] **AC-5.5.2:** Cada transacción muestra ícono de tipo (verde/rojo/azul), descripción o categoría, cuenta, fecha, monto con signo y color.
- [ ] **AC-5.5.3:** Los ingresos se muestran con signo "+" en verde, los gastos con signo "-" en rojo, las transferencias sin signo en azul.
- [ ] **AC-5.5.4:** Para transferencias, el nombre de la cuenta se muestra como "Origen → Destino".
- [ ] **AC-5.5.5:** Las transacciones se ordenan de la más reciente a la más antigua.
- [ ] **AC-5.5.6:** Hay un enlace "Ver todas" que redirige a `/transactions`.
- [ ] **AC-5.5.7:** Si el usuario no tiene transacciones, se muestra el mensaje "No tienes transacciones registradas."

---

## 7. Notas de Diseño

### Conversión de moneda en las RPCs

Todas las RPCs de analítica consultan la `preferred_currency` del usuario desde `profiles` y convierten los montos usando `exchange_rates`. La conversión usa una subconsulta correlacionada:

```sql
t.amount * coalesce(
  (select rate from public.exchange_rates
   where from_currency = t.currency and to_currency = pref_currency),
  1.0
)
```

Si no existe una tasa para el par de monedas, se asume 1.0 (mismo criterio que `recalculate_user_balance`). Esto significa que si el usuario tiene transacciones en USD pero su moneda principal es COP y no hay tasa registrada, los montos se mostrarán sin conversión. En la práctica, el usuario debería registrar tasas en la tabla `exchange_rates` (gestionado manualmente, sin API externa).

### Patrimonio neto y cuentas de crédito

Las cuentas `CREDIT` representan tarjetas de crédito. Su balance puede ser:
- **Positivo:** saldo a favor del usuario (ej. pagó más de lo que debía).
- **Negativo:** deuda pendiente.

Para el cálculo del patrimonio neto, todas las cuentas `CREDIT` se agrupan como "deudas" independientemente del signo de su balance. `total_debts = sum(balance_converted) where type = 'CREDIT'`. Si una tarjeta tiene saldo positivo (a favor), reduce el total de deudas. `net_worth = total_assets - total_debts`.

### Totales repetidos en `get_dashboard_net_worth_by_account`

La RPC retorna una fila por cuenta activa, pero los totales (`total_assets`, `total_debts`, `net_worth`) se repiten en cada fila (patrón `CROSS JOIN` con CTE de totales). El servicio extrae los totales de la primera fila (`net_worth_accounts[0]`) para evitar una query adicional. Si no hay cuentas activas, el array está vacío y `net_worth_totals` es `null`.

### Paralelización de queries

El servicio `getDashboardData()` ejecuta las 5 queries en paralelo con `Promise.all`, minimizando el tiempo de carga. Cada query es independiente (no hay dependencias entre ellas), por lo que el paralelismo es seguro.

### Componentes Server vs Client

- **Server Components:** `DashboardPage`, `NetWorthSummary`, `SubscriptionsWidget`, `RecentTransactionsWidget`, `DashboardEmptyState`. No requieren interactividad de cliente.
- **Client Components:** `MonthlySummaryChart`, `ExpensesByCategoryChart`. Requieren `"use client"` porque recharts usa `ResponsiveContainer` y hooks de renderizado del lado del cliente.

### Integración futura con Módulo 4 (Suscripciones)

El widget `SubscriptionsWidget` es de solo lectura en este módulo. Cuando se implemente el Módulo 4 completo, se podrá añadir el botón "Registrar pago de este mes" (HU-4.3) que genere una transacción de gasto automáticamente. Ese botón invocará `createTransaction` del servicio de transacciones (Módulo 3) con `type: "EXPENSE"`, el `category_id` y `account_id` de la suscripción, dejando que el trigger `apply_transaction_balance` actualice el saldo. El diseño de este módulo ya lo permite sin cambios adicionales en las RPCs de analítica.

### Sin cacheo estático

La página `DashboardPage` es un Server Component `async` sin directivas `revalidate` o `cache`. Next.js 16 con App Router renderiza los Server Components bajo demanda en cada request, lo que garantiza que el dashboard siempre muestre datos frescos. Esto es apropiado para una app de uso personal donde la consistencia financiera es crítica.

---

## 8. Flujo de Implementación

1. **Track A — Migración de BD:**
   - Crear archivo `supabase/migrations/20260702120000_module5_dashboard_analytics_rpc.sql`
   - Implementar las 5 RPCs: `get_dashboard_monthly_summary`, `get_dashboard_expenses_by_category`, `get_dashboard_net_worth_by_account`, `get_dashboard_subscriptions`, `get_dashboard_recent_transactions`
   - Aplicar la migración a la BD
   - Verificar con `supabase_get_advisors` que no haya warnings de seguridad

2. **Track B — Frontend:**
   - Instalar `recharts` (`pnpm add recharts`)
   - Generar componente `chart` de shadcn/ui (`pnpm dlx shadcn@latest add chart`)
   - Crear `src/core/models/dashboard.ts` con esquemas Zod y tipos
   - Crear `src/core/db/queries/dashboard.queries.ts` con las 5 funciones de query
   - Crear `src/core/services/dashboard.service.ts` con `getDashboardData()`
   - Crear `src/components/dashboard/DashboardEmptyState.tsx`
   - Crear `src/components/dashboard/MonthlySummaryChart.tsx`
   - Crear `src/components/dashboard/ExpensesByCategoryChart.tsx`
   - Crear `src/components/dashboard/NetWorthSummary.tsx`
   - Crear `src/components/dashboard/SubscriptionsWidget.tsx`
   - Crear `src/components/dashboard/RecentTransactionsWidget.tsx`
   - Reemplazar `src/app/(dashboard)/dashboard/page.tsx` con el Server Component completo
   - Verificar que `formatCurrency` en `src/core/utils/currency.ts` soporta notación compacta (parámetro `compact: boolean`)

3. **Verificación:**
   - Navegar a `/dashboard` con un usuario que tenga transacciones, cuentas y suscripciones
   - Verificar que las gráficas renderizan correctamente con datos reales
   - Verificar estados vacíos con un usuario nuevo sin datos
   - Verificar conversión de moneda con transacciones en moneda distinta a `preferred_currency`
   - Verificar que las cuentas inactivas no aparecen en el patrimonio
   - Verificar que las transferencias no aparecen en los gráficos de ingresos/gastos
   - Verificar responsividad en móvil (1 columna) y desktop (2 columnas)
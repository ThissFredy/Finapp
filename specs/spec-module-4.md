# Spec — Módulo 4: Suscripciones y Gastos Recurrentes

> **Proyecto:** FinApp — Sistema de Gestión Financiera Personal
> **Módulo:** 4 — Suscripciones y Gastos Recurrentes
> **Historias de Usuario:** HU-4.1, HU-4.2, HU-4.3
> **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL + Auth)
> **Fecha:** 2026-07-02
> **Prerrequisito:** Módulos 0, 1, 2 y 3 implementados (BD migrada + frontend de cuentas, categorías y transacciones funcional)

---

## 1. Resumen

Módulo de seguimiento de obligaciones financieras periódicas. Permite al usuario registrar suscripciones indicando costo, moneda, frecuencia de cobro (mensual/anual), próxima fecha de corte, categoría y cuenta de débito; visualizar un calendario de próximos pagos del mes con resumen de gasto total; y registrar pagos con un solo clic, lo que genera automáticamente una transacción de gasto en el Módulo 3 y avanza la fecha del siguiente corte.

Cubre las siguientes historias de usuario:

- **HU-4.1:** Registrar una suscripción indicando su costo, moneda, frecuencia de cobro (mensual/anual) y fecha del próximo corte.
- **HU-4.2:** Visualizar un calendario o lista con los próximos pagos del mes actual.
- **HU-4.3:** Un botón rápido para "Registrar pago de este mes", el cual genere automáticamente la transacción correspondiente en el Módulo 3.

---

## 2. Asunciones Validadas

### Modelo de datos de `subscriptions`

1. **Cuenta de débito faltante:** La tabla `subscriptions` existente (creada en el Módulo 1) no tiene `account_id`. Al ejecutar "Registrar pago" (HU-4.3), se necesita saber de qué cuenta se debita el dinero. Cada suscripción debe estar vinculada a una cuenta específica (`account_id`), campo que se agrega a la tabla existente.
2. **Estado de suscripción:** Las suscripciones tienen un estado: `ACTIVE`, `PAUSED` o `CANCELLED`. Solo las `ACTIVE` aparecen en el calendario de próximos pagos. Las `PAUSED` se excluyen del calendario pero pueden reactivarse. Las `CANCELLED` se excluyen y representan suscripciones que el usuario ya no usa (se conservan para el historial).
3. **Eliminación con soft delete:** Siguiendo la normatividad archivística colombiana y el patrón del Módulo 2 (categorías), eliminar una suscripción utiliza soft delete (columna `deleted_at`). Una suscripción eliminada desaparece de todas las vistas, pero sus transacciones de pago pasadas permanecen en el historial de transacciones.
4. **Trazabilidad vía `subscription_id` en transacciones:** Para enlazar las transacciones auto-generadas con su suscripción origen (prevención de duplicados e historial de pagos), se agrega una columna nullable `subscription_id` a la tabla `transactions`. Es `null` para transacciones manuales y se establece cuando la transacción se genera desde el pago de una suscripción.
5. **Nombre único por usuario:** El nombre de la suscripción debe ser único por usuario. Constraint: `UNIQUE (user_id, name) WHERE deleted_at IS NULL`.

### HU-4.1 — Registrar suscripción

6. **Categoría obligatoria de tipo EXPENSE:** El `category_id` de la suscripción debe referenciar una categoría de tipo `EXPENSE`. Las suscripciones son siempre gastos.
7. **Edición de suscripciones:** El usuario puede editar todos los campos de una suscripción (nombre, monto, moneda, frecuencia, próxima fecha de corte, categoría, cuenta, estado). Los cambios de monto solo afectan pagos futuros, no transacciones pasadas.
8. **`next_billing_date` puede ser pasada:** La próxima fecha de corte puede estar en el pasado (indicando un pago vencido sin registrar). Las suscripciones vencidas se resaltan visualmente con un badge "Vencida".
9. **Sin límite de suscripciones:** No existe límite en la cantidad de suscripciones que un usuario puede registrar.
10. **Sin períodos de prueba:** No hay seguimiento de períodos de prueba (trials) para v1. La suscripción inicia directamente con su primera fecha de corte.

### HU-4.2 — Calendario/lista de próximos pagos

11. **Vista de lista (no calendario grid):** La HU menciona "calendario o lista". Se implementa una **lista agrupada por fecha** (no un componente de calendario grid completo) para el mes seleccionado, con navegación entre meses. Cada ítem muestra: nombre, monto, moneda, fecha de corte y botón "Registrar pago".
12. **Resumen de costo mensual:** La vista de próximos pagos muestra un resumen del gasto total esperado para el mes seleccionado (suma de todas las suscripciones con corte en ese mes, convertido a la moneda preferida del usuario).
13. **Solo suscripciones ACTIVE en el calendario:** Las suscripciones `PAUSED` y `CANCELLED` no aparecen en el calendario de próximos pagos.

### HU-4.3 — Botón "Registrar pago de este mes"

14. **Transacción generada es de tipo EXPENSE:** Al hacer clic en "Registrar pago", el sistema genera una transacción de tipo `EXPENSE`, debitando de la cuenta vinculada a la suscripción, usando el monto y moneda de la suscripción.
15. **Conversión de moneda al pagar:** Si la moneda de la suscripción difiere de la moneda de la cuenta vinculada, la tasa de cambio se resuelve desde la tabla `exchange_rates` (consistente con el Módulo 3). El usuario puede revisar y ajustar la tasa en un diálogo de confirmación.
16. **Diálogo de confirmación antes de generar:** Al hacer clic en "Registrar pago" se abre un diálogo de confirmación que muestra los detalles de la transacción a generar (monto, moneda, cuenta, tasa si aplica, descripción, fecha). El usuario puede ajustar el monto, la tasa y la descripción antes de confirmar. La cuenta y categoría provienen de la suscripción (la cuenta puede cambiarse si la original está inactiva).
17. **Fecha de la transacción generada:** La fecha de la transacción auto-generada es la fecha actual (momento en que el usuario hace clic). El usuario puede cambiarla en el diálogo de confirmación, sujeta a la regla del Módulo 3 (no se permiten fechas futuras).
18. **Descripción auto-generada:** La descripción de la transacción auto-generada se pre-llena como `"Suscripción: {nombre de la suscripción}"`. El usuario puede editarla en el diálogo de confirmación.
19. **Auto-avance de `next_billing_date`:** Tras registrar un pago, el `next_billing_date` avanza automáticamente al siguiente ciclo: +1 mes para `MONTHLY`, +1 año para `YEARLY`.
20. **Prevención de pagos duplicados:** El sistema impide registrar un pago dos veces para el mismo ciclo de facturación. Se verifica si ya existe una transacción con `subscription_id` igual al de la suscripción y fecha dentro del ciclo de facturación actual. Si ya existe, el botón "Registrar pago" se deshabilita y muestra "Pagado".
21. **Cuenta inactiva al pagar:** Si la cuenta vinculada a la suscripción está `INACTIVE` al momento de pagar, el sistema muestra una advertencia y permite al usuario seleccionar una cuenta activa diferente en el diálogo de confirmación.
22. **Transacción generada aparece en el historial:** La transacción auto-generada aparece en el historial de transacciones (Módulo 3) como cualquier otro gasto. El trigger `apply_transaction_balance` actualiza automáticamente el saldo de la cuenta.
23. **Historial de pagos por suscripción:** El usuario puede ver el historial de pagos de una suscripción específica (lista de todas las transacciones generadas desde ella, ordenadas por fecha descendente). Accesible desde la tarjeta/detalle de la suscripción.

### Automatización y notificaciones

24. **Sin cobro automático (cron):** El registro de pagos es puramente manual. El sistema NO auto-genera transacciones mediante cron jobs ni tareas programadas. El usuario debe hacer clic en "Registrar pago" para cada suscripción vencida.
25. **Sin notificaciones:** No hay notificaciones por email ni push para v1 (restricción de presupuesto cero). Solo indicadores visuales in-app para pagos próximos y vencidos.

---

## 3. Tracks de Implementación

El módulo se divide en dos tracks **secuenciales**: el Track A (migración de BD) debe completarse antes de iniciar el Track B (frontend).

### Track A — Backend (Supabase): Migración de `subscriptions` y `transactions`

Responsable de alterar las tablas existentes (`subscriptions` y `transactions`), crear el enum `subscription_status`, añadir constraints e índices, y crear las funciones RPC para listado, próximos pagos, registro de pago y modificación del RPC de transacciones del Módulo 3.

> **Contexto:** La tabla `subscriptions` ya fue creada en la migración del Módulo 1 (sección A.5) con la siguiente estructura:
> ```sql
> create table public.subscriptions (
>   id uuid primary key default gen_random_uuid(),
>   user_id uuid not null references auth.users(id) on delete cascade,
>   name text not null,
>   amount decimal(18,2) not null,
>   currency public.preferred_currency not null default 'COP',
>   billing_cycle public.billing_cycle not null default 'MONTHLY',
>   next_billing_date date not null,
>   category_id uuid references public.categories(id) on delete set null,
>   created_at timestamptz not null default now(),
>   updated_at timestamptz not null default now()
> );
> ```
> El enum `public.billing_cycle` ('MONTHLY', 'YEARLY'), las políticas RLS (CRUD para el owner), el trigger `subscriptions_set_updated_at` y los índices `idx_subscriptions_user_id` e `idx_subscriptions_next_billing` ya existen. La tabla `transactions` ya tiene el trigger `apply_transaction_balance` (Módulo 3) que actualiza `accounts.balance` tras INSERT/UPDATE/DELETE.

**A.1. Migración — Enum `subscription_status`**

```sql
create type public.subscription_status as enum ('ACTIVE', 'PAUSED', 'CANCELLED');
```

**A.2. Migración — ALTER `subscriptions`: añadir `account_id`, `status`, `deleted_at`**

```sql
alter table public.subscriptions
  add column if not exists account_id uuid references public.accounts(id) on delete set null,
  add column if not exists status public.subscription_status not null default 'ACTIVE',
  add column if not exists deleted_at timestamptz;
```

> **`account_id` es nullable:** Permite crear una suscripción sin cuenta vinculada inicialmente. Sin embargo, al registrar un pago (HU-4.3), una cuenta es obligatoria. El `ON DELETE SET NULL` protege la integridad: si se elimina una cuenta, la suscripción conserva sus datos pero el usuario debe reasignar la cuenta antes del próximo pago.
>
> **`status` con default `ACTIVE`:** Las suscripciones existentes (creadas antes de esta migración) quedan automáticamente como `ACTIVE`.
>
> **`deleted_at` para soft delete:** Consistente con el patrón de `categories` (Módulo 2).

**A.3. Migración — ALTER `transactions`: añadir `subscription_id`**

```sql
alter table public.transactions
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;
```

> **`ON DELETE SET NULL`:** Las suscripciones se eliminan vía soft delete (`deleted_at`), no hard delete. Si una suscripción se elimina permanentemente (caso excepcional), las transacciones generadas desde ella conservan todos sus datos financieros (monto, cuenta, categoría) pero pierden el enlace `subscription_id`. Esto es seguro porque la transacción es un registro financiero independiente.
>
> **Compatibilidad con el trigger existente:** El trigger `apply_transaction_balance` (Módulo 3) opera sobre `account_id`, `from_account_id`, `to_account_id`, `type`, `amount` y `exchange_rate`. El nuevo campo `subscription_id` no interfiere con la lógica del trigger — la transacción generada desde una suscripción es un `EXPENSE` normal que el trigger procesa sin cambios.

**A.4. Migración — Constraints e índices**

```sql
-- Nombre único por usuario (solo suscripciones no eliminadas)
create unique index if not exists subscriptions_unique_name_per_user
  on public.subscriptions (user_id, name)
  where deleted_at is null;

-- Índice para consulta de próximos pagos (ACTIVE, no eliminadas, por fecha de corte)
create index if not exists idx_subscriptions_user_status_billing
  on public.subscriptions (user_id, status, next_billing_date)
  where deleted_at is null;

-- Índice para lookup de transacciones por subscription_id (detección de duplicados)
create index if not exists idx_transactions_subscription_id
  on public.transactions (subscription_id)
  where subscription_id is not null;
```

> **Índice parcial en `transactions.subscription_id`:** Solo indexa filas donde `subscription_id IS NOT NULL` (transacciones auto-generadas). Las transacciones manuales (la mayoría) no se indexan, ahorrando espacio.

**A.5. Migración — RPC `get_subscriptions_with_meta()`**

Retorna todas las suscripciones del usuario autenticado (no eliminadas) con joins de cuenta y categoría, y el flag `is_paid_this_cycle` que verifica si ya existe una transacción de pago para el ciclo de facturación actual de `next_billing_date`.

```sql
create or replace function public.get_subscriptions_with_meta()
returns table (
  id uuid,
  user_id uuid,
  name text,
  amount decimal(18,2),
  currency public.preferred_currency,
  billing_cycle public.billing_cycle,
  next_billing_date date,
  category_id uuid,
  account_id uuid,
  status public.subscription_status,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  account_name text,
  account_currency public.preferred_currency,
  account_status public.account_status,
  category_name text,
  category_icon text,
  category_color text,
  category_deleted_at timestamptz,
  is_paid_this_cycle boolean
)
language sql
security definer set search_path = public
as $$
  select
    s.id, s.user_id, s.name, s.amount, s.currency, s.billing_cycle,
    s.next_billing_date, s.category_id, s.account_id, s.status,
    s.created_at, s.updated_at, s.deleted_at,
    a.name  as account_name,
    a.currency as account_currency,
    a.status as account_status,
    c.name  as category_name,
    c.icon  as category_icon,
    c.color as category_color,
    c.deleted_at as category_deleted_at,
    case
      when s.billing_cycle = 'MONTHLY' then
        exists(
          select 1 from public.transactions t
          where t.subscription_id = s.id
            and date_trunc('month', t.date) = date_trunc('month', s.next_billing_date::timestamptz)
        )
      when s.billing_cycle = 'YEARLY' then
        exists(
          select 1 from public.transactions t
          where t.subscription_id = s.id
            and date_trunc('year', t.date) = date_trunc('year', s.next_billing_date::timestamptz)
        )
      else false
    end as is_paid_this_cycle
  from public.subscriptions s
  left join public.accounts a  on a.id  = s.account_id
  left join public.categories c on c.id  = s.category_id
  where s.user_id = auth.uid()
    and s.deleted_at is null
  order by (s.status = 'ACTIVE') desc, s.next_billing_date asc, s.name asc;
$$;

revoke execute on function public.get_subscriptions_with_meta() from public;
revoke execute on function public.get_subscriptions_with_meta() from anon;
grant execute on function public.get_subscriptions_with_meta() to authenticated;
```

> **Lógica de `is_paid_this_cycle`:** Para `MONTHLY`, verifica si existe una transacción con `subscription_id = s.id` cuya fecha (`date`) cae en el mismo mes que `next_billing_date`. Para `YEARLY`, verifica el mismo año. Esto permite al frontend deshabilitar el botón "Registrar pago" y mostrar "Pagado" cuando ya se registró el pago del ciclo actual.
>
> **Ordenamiento:** Primero las `ACTIVE` (desc por booleano), luego por fecha de corte ascendente, luego por nombre. Las `PAUSED` y `CANCELLED` aparecen al final.

**A.6. Migración — RPC `get_upcoming_subscription_payments(p_year, p_month)`**

Retorna solo las suscripciones `ACTIVE` cuyo `next_billing_date` cae en el mes/año indicados, con los mismos joins y `is_paid_this_cycle` que `get_subscriptions_with_meta`.

```sql
create or replace function public.get_upcoming_subscription_payments(
  p_year int,
  p_month int
)
returns table (
  id uuid,
  user_id uuid,
  name text,
  amount decimal(18,2),
  currency public.preferred_currency,
  billing_cycle public.billing_cycle,
  next_billing_date date,
  category_id uuid,
  account_id uuid,
  status public.subscription_status,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  account_name text,
  account_currency public.preferred_currency,
  account_status public.account_status,
  category_name text,
  category_icon text,
  category_color text,
  category_deleted_at timestamptz,
  is_paid_this_cycle boolean
)
language sql
security definer set search_path = public
as $$
  select
    s.id, s.user_id, s.name, s.amount, s.currency, s.billing_cycle,
    s.next_billing_date, s.category_id, s.account_id, s.status,
    s.created_at, s.updated_at, s.deleted_at,
    a.name  as account_name,
    a.currency as account_currency,
    a.status as account_status,
    c.name  as category_name,
    c.icon  as category_icon,
    c.color as category_color,
    c.deleted_at as category_deleted_at,
    case
      when s.billing_cycle = 'MONTHLY' then
        exists(
          select 1 from public.transactions t
          where t.subscription_id = s.id
            and date_trunc('month', t.date) = date_trunc('month', s.next_billing_date::timestamptz)
        )
      when s.billing_cycle = 'YEARLY' then
        exists(
          select 1 from public.transactions t
          where t.subscription_id = s.id
            and date_trunc('year', t.date) = date_trunc('year', s.next_billing_date::timestamptz)
        )
      else false
    end as is_paid_this_cycle
  from public.subscriptions s
  left join public.accounts a  on a.id  = s.account_id
  left join public.categories c on c.id  = s.category_id
  where s.user_id = auth.uid()
    and s.deleted_at is null
    and s.status = 'ACTIVE'
    and extract(year from s.next_billing_date) = p_year
    and extract(month from s.next_billing_date) = p_month
  order by s.next_billing_date asc, s.name asc;
$$;

revoke execute on function public.get_upcoming_subscription_payments(int, int) from public;
revoke execute on function public.get_upcoming_subscription_payments(int, int) from anon;
grant execute on function public.get_upcoming_subscription_payments(int, int) to authenticated;
```

> **Filtro por mes/año:** Usa `extract(year from ...)` y `extract(month from ...)` sobre `next_billing_date` (tipo `date`). Solo retorna suscripciones `ACTIVE` y no eliminadas.
>
> **Misma estructura de retorno que `get_subscriptions_with_meta`:** El frontend usa el mismo tipo TypeScript (`SubscriptionWithMeta`) para ambas RPCs.

**A.7. Migración — Drop & recreate `get_transactions_paginated()` (modificación del Módulo 3)**

Se elimina la función existente del Módulo 3 y se recrea con un parámetro adicional `p_subscription_id` y la columna `subscription_id` en el retorno. Esto permite reutilizar el RPC del historial de transacciones para consultar el historial de pagos de una suscripción específica (asunción 23).

```sql
-- Eliminar la función existente (firma: 6 parámetros)
drop function if exists public.get_transactions_paginated(int, int, date, date, uuid, uuid);

-- Recrear con p_subscription_id adicional (firma: 7 parámetros)
create or replace function public.get_transactions_paginated(
  p_limit int default 20,
  p_offset int default 0,
  p_from_date date default null,
  p_to_date date default null,
  p_account_id uuid default null,
  p_category_id uuid default null,
  p_subscription_id uuid default null
)
returns table (
  id uuid,
  user_id uuid,
  account_id uuid,
  from_account_id uuid,
  to_account_id uuid,
  category_id uuid,
  subscription_id uuid,
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
      t.category_id, t.subscription_id, t.type, t.amount, t.currency, t.exchange_rate,
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
      and (p_subscription_id is null or t.subscription_id = p_subscription_id)
  ),
  counted as (
    select f.*, count(*) over () as cnt
    from filtered f
  )
  select
    c.id, c.user_id, c.account_id, c.from_account_id, c.to_account_id,
    c.category_id, c.subscription_id, c.type, c.amount, c.currency, c.exchange_rate,
    c.date, c.description, c.created_at, c.updated_at,
    c.acc_name, c.acc_currency, c.from_acc_name, c.to_acc_name,
    c.cat_name, c.cat_icon, c.cat_color, c.cat_deleted_at,
    coalesce(c.cnt, 0) as total_count
  from counted c
  order by c.date desc, c.created_at desc
  limit p_limit offset p_offset;
$$;

revoke execute on function public.get_transactions_paginated(int, int, date, date, uuid, uuid, uuid) from public;
revoke execute on function public.get_transactions_paginated(int, int, date, date, uuid, uuid, uuid) from anon;
grant execute on function public.get_transactions_paginated(int, int, date, date, uuid, uuid, uuid) to authenticated;
```

> **Retrocompatibilidad:** El nuevo parámetro `p_subscription_id` tiene default `null`. Las llamadas existentes del Módulo 3 que no pasen este parámetro seguirán funcionando (Supabase envía solo los parámetros nombrados que se proporcionan; los ausentes usan el default). Sin embargo, la firma de la función cambia (7 params vs 6), por lo que el `DROP FUNCTION` es necesario — `CREATE OR REPLACE` no permite cambiar la lista de parámetros.
>
> **Nueva columna en el retorno:** `subscription_id uuid` se añade al `returns table`. El frontend del Módulo 3 debe actualizar su tipo `TransactionWithDetails` para incluir este campo (ver Track B.3).

**A.8. Migración — RPC `register_subscription_payment(...)`**

Operación atómica que valida ownership y estado, verifica no-duplicación, inserta una transacción `EXPENSE` con `subscription_id` (el trigger `apply_transaction_balance` actualiza el saldo automáticamente), avanza `next_billing_date` al siguiente ciclo, y retorna la transacción creada.

```sql
create or replace function public.register_subscription_payment(
  p_subscription_id uuid,
  p_amount decimal(18,2),
  p_exchange_rate decimal(18,6) default null,
  p_date date default null,
  p_description text default null,
  p_account_id uuid default null
)
returns public.transactions
language plpgsql
security definer set search_path = public
as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_is_paid boolean := false;
  v_new_billing_date date;
  v_account_id uuid;
  v_account_currency public.preferred_currency;
  v_exchange_rate decimal(18,6);
  v_description text;
  v_date date;
  v_inserted_transaction public.transactions%rowtype;
begin
  ------------------------------------------------------------------
  -- 1. Cargar suscripción y validar ownership + estado
  ------------------------------------------------------------------
  select * into v_subscription
    from public.subscriptions
    where id = p_subscription_id
      and user_id = auth.uid()
      and deleted_at is null;

  if not found then
    raise exception 'Suscripción no encontrada o no pertenece al usuario';
  end if;

  if v_subscription.status <> 'ACTIVE' then
    raise exception 'La suscripción no está activa';
  end if;

  ------------------------------------------------------------------
  -- 2. Verificar que no se haya pagado este ciclo (no duplicar)
  ------------------------------------------------------------------
  if v_subscription.billing_cycle = 'MONTHLY' then
    select exists(
      select 1 from public.transactions t
      where t.subscription_id = p_subscription_id
        and date_trunc('month', t.date) = date_trunc('month', v_subscription.next_billing_date::timestamptz)
    ) into v_is_paid;
  else
    select exists(
      select 1 from public.transactions t
      where t.subscription_id = p_subscription_id
        and date_trunc('year', t.date) = date_trunc('year', v_subscription.next_billing_date::timestamptz)
    ) into v_is_paid;
  end if;

  if v_is_paid then
    raise exception 'Ya se ha registrado un pago para este ciclo de facturación';
  end if;

  ------------------------------------------------------------------
  -- 3. Determinar cuenta (override o default de la suscripción)
  ------------------------------------------------------------------
  v_account_id := coalesce(p_account_id, v_subscription.account_id);

  if v_account_id is null then
    raise exception 'No se ha especificado una cuenta para el pago';
  end if;

  -- Validar ownership y estado activo de la cuenta
  select a.currency into v_account_currency
    from public.accounts a
    where a.id = v_account_id
      and a.user_id = auth.uid()
      and a.status = 'ACTIVE';

  if not found then
    raise exception 'La cuenta seleccionada no existe o no está activa';
  end if;

  ------------------------------------------------------------------
  -- 4. Resolver tasa de cambio (forzar 1.0 si misma moneda)
  ------------------------------------------------------------------
  if v_account_currency = v_subscription.currency then
    v_exchange_rate := 1.0;
  elsif p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'Debe especificar una tasa de cambio válida para conversión de moneda';
  else
    v_exchange_rate := p_exchange_rate;
  end if;

  ------------------------------------------------------------------
  -- 5. Resolver fecha (default hoy, no futura)
  ------------------------------------------------------------------
  v_date := coalesce(p_date, current_date);

  if v_date > current_date then
    raise exception 'La fecha no puede ser futura';
  end if;

  ------------------------------------------------------------------
  -- 6. Resolver descripción (default "Suscripción: {name}")
  ------------------------------------------------------------------
  v_description := coalesce(nullif(p_description, ''), 'Suscripción: ' || v_subscription.name);

  ------------------------------------------------------------------
  -- 7. Insertar transacción EXPENSE
  --    El trigger apply_transaction_balance actualiza el saldo
  --    de la cuenta automáticamente (cadena de triggers del Módulo 3).
  ------------------------------------------------------------------
  insert into public.transactions (
    user_id, account_id, category_id, subscription_id,
    type, amount, currency, exchange_rate, date, description
  )
  values (
    auth.uid(),
    v_account_id,
    v_subscription.category_id,
    p_subscription_id,
    'EXPENSE',
    p_amount,
    v_subscription.currency,
    v_exchange_rate,
    v_date::timestamptz,
    v_description
  )
  returning * into v_inserted_transaction;

  ------------------------------------------------------------------
  -- 8. Avanzar next_billing_date al siguiente ciclo
  ------------------------------------------------------------------
  if v_subscription.billing_cycle = 'MONTHLY' then
    v_new_billing_date := (v_subscription.next_billing_date + interval '1 month')::date;
  else
    v_new_billing_date := (v_subscription.next_billing_date + interval '1 year')::date;
  end if;

  update public.subscriptions
    set next_billing_date = v_new_billing_date
    where id = p_subscription_id;

  ------------------------------------------------------------------
  -- 9. Retornar la transacción creada
  ------------------------------------------------------------------
  return v_inserted_transaction;
end;
$$;

revoke execute on function public.register_subscription_payment(uuid, decimal, decimal, date, text, uuid) from public;
revoke execute on function public.register_subscription_payment(uuid, decimal, decimal, date, text, uuid) from anon;
grant execute on function public.register_subscription_payment(uuid, decimal, decimal, date, text, uuid) to authenticated;
```

> **Atomicidad:** Toda la función se ejecuta dentro de una transacción SQL. Si cualquier paso falla (validación, inserción, avance de fecha), se hace `ROLLBACK` automático y ningún cambio persista. Esto garantiza que no haya transacciones huérfanas sin avance de fecha, ni avances de fecha sin transacción.
>
> **Cadena de triggers:** La inserción de la transacción dispara `apply_transaction_balance` → actualiza `accounts.balance` → dispara `recalculate_user_balance` → actualiza `user_balances.total_balance`. Todo atómico.
>
> **`security definer`:** La función bypassa RLS para poder insertar en `transactions` y actualizar `subscriptions` en una sola operación. La validación de ownership se hace explícitamente (`user_id = auth.uid()`).
>
> **Retorno `public.transactions`:** Retorna una sola fila (tipo compuesto). PostgREST la entrega como un objeto JSON único al frontend.

**A.9. Advisors**

Tras aplicar la migración, ejecutar `supabase_get_advisors` (security) para verificar:
- RLS sigue habilitada en `subscriptions` y `transactions`.
- Las nuevas funciones `security definer` (`get_subscriptions_with_meta`, `get_upcoming_subscription_payments`, `register_subscription_payment`) tienen `search_path` limitado a `public`.
- `get_transactions_paginated` (recreada) mantiene `search_path = public` y solo es ejecutable por `authenticated`.
- `register_subscription_payment` solo es ejecutable por `authenticated`.
- No hay políticas RLS faltantes en las columnas nuevas (`account_id`, `status`, `deleted_at` en `subscriptions`; `subscription_id` en `transactions`).

---

### Track B — Frontend (Next.js): Módulo 4

Responsable de la capa de presentación, modelos, servicios, server actions y componentes UI para la gestión de suscripciones y el registro de pagos recurrentes.

> **Prerrequisito:** Track A completado (migración aplicada en Supabase).

**B.1. Dependencias nuevas**

Ninguna. `date-fns` y `lucide-react` ya fueron instalados en el Módulo 3.

**B.2. Componentes base shadcn/ui a instalar**

```bash
pnpm dlx shadcn@latest add alert-dialog
```

> `dialog`, `tabs`, `select`, `input`, `label`, `button`, `badge` ya fueron instalados en módulos anteriores. `alert-dialog` se usa para el diálogo de confirmación de eliminación (soft delete) de suscripciones.

**B.3. Modificación a archivos del Módulo 3 — `transaction.ts` y `transaction.queries.ts`**

Estos archivos deben actualizarse para incluir el nuevo campo `subscription_id`:

**`src/core/models/transaction.ts`** — añadir `subscription_id` a los schemas:

```typescript
// --- Transaction (registro completo desde BD) ---
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  account_id: z.string().uuid().nullable(),
  from_account_id: z.string().uuid().nullable(),
  to_account_id: z.string().uuid().nullable(),
  category_id: z.string().uuid().nullable(),
  subscription_id: z.string().uuid().nullable(), // NUEVO
  type: TransactionTypeSchema,
  amount: z.number(),
  currency: CurrencySchema,
  exchange_rate: z.number(),
  date: z.string().datetime(),
  description: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// --- TransactionWithDetails (con joins desde RPC) ---
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

// --- TransactionFilters (historial paginado) ---
export const TransactionFiltersSchema = z.object({
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  account_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  subscription_id: z.string().uuid().optional(), // NUEVO
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});
```

> **Sin cambios en `CreateTransactionSchema` ni `UpdateTransactionSchema`:** Las transacciones manuales nunca tienen `subscription_id`. El campo `buildRow` en `transaction.queries.ts` no establece `subscription_id`, por lo que la BD lo deja como `null` (default). Las transacciones con `subscription_id` solo se crean vía el RPC `register_subscription_payment`.

**`src/core/db/queries/transaction.queries.ts`** — añadir `p_subscription_id` a la llamada RPC:

```typescript
// Listar transacciones paginadas con filtros (vía RPC)
export async function selectTransactionsPaginated(
  filters: TransactionFilters
): Promise<PaginatedTransactions> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_transactions_paginated", {
    p_limit: filters.page_size,
    p_offset: (filters.page - 1) * filters.page_size,
    p_from_date: filters.from_date || null,
    p_to_date: filters.to_date || null,
    p_account_id: filters.account_id ?? null,
    p_category_id: filters.category_id ?? null,
    p_subscription_id: filters.subscription_id ?? null, // NUEVO
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
```

> **Retrocompatible:** Cuando `filters.subscription_id` es `undefined` (llamadas desde el Módulo 3 que no usan este campo), se envía `null` al RPC, que lo interpreta como "sin filtro" y retorna todas las transacciones.

**B.4. Modelos — `src/core/models/subscription.ts`**

```typescript
import { z } from "zod";
import { CurrencySchema } from "@/core/models/account";

// --- Enums ---
export const BillingCycleSchema = z.enum(["MONTHLY", "YEARLY"]);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const SubscriptionStatusSchema = z.enum(["ACTIVE", "PAUSED", "CANCELLED"]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

// --- Subscription (registro completo desde BD) ---
export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  amount: z.number(),
  currency: CurrencySchema,
  billing_cycle: BillingCycleSchema,
  next_billing_date: z.string(), // "YYYY-MM-DD" desde BD (tipo date)
  category_id: z.string().uuid().nullable(),
  account_id: z.string().uuid().nullable(),
  status: SubscriptionStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

// --- SubscriptionWithMeta (con joins e is_paid_this_cycle desde RPC) ---
export const SubscriptionWithMetaSchema = SubscriptionSchema.extend({
  account_name: z.string().nullable(),
  account_currency: z.string().nullable(),
  account_status: z.string().nullable(),
  category_name: z.string().nullable(),
  category_icon: z.string().nullable(),
  category_color: z.string().nullable(),
  category_deleted_at: z.string().datetime().nullable(),
  is_paid_this_cycle: z.boolean(),
});

export type SubscriptionWithMeta = z.infer<typeof SubscriptionWithMetaSchema>;

// --- Campos base reutilizables ---
const positiveAmount = z.coerce
  .number()
  .positive("El monto debe ser mayor a 0");

const subscriptionName = z
  .string()
  .min(1, "El nombre es requerido")
  .max(50, "Máximo 50 caracteres")
  .trim();

// next_billing_date: puede ser pasada o futura (a diferencia de las transacciones)
const billingDateField = z.coerce.date({
  errorMap: () => ({ message: "Fecha inválida" }),
});

// --- CreateSubscriptionInput (formulario de creación) ---
export const CreateSubscriptionSchema = z.object({
  name: subscriptionName,
  amount: positiveAmount,
  currency: CurrencySchema,
  billing_cycle: BillingCycleSchema,
  next_billing_date: billingDateField,
  category_id: z.string().uuid("Selecciona una categoría"),
  account_id: z.string().uuid("Selecciona una cuenta"),
});

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;

// --- UpdateSubscriptionInput (formulario de edición: incluye id y status) ---
export const UpdateSubscriptionSchema = z.object({
  id: z.string().uuid("ID de suscripción inválido"),
  name: subscriptionName,
  amount: positiveAmount,
  currency: CurrencySchema,
  billing_cycle: BillingCycleSchema,
  next_billing_date: billingDateField,
  category_id: z.string().uuid("Selecciona una categoría"),
  account_id: z.string().uuid("Selecciona una cuenta"),
  status: SubscriptionStatusSchema,
});

export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;

// --- RegisterPaymentInput (diálogo de confirmación de pago) ---
const paymentDateField = z.coerce.date().refine((d) => d <= new Date(), {
  message: "La fecha no puede ser futura",
});

const descriptionField = z
  .string()
  .max(500, "Máximo 500 caracteres")
  .trim()
  .optional()
  .or(z.literal(""));

export const RegisterPaymentSchema = z.object({
  subscription_id: z.string().uuid("ID de suscripción inválido"),
  amount: positiveAmount,
  exchange_rate: z.coerce
    .number()
    .positive("La tasa debe ser mayor a 0")
    .default(1.0),
  date: paymentDateField,
  description: descriptionField,
  account_id: z.string().uuid("Selecciona una cuenta"),
});

export type RegisterPaymentInput = z.infer<typeof RegisterPaymentSchema>;

// --- DeleteSubscriptionInput ---
export const DeleteSubscriptionSchema = z.object({
  id: z.string().uuid("ID de suscripción inválido"),
});

export type DeleteSubscriptionInput = z.infer<typeof DeleteSubscriptionSchema>;
```

> **`next_billing_date` sin restricción de futuro:** A diferencia del campo `date` de las transacciones (que no permite fechas futuras), `next_billing_date` puede ser cualquier fecha válida (pasada para indicar vencimiento, o futura para indicar el próximo corte).
>
> **`account_status` como string en el schema:** El RPC retorna `public.account_status` que PostgREST serializa como string. Se usa `z.string().nullable()` en lugar de `AccountStatusSchema` para evitar acoplamientos de tipos entre módulos.

**B.5. Queries — `src/core/db/queries/subscription.queries.ts`**

```typescript
import { createServerClientInstance } from "@/core/db/supabase.server";
import type {
  SubscriptionWithMeta,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  RegisterPaymentInput,
} from "@/core/models/subscription";
import type { Transaction } from "@/core/models/transaction";

// Listar todas las suscripciones del usuario con metadatos (vía RPC)
export async function selectSubscriptionsWithMeta(): Promise<SubscriptionWithMeta[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_subscriptions_with_meta");
  if (error) throw error;
  return (data ?? []) as SubscriptionWithMeta[];
}

// Listar próximos pagos del mes (vía RPC)
export async function selectUpcomingPayments(
  year: number,
  month: number
): Promise<SubscriptionWithMeta[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("get_upcoming_subscription_payments", {
    p_year: year,
    p_month: month,
  });
  if (error) throw error;
  return (data ?? []) as SubscriptionWithMeta[];
}

// Insertar una nueva suscripción
export async function insertSubscription(
  input: CreateSubscriptionInput,
  userId: string
): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase.from("subscriptions").insert({
    user_id: userId,
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    billing_cycle: input.billing_cycle,
    next_billing_date: input.next_billing_date.toISOString().split("T")[0],
    category_id: input.category_id,
    account_id: input.account_id,
    status: "ACTIVE",
  });
  if (error) throw error;
}

// Actualizar una suscripción existente
export async function updateSubscriptionRecord(
  id: string,
  input: UpdateSubscriptionInput
): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase
    .from("subscriptions")
    .update({
      name: input.name,
      amount: input.amount,
      currency: input.currency,
      billing_cycle: input.billing_cycle,
      next_billing_date: input.next_billing_date.toISOString().split("T")[0],
      category_id: input.category_id,
      account_id: input.account_id,
      status: input.status,
    })
    .eq("id", id);
  if (error) throw error;
}

// Soft delete: marcar deleted_at
export async function softDeleteSubscription(id: string): Promise<void> {
  const supabase = await createServerClientInstance();
  const { error } = await supabase
    .from("subscriptions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Registrar pago de suscripción (vía RPC atómico)
export async function registerSubscriptionPayment(
  input: RegisterPaymentInput
): Promise<Transaction> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.rpc("register_subscription_payment", {
    p_subscription_id: input.subscription_id,
    p_amount: input.amount,
    p_exchange_rate: input.exchange_rate,
    p_date: input.date.toISOString().split("T")[0],
    p_description: input.description || null,
    p_account_id: input.account_id,
  });
  if (error) throw error;
  return data as Transaction;
}
```

> **`insertSubscription` y `updateSubscriptionRecord` usan el cliente Supabase directamente** (no RPC), siguiendo el patrón de `account.queries.ts` y `category.queries.ts` para CRUD simple. RLS protege las operaciones.
>
> **`registerSubscriptionPayment` usa RPC** porque requiere atomicidad entre la inserción de la transacción y el avance de `next_billing_date` (asunción 19 + 20).
>
> **Conversión de fecha:** `input.next_billing_date.toISOString().split("T")[0]` convierte el `Date` de Zod a string `"YYYY-MM-DD"` para el tipo `date` de PostgreSQL.

**B.6. Servicios — `src/core/services/subscription.service.ts`**

```typescript
import { createServerClientInstance } from "@/core/db/supabase.server";
import {
  selectSubscriptionsWithMeta,
  selectUpcomingPayments,
  insertSubscription,
  updateSubscriptionRecord,
  softDeleteSubscription,
  registerSubscriptionPayment,
} from "@/core/db/queries/subscription.queries";
import { selectTransactionsPaginated } from "@/core/db/queries/transaction.queries";
import { selectAccountById } from "@/core/db/queries/account.queries";
import { selectActiveCategoriesByType } from "@/core/db/queries/category.queries";
import type {
  SubscriptionWithMeta,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  RegisterPaymentInput,
} from "@/core/models/subscription";
import type { PaginatedTransactions } from "@/core/models/transaction";

// Obtener el ID del usuario autenticado
async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");
  return user.id;
}

// Listar todas las suscripciones del usuario
export async function listSubscriptions(): Promise<SubscriptionWithMeta[]> {
  return selectSubscriptionsWithMeta();
}

// Listar próximos pagos del mes
export async function listUpcomingPayments(
  year: number,
  month: number
): Promise<SubscriptionWithMeta[]> {
  return selectUpcomingPayments(year, month);
}

// Crear una suscripción (validando categoría EXPENSE y cuenta ACTIVE)
export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<void> {
  const userId = await getAuthenticatedUserId();
  await validateSubscriptionRefs(input.category_id, input.account_id);
  await insertSubscription(input, userId);
}

// Editar una suscripción
export async function updateSubscription(
  input: UpdateSubscriptionInput
): Promise<void> {
  await validateSubscriptionRefs(input.category_id, input.account_id);
  await updateSubscriptionRecord(input.id, input);
}

// Eliminar una suscripción (soft delete)
export async function deleteSubscription(id: string): Promise<void> {
  return softDeleteSubscription(id);
}

// Registrar pago de una suscripción
export async function registerPayment(
  input: RegisterPaymentInput
): Promise<void> {
  // El RPC valida ownership, estado, duplicados y atomicidad.
  // La validación de cuenta activa también se hace en el RPC.
  await registerSubscriptionPayment(input);
}

// Obtener historial de pagos de una suscripción (vía get_transactions_paginated)
export async function getPaymentHistory(
  subscriptionId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedTransactions> {
  return selectTransactionsPaginated({
    subscription_id: subscriptionId,
    page,
    page_size: pageSize,
  });
}

// Validar que la categoría es EXPENSE y la cuenta está ACTIVE
async function validateSubscriptionRefs(
  categoryId: string,
  accountId: string
): Promise<void> {
  const expenseCats = await selectActiveCategoriesByType("EXPENSE");
  if (!expenseCats.some((c) => c.id === categoryId)) {
    throw new Error("La categoría seleccionada no es válida o no es de tipo gasto");
  }
  const account = await selectAccountById(accountId);
  if (!account) throw new Error("La cuenta seleccionada no existe");
  if (account.status !== "ACTIVE") {
    throw new Error("La cuenta seleccionada no está activa");
  }
}
```

> **Doble validación en `createSubscription` y `updateSubscription`:** La validación de categoría EXPENSE y cuenta ACTIVE se hace en el servicio (capa de aplicación) para dar mensajes claros al usuario. El RPC `register_subscription_payment` repite la validación de cuenta activa como safety net.
>
> **`registerPayment` delega al RPC:** Toda la lógica de validación de duplicados, inserción atómica y avance de fecha se centraliza en el RPC. El servicio solo pasa los datos.

**B.7. Server Actions — `src/app/(dashboard)/subscriptions/actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import {
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema,
  RegisterPaymentSchema,
} from "@/core/models/subscription";
import * as subscriptionService from "@/core/services/subscription.service";

export async function createSubscriptionAction(formData: FormData) {
  const parsed = CreateSubscriptionSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    billing_cycle: formData.get("billing_cycle"),
    next_billing_date: formData.get("next_billing_date"),
    category_id: formData.get("category_id"),
    account_id: formData.get("account_id"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await subscriptionService.createSubscription(parsed.data);
    revalidatePath("/subscriptions");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function updateSubscriptionAction(formData: FormData) {
  const parsed = UpdateSubscriptionSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    billing_cycle: formData.get("billing_cycle"),
    next_billing_date: formData.get("next_billing_date"),
    category_id: formData.get("category_id"),
    account_id: formData.get("account_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await subscriptionService.updateSubscription(parsed.data);
    revalidatePath("/subscriptions");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function deleteSubscriptionAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: { _form: ["ID de suscripción requerido"] } };
  try {
    await subscriptionService.deleteSubscription(id);
    revalidatePath("/subscriptions");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function registerPaymentAction(formData: FormData) {
  const parsed = RegisterPaymentSchema.safeParse({
    subscription_id: formData.get("subscription_id"),
    amount: formData.get("amount"),
    exchange_rate: formData.get("exchange_rate") || undefined,
    date: formData.get("date"),
    description: formData.get("description") || undefined,
    account_id: formData.get("account_id"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  try {
    await subscriptionService.registerPayment(parsed.data);
    revalidatePath("/subscriptions");
    revalidatePath("/transactions");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function listUpcomingPaymentsAction(year: number, month: number) {
  try {
    return { data: await subscriptionService.listUpcomingPayments(year, month) };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}

export async function getPaymentHistoryAction(
  subscriptionId: string,
  page: number = 1,
  pageSize: number = 10
) {
  try {
    return {
      data: await subscriptionService.getPaymentHistory(
        subscriptionId,
        page,
        pageSize
      ),
    };
  } catch (e) {
    return { error: { _form: [(e as Error).message] } };
  }
}
```

> **`revalidatePath` en `registerPaymentAction`:** Se revalidan tres rutas:
> - `/subscriptions` — el `next_billing_date` avanzó y `is_paid_this_cycle` cambió.
> - `/transactions` — la nueva transacción EXPENSE aparece en el historial.
> - `/` — el dashboard muestra balances que se actualizaron vía trigger.

**B.8. Componente — `src/components/subscriptions/SubscriptionStatusBadge.tsx`**

Badge de color según el estado de la suscripción.

```tsx
import { Badge } from "@/components/ui/badge";
import type { SubscriptionStatus } from "@/core/models/subscription";

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  const config = {
    ACTIVE: { label: "Activa", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
    PAUSED: { label: "Pausada", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
    CANCELLED: { label: "Cancelada", className: "bg-gray-100 text-gray-500 hover:bg-gray-100" },
  };
  const { label, className } = config[status];

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  );
}
```

**B.9. Componente — `src/components/forms/SubscriptionForm.tsx`**

Modal de creación/edición. Usa tabs para seleccionar la frecuencia (Mensual/Anual). El selector de categoría solo muestra categorías EXPENSE. El selector de cuenta solo muestra cuentas ACTIVE. En modo edición, aparece un selector de estado (Activa/Pausada/Cancelada).

```tsx
"use client";

import { useState } from "react";
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
  createSubscriptionAction,
  updateSubscriptionAction,
} from "@/app/(dashboard)/subscriptions/actions";
import type { Account, Currency } from "@/core/models/account";
import type { Category } from "@/core/models/category";
import type {
  BillingCycle,
  SubscriptionStatus,
  SubscriptionWithMeta,
} from "@/core/models/subscription";

interface SubscriptionFormProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  expenseCategories: Category[];
  subscription?: SubscriptionWithMeta | null;
}

export function SubscriptionForm({
  open,
  onClose,
  accounts,
  expenseCategories,
  subscription,
}: SubscriptionFormProps) {
  const isEdit = !!subscription;
  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");

  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(
    subscription ? String(subscription.amount) : ""
  );
  const [currency, setCurrency] = useState<Currency>(
    subscription?.currency ?? "COP"
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    subscription?.billing_cycle ?? "MONTHLY"
  );
  const [nextBillingDate, setNextBillingDate] = useState(
    subscription?.next_billing_date ?? ""
  );
  const [categoryId, setCategoryId] = useState(subscription?.category_id ?? "");
  const [accountId, setAccountId] = useState(subscription?.account_id ?? "");
  const [status, setStatus] = useState<SubscriptionStatus>(
    subscription?.status ?? "ACTIVE"
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    const formData = new FormData(e.currentTarget);
    formData.set("billing_cycle", billingCycle);
    formData.set("category_id", categoryId);
    formData.set("account_id", accountId);
    if (isEdit) {
      formData.set("id", subscription!.id);
      formData.set("status", status);
    }

    const action = isEdit
      ? updateSubscriptionAction
      : createSubscriptionAction;
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
            {isEdit ? "Editar suscripción" : "Nueva suscripción"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Netflix, Spotify..."
              maxLength={50}
              required
            />
          </div>

          {/* Monto + Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount">Costo</Label>
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

          {/* Frecuencia */}
          <div className="space-y-1">
            <Label>Frecuencia de cobro</Label>
            <Tabs
              value={billingCycle}
              onValueChange={(v) => setBillingCycle(v as BillingCycle)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="MONTHLY">Mensual</TabsTrigger>
                <TabsTrigger value="YEARLY">Anual</TabsTrigger>
              </TabsList>
            </Tabs>
            <input type="hidden" name="billing_cycle" value={billingCycle} />
          </div>

          {/* Próxima fecha de corte */}
          <div className="space-y-1">
            <Label htmlFor="next_billing_date">Próxima fecha de corte</Label>
            <Input
              id="next_billing_date"
              name="next_billing_date"
              type="date"
              value={nextBillingDate}
              onChange={(e) => setNextBillingDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Puede ser una fecha pasada (vencida) o futura.
            </p>
          </div>

          {/* Categoría (solo EXPENSE) */}
          <div className="space-y-1">
            <Label>Categoría</Label>
            <CategorySelect
              value={categoryId}
              onChange={setCategoryId}
              categories={expenseCategories}
              type="EXPENSE"
            />
          </div>

          {/* Cuenta (solo ACTIVE) */}
          <div className="space-y-1">
            <Label>Cuenta de débito</Label>
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

          {/* Estado (solo en edición) */}
          {isEdit && (
            <div className="space-y-1">
              <Label htmlFor="status">Estado</Label>
              <Select
                name="status"
                value={status}
                onValueChange={(v) => setStatus(v as SubscriptionStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Activa</SelectItem>
                  <SelectItem value="PAUSED">Pausada</SelectItem>
                  <SelectItem value="CANCELLED">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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

> **Reutilización del Módulo 2:** El selector de categoría usa `CategorySelect` (creado en el Módulo 2), que recibe la lista de categorías activas filtradas por tipo y renderiza ícono + color + nombre. Aquí se pasa `type="EXPENSE"` y solo categorías con `deleted_at IS NULL`.
>
> **`next_billing_date` sin `max`:** A diferencia del campo `date` del `TransactionForm` (que tiene `max={today}`), este campo no restringe fechas futuras, porque la próxima fecha de corte puede ser futura por naturaleza.

**B.10. Componente — `src/components/subscriptions/SubscriptionCard.tsx`**

Tarjeta individual de suscripción en la lista "Mis suscripciones". Muestra nombre, monto, frecuencia, próxima fecha, categoría, cuenta, badges de estado/vencida/pagada, y botones de acción.

```tsx
"use client";

import {
  Pencil,
  Trash2,
  History,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriptionStatusBadge } from "@/components/subscriptions/SubscriptionStatusBadge";
import { formatCurrency } from "@/core/utils/currency";
import type { Currency } from "@/core/models/account";
import type { SubscriptionWithMeta } from "@/core/models/subscription";

interface SubscriptionCardProps {
  subscription: SubscriptionWithMeta;
  onEdit: (s: SubscriptionWithMeta) => void;
  onDelete: (s: SubscriptionWithMeta) => void;
  onPay: (s: SubscriptionWithMeta) => void;
  onHistory: (s: SubscriptionWithMeta) => void;
}

export function SubscriptionCard({
  subscription,
  onEdit,
  onDelete,
  onPay,
  onHistory,
}: SubscriptionCardProps) {
  const {
    name,
    amount,
    currency,
    billing_cycle,
    next_billing_date,
    account_name,
    account_status,
    category_name,
    category_icon,
    category_color,
    category_deleted_at,
    status,
    is_paid_this_cycle,
  } = subscription;

  const isOverdue =
    status === "ACTIVE" &&
    new Date(next_billing_date) < new Date(new Date().toDateString());

  const canPay =
    status === "ACTIVE" && !is_paid_this_cycle;

  const cycleLabel = billing_cycle === "MONTHLY" ? "Mensual" : "Anual";
  const categoryLabel = category_deleted_at
    ? "(Categoría eliminada)"
    : category_name;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3 min-w-0">
        {/* Ícono de categoría */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: category_color
              ? `${category_color}22`
              : undefined,
          }}
        >
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <SubscriptionStatusBadge status={status} />
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                Vencida
              </Badge>
            )}
            {is_paid_this_cycle && (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs"
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Pagado
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {cycleLabel} · {categoryLabel} · {account_name ?? "Sin cuenta"}
            {account_status === "INACTIVE" && " (inactiva)"}
          </p>
          <p className="text-xs text-muted-foreground">
            Próximo corte:{" "}
            {new Date(next_billing_date).toLocaleDateString("es-CO")}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <span className="text-sm font-bold">
          {formatCurrency(amount, currency as Currency)}
        </span>
        <div className="flex items-center gap-1">
          {canPay && (
            <Button
              size="sm"
              onClick={() => onPay(subscription)}
            >
              Registrar pago
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onHistory(subscription)}
            title="Historial de pagos"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(subscription)}
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(subscription)}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

> **`canPay`:** El botón "Registrar pago" solo aparece si la suscripción está `ACTIVE` y `is_paid_this_cycle` es `false`. Si ya se pagó este ciclo, se muestra el badge "Pagado" en su lugar.
>
> **`isOverdue`:** Se calcula comparando `next_billing_date` con la fecha actual (sin hora). Solo aplica a suscripciones `ACTIVE`.

**B.11. Componente — `src/components/subscriptions/UpcomingPaymentsList.tsx`**

Lista agrupada por fecha de los próximos pagos del mes seleccionado, con navegación entre meses y resumen de gasto total.

```tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/core/utils/currency";
import { listUpcomingPaymentsAction } from "@/app/(dashboard)/subscriptions/actions";
import type { Currency } from "@/core/models/account";
import type { SubscriptionWithMeta } from "@/core/models/subscription";

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface UpcomingPaymentsListProps {
  initialPayments: SubscriptionWithMeta[];
  initialYear: number;
  initialMonth: number;
  exchangeRates: ExchangeRateRow[];
  preferredCurrency: Currency;
  onPay: (s: SubscriptionWithMeta) => void;
}

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function UpcomingPaymentsList({
  initialPayments,
  initialYear,
  initialMonth,
  exchangeRates,
  preferredCurrency,
  onPay,
}: UpcomingPaymentsListProps) {
  const [payments, setPayments] = useState(initialPayments);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const result = await listUpcomingPaymentsAction(y, m);
    setLoading(false);
    if (result.data) {
      setPayments(result.data);
    }
  }, []);

  function handlePrevMonth() {
    let m = month - 1;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setMonth(m);
    setYear(y);
    refresh(y, m);
  }

  function handleNextMonth() {
    let m = month + 1;
    let y = year;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
    refresh(y, m);
  }

  // Convertir monto a moneda preferida
  function convert(amount: number, from: string): number {
    if (from === preferredCurrency) return amount;
    const rate = exchangeRates.find(
      (r) => r.from_currency === from && r.to_currency === preferredCurrency
    )?.rate;
    return rate ? amount * rate : amount;
  }

  // Resumen del mes
  const summary = useMemo(() => {
    const total = payments.reduce(
      (sum, s) => sum + convert(s.amount, s.currency),
      0
    );
    const paidCount = payments.filter((s) => s.is_paid_this_cycle).length;
    return {
      total,
      totalCount: payments.length,
      paidCount,
      pendingCount: payments.length - paidCount,
    };
  }, [payments, exchangeRates, preferredCurrency]);

  // Agrupar por fecha
  const grouped = useMemo(() => {
    const map = new Map<string, SubscriptionWithMeta[]>();
    for (const p of payments) {
      const key = p.next_billing_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [payments]);

  return (
    <div className="space-y-4">
      {/* Navegación de mes */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[180px] text-center">
            {monthNames[month - 1]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Total del mes</p>
          <p className="text-lg font-bold">
            {formatCurrency(summary.total, preferredCurrency)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="text-lg font-bold text-amber-600">
            {summary.pendingCount}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Pagados</p>
          <p className="text-lg font-bold text-emerald-600">
            {summary.paidCount}
          </p>
        </div>
      </div>

      {/* Lista agrupada por fecha */}
      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Cargando...
        </p>
      ) : grouped.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No hay suscripciones con corte en este mes.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <div key={date} className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {new Date(date).toLocaleDateString("es-CO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <div className="space-y-2">
                {items.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: s.category_color
                            ? `${s.category_color}22`
                            : undefined,
                        }}
                      >
                        <span className="text-xs font-medium">
                          {s.category_icon?.[0]?.toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {s.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.category_name} · {s.account_name ?? "Sin cuenta"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatCurrency(s.amount, s.currency as Currency)}
                      </span>
                      {s.is_paid_this_cycle ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Pagado
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => onPay(s)}
                        >
                          Registrar pago
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

> **Conversión de moneda en el frontend:** El total del mes se calcula convirtiendo cada monto a la moneda preferida del usuario usando las tasas de `exchange_rates` pasadas como prop. Si no existe tasa para un par, se usa el monto original sin convertir (consistente con el comportamiento de `recalculate_user_balance`).
>
> **Navegación de mes:** Al cambiar de mes, se llama `listUpcomingPaymentsAction(year, month)` que ejecuta el RPC `get_upcoming_subscription_payments` en el servidor y retorna los datos frescos.

**B.12. Componente — `src/components/subscriptions/RegisterPaymentDialog.tsx`**

Diálogo de confirmación que muestra los detalles de la transacción a generar. Permite ajustar monto, tasa de cambio, fecha, descripción y cuenta (si la original está inactiva).

```tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { registerPaymentAction } from "@/app/(dashboard)/subscriptions/actions";
import { formatCurrency } from "@/core/utils/currency";
import type { Account, Currency } from "@/core/models/account";
import type { SubscriptionWithMeta } from "@/core/models/subscription";

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface RegisterPaymentDialogProps {
  subscription: SubscriptionWithMeta | null;
  accounts: Account[];
  exchangeRates: ExchangeRateRow[];
  onClose: () => void;
}

export function RegisterPaymentDialog({
  subscription,
  accounts,
  exchangeRates,
  onClose,
}: RegisterPaymentDialogProps) {
  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");
  const isAccountInactive =
    subscription?.account_status === "INACTIVE";

  const [amount, setAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  // Pre-llenar campos cuando se abre el diálogo
  useEffect(() => {
    if (subscription) {
      setAmount(String(subscription.amount));
      setDescription(`Suscripción: ${subscription.name}`);
      setAccountId(subscription.account_id ?? "");
      setExchangeRate("1");
      setDate(new Date().toISOString().split("T")[0]);
      setErrors({});
    }
  }, [subscription]);

  // Moneda de la cuenta seleccionada
  const accountCurrency = useMemo<Currency | null>(() => {
    const acc = activeAccounts.find((a) => a.id === accountId);
    return acc ? acc.currency : null;
  }, [accountId, activeAccounts]);

  const subCurrency = subscription?.currency ?? "COP";
  const showExchangeRate =
    accountCurrency !== null && subCurrency !== accountCurrency;

  // Auto-llenar tasa desde exchange_rates
  useEffect(() => {
    if (showExchangeRate && accountCurrency) {
      const found = exchangeRates.find(
        (r) =>
          r.from_currency === subCurrency &&
          r.to_currency === accountCurrency
      );
      if (found) setExchangeRate(String(found.rate));
    } else if (!showExchangeRate) {
      setExchangeRate("1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountCurrency, showExchangeRate, subCurrency]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!subscription) return;
    setPending(true);
    setErrors({});
    const formData = new FormData(e.currentTarget);
    formData.set("subscription_id", subscription.id);
    formData.set("exchange_rate", exchangeRate);
    formData.set("account_id", accountId);

    const result = await registerPaymentAction(formData);
    setPending(false);
    if (result.error) {
      setErrors(result.error as Record<string, string[]>);
    } else {
      onClose();
    }
  }

  if (!subscription) return null;

  return (
    <Dialog open={!!subscription} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar pago de suscripción</DialogTitle>
          <DialogDescription>
            Se generará una transacción de gasto en la cuenta seleccionada.
            El saldo se actualizará automáticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info de la suscripción (solo lectura) */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{subscription.name}</p>
                <p className="text-xs text-muted-foreground">
                  {subscription.billing_cycle === "MONTHLY" ? "Mensual" : "Anual"} ·{" "}
                  Próximo corte:{" "}
                  {new Date(subscription.next_billing_date).toLocaleDateString("es-CO")}
                </p>
              </div>
              <span className="text-sm font-bold">
                {formatCurrency(subscription.amount, subscription.currency as Currency)}
              </span>
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-1">
            <Label htmlFor="amount">Monto a pagar</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Cuenta */}
          <div className="space-y-1">
            <Label>Cuenta de débito</Label>
            {isAccountInactive && (
              <p className="text-xs text-amber-600">
                La cuenta original está inactiva. Selecciona otra:
              </p>
            )}
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

          {/* Tasa de cambio condicional */}
          {showExchangeRate ? (
            <div className="space-y-1">
              <Label htmlFor="exchange_rate">
                Tasa de cambio ({subCurrency} &rarr; {accountCurrency})
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
                Tasa sugerida desde la tabla de conversiones. Puedes ajustarla.
              </p>
            </div>
          ) : (
            <input type="hidden" name="exchange_rate" value="1" />
          )}

          {/* Fecha */}
          <div className="space-y-1">
            <Label htmlFor="date">Fecha del pago</Label>
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
              {pending ? "Procesando..." : "Confirmar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

> **Pre-llenado con `useEffect`:** Cuando se abre el diálogo (`subscription` cambia de null a un objeto), se resetean todos los campos con los valores de la suscripción. Esto asegura que los datos estén frescos cada vez que se abre.
>
> **Tasa de cambio condicional:** Si la moneda de la suscripción difiere de la moneda de la cuenta seleccionada, se muestra el campo de tasa (auto-llenado desde `exchange_rates`). Si coinciden, se oculta y se envía `1` como hidden input. La lógica es idéntica a la del `TransactionForm` del Módulo 3.
>
> **Cuenta inactiva:** Si `account_status` es `"INACTIVE"`, se muestra una advertencia y el selector de cuenta permite elegir una activa diferente (asunción 21).

**B.13. Componente — `src/components/subscriptions/PaymentHistoryDialog.tsx`**

Diálogo que muestra el historial paginado de transacciones generadas desde una suscripción específica.

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/core/utils/currency";
import { getPaymentHistoryAction } from "@/app/(dashboard)/subscriptions/actions";
import type { Currency } from "@/core/models/account";
import type { SubscriptionWithMeta } from "@/core/models/subscription";
import type { TransactionWithDetails } from "@/core/models/transaction";

interface PaymentHistoryDialogProps {
  subscription: SubscriptionWithMeta | null;
  onClose: () => void;
}

const PAGE_SIZE = 10;

export function PaymentHistoryDialog({
  subscription,
  onClose,
}: PaymentHistoryDialogProps) {
  const [items, setItems] = useState<TransactionWithDetails[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (subscriptionId: string, nextPage: number) => {
      setLoading(true);
      const result = await getPaymentHistoryAction(
        subscriptionId,
        nextPage,
        PAGE_SIZE
      );
      setLoading(false);
      if (result.data) {
        setItems(result.data.items);
        setTotalCount(result.data.total_count);
        setPage(result.data.page);
      }
    },
    []
  );

  useEffect(() => {
    if (subscription) {
      setItems([]);
      setTotalCount(0);
      setPage(1);
      load(subscription.id, 1);
    }
  }, [subscription, load]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <Dialog open={!!subscription} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Historial de pagos{subscription ? `: ${subscription.name}` : ""}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Cargando...
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se han registrado pagos para esta suscripción.
          </p>
        ) : (
          <div className="space-y-1">
            <div className="rounded-lg border bg-card px-4">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-3 border-b last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {t.description || "Pago de suscripción"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("es-CO")} ·{" "}
                      {t.account_name}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-rose-600">
                    -{formatCurrency(t.amount, t.currency as Currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages} · {totalCount} pagos
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => load(subscription!.id, page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => load(subscription!.id, page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

> **Reutilización del RPC del Módulo 3:** El historial de pagos se obtiene llamando `get_transactions_paginated` con `p_subscription_id` configurado. Esto filtra solo las transacciones generadas desde la suscripción, sin necesidad de un RPC nuevo.
>
> **Sin botones de editar/eliminar:** A diferencia del `TransactionItem` del Módulo 3 (que tiene botones de editar/eliminar), el historial de pagos es de solo lectura. Cada ítem muestra fecha, descripción, cuenta y monto.

**B.14. Componente — `src/components/subscriptions/DeleteSubscriptionDialog.tsx`**

Confirmación de eliminación (soft delete) con advertencia sobre la conservación del historial.

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
import { deleteSubscriptionAction } from "@/app/(dashboard)/subscriptions/actions";
import type { SubscriptionWithMeta } from "@/core/models/subscription";

interface DeleteSubscriptionDialogProps {
  subscription: SubscriptionWithMeta | null;
  onClose: () => void;
}

export function DeleteSubscriptionDialog({
  subscription,
  onClose,
}: DeleteSubscriptionDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!subscription) return;
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", subscription.id);
    const result = await deleteSubscriptionAction(formData);
    setPending(false);
    if (result.error) {
      setError(result.error._form?.[0] ?? "Error al eliminar");
    } else {
      onClose();
    }
  }

  return (
    <Dialog open={!!subscription} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar suscripción</DialogTitle>
          <DialogDescription>
            La suscripción se eliminará de todas las vistas. Las
            transacciones de pago pasadas permanecerán en el historial de
            transacciones.
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

**B.15. Página — `src/app/(dashboard)/subscriptions/page.tsx`**

Server Component que carga la lista de suscripciones, los próximos pagos del mes actual, las cuentas, las categorías de gasto, las tasas de cambio y el balance del usuario.

```tsx
import { listSubscriptions, listUpcomingPayments } from "@/core/services/subscription.service";
import { selectAccountsWithMeta } from "@/core/db/queries/account.queries";
import { selectActiveCategoriesByType } from "@/core/db/queries/category.queries";
import { selectAllExchangeRates } from "@/core/db/queries/transaction.queries";
import { selectUserBalance } from "@/core/db/queries/account.queries";
import { SubscriptionsClient } from "./SubscriptionsClient";

export default async function SubscriptionsPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [
    subscriptions,
    upcomingPayments,
    accounts,
    expenseCategories,
    exchangeRates,
    userBalance,
  ] = await Promise.all([
    listSubscriptions(),
    listUpcomingPayments(year, month),
    selectAccountsWithMeta(),
    selectActiveCategoriesByType("EXPENSE"),
    selectAllExchangeRates(),
    selectUserBalance(),
  ]);

  return (
    <SubscriptionsClient
      subscriptions={subscriptions}
      upcomingPayments={upcomingPayments}
      initialYear={year}
      initialMonth={month}
      accounts={accounts}
      expenseCategories={expenseCategories}
      exchangeRates={exchangeRates}
      preferredCurrency={userBalance?.currency ?? "COP"}
    />
  );
}
```

**B.16. Página (Client) — `src/app/(dashboard)/subscriptions/SubscriptionsClient.tsx`**

Client Component que gestiona el estado de tabs, modales y diálogos. Tab 1: "Próximos pagos" (UpcomingPaymentsList). Tab 2: "Mis suscripciones" (lista de SubscriptionCard).

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionForm } from "@/components/forms/SubscriptionForm";
import { SubscriptionCard } from "@/components/subscriptions/SubscriptionCard";
import { UpcomingPaymentsList } from "@/components/subscriptions/UpcomingPaymentsList";
import { RegisterPaymentDialog } from "@/components/subscriptions/RegisterPaymentDialog";
import { PaymentHistoryDialog } from "@/components/subscriptions/PaymentHistoryDialog";
import { DeleteSubscriptionDialog } from "@/components/subscriptions/DeleteSubscriptionDialog";
import type { Account, Currency } from "@/core/models/account";
import type { Category } from "@/core/models/category";
import type { SubscriptionWithMeta } from "@/core/models/subscription";

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface SubscriptionsClientProps {
  subscriptions: SubscriptionWithMeta[];
  upcomingPayments: SubscriptionWithMeta[];
  initialYear: number;
  initialMonth: number;
  accounts: Account[];
  expenseCategories: Category[];
  exchangeRates: ExchangeRateRow[];
  preferredCurrency: Currency;
}

export function SubscriptionsClient({
  subscriptions,
  upcomingPayments,
  initialYear,
  initialMonth,
  accounts,
  expenseCategories,
  exchangeRates,
  preferredCurrency,
}: SubscriptionsClientProps) {
  const [tab, setTab] = useState("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionWithMeta | null>(null);
  const [paying, setPaying] = useState<SubscriptionWithMeta | null>(null);
  const [history, setHistory] = useState<SubscriptionWithMeta | null>(null);
  const [deleting, setDeleting] = useState<SubscriptionWithMeta | null>(null);

  function handleNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(s: SubscriptionWithMeta) {
    setEditing(s);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suscripciones</h1>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva suscripción
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upcoming">Próximos pagos</TabsTrigger>
          <TabsTrigger value="all">Mis suscripciones</TabsTrigger>
        </TabsList>

        {tab === "upcoming" && (
          <div className="pt-4">
            <UpcomingPaymentsList
              initialPayments={upcomingPayments}
              initialYear={initialYear}
              initialMonth={initialMonth}
              exchangeRates={exchangeRates}
              preferredCurrency={preferredCurrency}
              onPay={setPaying}
            />
          </div>
        )}

        {tab === "all" && (
          <div className="pt-4 space-y-3">
            {subscriptions.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No tienes suscripciones registradas. Crea una con el botón
                "Nueva suscripción".
              </div>
            ) : (
              subscriptions.map((s) => (
                <SubscriptionCard
                  key={s.id}
                  subscription={s}
                  onEdit={handleEdit}
                  onDelete={setDeleting}
                  onPay={setPaying}
                  onHistory={setHistory}
                />
              ))
            )}
          </div>
        )}
      </Tabs>

      <SubscriptionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        accounts={accounts}
        expenseCategories={expenseCategories}
        subscription={editing}
      />

      <RegisterPaymentDialog
        subscription={paying}
        accounts={accounts}
        exchangeRates={exchangeRates}
        onClose={() => setPaying(null)}
      />

      <PaymentHistoryDialog
        subscription={history}
        onClose={() => setHistory(null)}
      />

      <DeleteSubscriptionDialog
        subscription={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
```

> **Refresco tras mutaciones:** Las server actions (`createSubscriptionAction`, `updateSubscriptionAction`, `deleteSubscriptionAction`, `registerPaymentAction`) invocan `revalidatePath("/subscriptions")`, lo que provoca que el Server Component `page.tsx` se re-ejecute y reenvíe datos frescos al cliente. El estado local se reinicia con los datos actualizados. Para la navegación de meses sin mutación, se usa `listUpcomingPaymentsAction` directamente desde el cliente.

**B.17. Navegación — Actualizar sidebar**

Añadir el enlace a `/subscriptions` en el sidebar del dashboard. El ícono de navegación sugerido es `Repeat` de lucide-react.

---

## 4. Estructura de Archivos del Módulo

```text
src/
├── app/(dashboard)/subscriptions/
│   ├── page.tsx                          # Server Component — carga inicial
│   ├── SubscriptionsClient.tsx           # Client Component — tabs, modales, estado
│   └── actions.ts                        # Server Actions (create, update, delete, registerPayment, list, history)
├── components/
│   ├── forms/
│   │   └── SubscriptionForm.tsx          # Modal crear/editar (tabs Mensual/Anual)
│   └── subscriptions/
│       ├── SubscriptionCard.tsx          # Tarjeta individual con badges y acciones
│       ├── UpcomingPaymentsList.tsx      # Lista agrupada por fecha con navegación de mes
│       ├── RegisterPaymentDialog.tsx     # Diálogo de confirmación de pago
│       ├── PaymentHistoryDialog.tsx      # Historial paginado de pagos
│       ├── DeleteSubscriptionDialog.tsx  # Confirmación de soft delete
│       └── SubscriptionStatusBadge.tsx   # Badge de color por estado
└── core/
    ├── models/subscription.ts            # Esquemas Zod + tipos TypeScript
    ├── services/subscription.service.ts  # Reglas de negocio y orquestación
    └── db/queries/subscription.queries.ts # Consultas y RPCs
```

**Archivos modificados del Módulo 3:**

```text
src/core/models/transaction.ts            # Añadir subscription_id a schemas
src/core/db/queries/transaction.queries.ts # Añadir p_subscription_id a la llamada RPC
```

---

## 5. Matriz de Cobertura de Historias de Usuario

| HU | Descripción | Track | Implementación |
|----|-------------|-------|----------------|
| HU-4.1 | Registrar suscripción (costo, moneda, frecuencia, próximo corte) | A+B | `SubscriptionForm` + `createSubscriptionAction` + `insertSubscription` + ALTER `subscriptions` (account_id, status, deleted_at) |
| HU-4.1 | Cuenta de débito vinculada | A+B | Columna `account_id` en `subscriptions` + selector de cuenta ACTIVE en `SubscriptionForm` |
| HU-4.1 | Categoría de tipo EXPENSE | A+B | Validación en `subscription.service.ts` + `CategorySelect` con `type="EXPENSE"` |
| HU-4.1 | Editar suscripción | A+B | `SubscriptionForm` (modo editar) + `updateSubscriptionAction` + `updateSubscriptionRecord` |
| HU-4.1 | Eliminar suscripción | A+B | `DeleteSubscriptionDialog` + `deleteSubscriptionAction` + `softDeleteSubscription` (soft delete con `deleted_at`) |
| HU-4.2 | Lista de próximos pagos del mes | A+B | RPC `get_upcoming_subscription_payments` + `UpcomingPaymentsList` (navegación de meses) |
| HU-4.2 | Resumen de costo mensual | B | Cálculo en `UpcomingPaymentsList` con conversión a moneda preferida |
| HU-4.2 | Solo suscripciones ACTIVE | A | Filtro `status = 'ACTIVE'` en el RPC `get_upcoming_subscription_payments` |
| HU-4.3 | Botón "Registrar pago" | A+B | `SubscriptionCard` / `UpcomingPaymentsList` (botón condicional) + `RegisterPaymentDialog` + `registerPaymentAction` |
| HU-4.3 | Genera transacción EXPENSE automáticamente | A | RPC `register_subscription_payment` inserta transacción `EXPENSE` con `subscription_id` |
| HU-4.3 | Saldo de cuenta actualizado | A | Trigger `apply_transaction_balance` (Módulo 3) se dispara automáticamente |
| HU-4.3 | Avance de next_billing_date | A | RPC `register_subscription_payment` actualiza `next_billing_date` (+1 month / +1 year) |
| HU-4.3 | Prevención de pagos duplicados | A+B | `is_paid_this_cycle` en RPCs de listado + validación en `register_subscription_payment` |
| HU-4.3 | Conversión de moneda | A+B | `RegisterPaymentDialog` resuelve tasa desde `exchange_rates` + RPC fuerza 1.0 si misma moneda |
| HU-4.3 | Diálogo de confirmación | B | `RegisterPaymentDialog` con campos editables (monto, tasa, fecha, descripción, cuenta) |
| HU-4.3 | Descripción auto-generada | A+B | Pre-llenado "Suscripción: {name}" en `RegisterPaymentDialog` + fallback en RPC |
| (ext) | Historial de pagos por suscripción | A+B | `PaymentHistoryDialog` + `getPaymentHistoryAction` + `get_transactions_paginated` con `p_subscription_id` |
| (ext) | Estado de suscripción (ACTIVE/PAUSED/CANCELLED) | A+B | Enum `subscription_status` + `SubscriptionStatusBadge` + selector en `SubscriptionForm` (edición) |
| (ext) | Badge "Vencida" | B | Cálculo en `SubscriptionCard` (`next_billing_date < today`) |
| (ext) | Badge "Pagado" | A+B | `is_paid_this_cycle` en RPCs + `SubscriptionCard` / `UpcomingPaymentsList` |
| (ext) | Cuenta inactiva al pagar | A+B | Advertencia + selector de cuenta en `RegisterPaymentDialog` + validación en RPC |

---

## 6. Notas de Diseño

### Atomicidad del registro de pago

El RPC `register_subscription_payment` ejecuta tres operaciones críticas dentro de una sola transacción SQL:

1. **Validar** ownership, estado ACTIVE y no-duplicación del ciclo actual.
2. **Insertar** la transacción `EXPENSE` con `subscription_id` (el trigger `apply_transaction_balance` actualiza el saldo de la cuenta en cascada).
3. **Avanzar** `next_billing_date` al siguiente ciclo.

Si cualquier paso falla, se hace `ROLLBACK` automático. No hay ventana de inconsistencia: no puede existir una transacción de pago sin el avance de fecha, ni un avance de fecha sin la transacción correspondiente.

### Detección de ciclo pagado (`is_paid_this_cycle`)

La lógica para determinar si un ciclo ya fue pagado depende del `billing_cycle`:

- **MONTHLY:** Verifica si existe una transacción con `subscription_id = X` y `date_trunc('month', date) = date_trunc('month', next_billing_date)`. Es decir, si ya hay un pago en el mismo mes que la fecha de corte actual.
- **YEARLY:** Verifica si existe una transacción con `subscription_id = X` y `date_trunc('year', date) = date_trunc('year', next_billing_date)`. Es decir, si ya hay un pago en el mismo año que la fecha de corte actual.

Esta verificación se realiza tanto en los RPCs de listado (`get_subscriptions_with_meta` y `get_upcoming_subscription_payments`) como en el RPC de registro de pago (`register_subscription_payment`), asegurando consistencia entre lo que ve el usuario y lo que valida el servidor.

### Cadena de triggers (sin cambios respecto al Módulo 3)

```
INSERT en transactions (dentro de register_subscription_payment)
        │
        ▼
apply_transaction_balance()        ← trigger existente (Módulo 3)
  actualiza accounts.balance
        │
        ▼
recalculate_user_balance()         ← trigger existente (Módulo 1)
  recalcula user_balances.total_balance
```

El RPC `register_subscription_payment` inserta una transacción `EXPENSE` normal. El trigger `apply_transaction_balance` la procesa sin cambios — no sabe ni necesita saber que la transacción proviene de una suscripción. El campo `subscription_id` es metadata para trazabilidad, no afecta la lógica de saldos.

### Trazabilidad: `subscription_id` en `transactions`

La columna `subscription_id` en `transactions` cumple dos propósitos:

1. **Prevención de duplicados:** Permite verificar si ya existe una transacción de pago para el ciclo actual de una suscripción.
2. **Historial de pagos:** Permite consultar todas las transacciones generadas desde una suscripción específica, reutilizando el RPC `get_transactions_paginated` del Módulo 3 con el filtro `p_subscription_id`.

Las transacciones manuales (creadas desde el `TransactionForm` del Módulo 3) tienen `subscription_id = NULL`. Solo las transacciones generadas vía `register_subscription_payment` tienen este campo establecido.

### Modificación retrocompatible del RPC `get_transactions_paginated`

El RPC del Módulo 3 se elimina y recrece con un parámetro adicional `p_subscription_id` (default `null`) y una columna adicional `subscription_id` en el retorno. Las llamadas existentes del Módulo 3 que no pasen `p_subscription_id` seguirán funcionando porque:

1. El parámetro tiene default `null` en la firma de la función.
2. El filtro `p_subscription_id is null or t.subscription_id = p_subscription_id` se evalúa como `true` para todas las filas cuando el parámetro es `null`.
3. La columna `subscription_id` en el retorno es simplemente un campo adicional que el frontend del Módulo 3 puede ignorar (o incluir en su tipo TypeScript).

### Soft delete y normatividad archivística

La eliminación de suscripciones utiliza soft delete (`deleted_at`), consistente con:

- El patrón establecido en el Módulo 2 para categorías.
- La normatividad archivística colombiana, que requiere conservar la trazabilidad de los registros financieros.
- La integridad referencial: las transacciones de pago pasadas conservan su `subscription_id` (que apunta a una suscripción con `deleted_at IS NOT NULL`), permitiendo consultar el historial incluso después de eliminar la suscripción.

### Conversión de moneda en el resumen mensual

El resumen de costo mensual en `UpcomingPaymentsList` convierte cada monto a la moneda preferida del usuario usando las tasas de `exchange_rates`. Si no existe tasa para un par de monedas, se usa el monto original sin convertir (consistente con el comportamiento de `recalculate_user_balance`). Esto puede llevar a un total ligeramente impreciso si hay suscripciones en monedas sin tasa registrada, pero es aceptable para v1 (presupuesto cero, sin API externa de tasas).

### Integración con el Módulo 5 (Dashboard)

El Módulo 5 (Dashboard y Analítica) podrá usar los datos de suscripciones para:

- Mostrar el gasto recurrente proyectado del mes en el dashboard.
- Incluir las transacciones generadas desde suscripciones en los gráficos de gastos por categoría (ya que son transacciones `EXPENSE` normales con `category_id`).

No se requieren cambios adicionales en este módulo para soportar esa integración.

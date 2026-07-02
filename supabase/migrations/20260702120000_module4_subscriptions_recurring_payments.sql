-- Migration: Module 4 — Subscriptions & recurring payments (Track A)
-- FinApp: alters subscriptions/transactions, creates subscription_status enum,
-- adds constraints/indexes, and creates RPCs for listing, upcoming payments,
-- paginated transactions (with subscription filter) and atomic payment registration.

-- A.1 Enum subscription_status

create type public.subscription_status as enum ('ACTIVE', 'PAUSED', 'CANCELLED');

-- A.2 ALTER subscriptions: account_id, status, deleted_at

alter table public.subscriptions
  add column if not exists account_id uuid references public.accounts(id) on delete set null,
  add column if not exists status public.subscription_status not null default 'ACTIVE',
  add column if not exists deleted_at timestamptz;

-- A.3 ALTER transactions: subscription_id

alter table public.transactions
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;

-- A.4 Constraints and indexes

-- Unique subscription name per user (excluding soft-deleted rows)
create unique index if not exists subscriptions_unique_name_per_user
  on public.subscriptions (user_id, name)
  where deleted_at is null;

-- Index for upcoming payments query (active, non-deleted, by billing date)
create index if not exists idx_subscriptions_user_status_billing
  on public.subscriptions (user_id, status, next_billing_date)
  where deleted_at is null;

-- Partial index for transactions linked to a subscription

create index if not exists idx_transactions_subscription_id
  on public.transactions (subscription_id)
  where subscription_id is not null;

-- A.5 RPC get_subscriptions_with_meta()

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

-- A.6 RPC get_upcoming_subscription_payments(p_year, p_month)

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

-- A.7 Drop & recreate get_transactions_paginated() with p_subscription_id

-- Drop the previous 6-parameter signature from Module 3

drop function if exists public.get_transactions_paginated(int, int, date, date, uuid, uuid);

-- Recreate with 7 parameters (p_subscription_id added)

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

-- A.8 RPC register_subscription_payment(...)

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
  -- 1. Load subscription and validate ownership + status
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
  -- 2. Verify the current cycle has not already been paid
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
  -- 3. Determine account (override or subscription default)
  ------------------------------------------------------------------
  v_account_id := coalesce(p_account_id, v_subscription.account_id);

  if v_account_id is null then
    raise exception 'No se ha especificado una cuenta para el pago';
  end if;

  -- Validate account ownership and active status
  select a.currency into v_account_currency
    from public.accounts a
    where a.id = v_account_id
      and a.user_id = auth.uid()
      and a.status = 'ACTIVE';

  if not found then
    raise exception 'La cuenta seleccionada no existe o no está activa';
  end if;

  ------------------------------------------------------------------
  -- 4. Resolve exchange rate (force 1.0 if same currency)
  ------------------------------------------------------------------
  if v_account_currency = v_subscription.currency then
    v_exchange_rate := 1.0;
  elsif p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'Debe especificar una tasa de cambio válida para conversión de moneda';
  else
    v_exchange_rate := p_exchange_rate;
  end if;

  ------------------------------------------------------------------
  -- 5. Resolve date (default today, no future dates)
  ------------------------------------------------------------------
  v_date := coalesce(p_date, current_date);

  if v_date > current_date then
    raise exception 'La fecha no puede ser futura';
  end if;

  ------------------------------------------------------------------
  -- 6. Resolve description (default "Suscripción: {name}")
  ------------------------------------------------------------------
  v_description := coalesce(nullif(p_description, ''), 'Suscripción: ' || v_subscription.name);

  ------------------------------------------------------------------
  -- 7. Insert EXPENSE transaction (trigger updates account balance)
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
  -- 8. Advance next_billing_date to the next cycle
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
  -- 9. Return the created transaction
  ------------------------------------------------------------------
  return v_inserted_transaction;
end;
$$;

revoke execute on function public.register_subscription_payment(uuid, decimal, decimal, date, text, uuid) from public;
revoke execute on function public.register_subscription_payment(uuid, decimal, decimal, date, text, uuid) from anon;
grant execute on function public.register_subscription_payment(uuid, decimal, decimal, date, text, uuid) to authenticated;

-- Migration: Module 3 — Transactions balance trigger & paginated listing RPC
-- FinApp: creates trigger function apply_transaction_balance to keep account
-- balances in sync with transactions, and RPC get_transactions_paginated for
-- filtered/paginated history. Assumes transactions table and related objects
-- already exist from Module 1.

-- A.1 Trigger function: apply_transaction_balance
-- Updates accounts.balance after INSERT/UPDATE/DELETE on transactions.
-- For UPDATE it first reverts the OLD effect then applies the NEW effect.
-- Security definer so it can update accounts.balance regardless of RLS.

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
      update public.accounts
        set balance = balance + OLD.amount
        where id = OLD.from_account_id;
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

-- Revoke direct execution: this function must only run via trigger
revoke execute on function public.apply_transaction_balance() from public;
revoke execute on function public.apply_transaction_balance() from anon;
revoke execute on function public.apply_transaction_balance() from authenticated;

-- A.2 Triggers on public.transactions

create trigger transactions_balance_after_insert
  after insert on public.transactions
  for each row execute function public.apply_transaction_balance();

create trigger transactions_balance_after_update
  after update on public.transactions
  for each row execute function public.apply_transaction_balance();

create trigger transactions_balance_after_delete
  after delete on public.transactions
  for each row execute function public.apply_transaction_balance();

-- A.3 RPC: get_transactions_paginated
-- Returns transactions for the authenticated user with optional filters
-- (date range, account, category), joined account/category metadata,
-- ordered by date desc, and total_count via a window function.

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

-- A.4 Security hardening
-- apply_transaction_balance is only callable via trigger (revoked above).
-- get_transactions_paginated is security definer with search_path = public
-- and restricted to the authenticated role.

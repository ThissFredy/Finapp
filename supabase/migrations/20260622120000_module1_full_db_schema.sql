-- Migration: Module 1 — Accounts & full backend schema (Track A)
-- FinApp: creates enums, tables accounts/categories/transactions/subscriptions,
-- support tables exchange_rates/user_balances, RLS policies, RPC and triggers.
-- NOTE: preferred_currency, profiles, handle_new_user and on_auth_user_created
-- were created in Module 0 and are intentionally NOT recreated here.

-- A.1 Enums

create type public.account_type as enum ('DEBIT', 'CREDIT', 'CASH');
create type public.account_status as enum ('ACTIVE', 'INACTIVE');
create type public.category_type as enum ('INCOME', 'EXPENSE');
create type public.transaction_type as enum ('INCOME', 'EXPENSE', 'TRANSFER');
create type public.billing_cycle as enum ('MONTHLY', 'YEARLY');

-- A.2 Table public.accounts

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

alter table public.accounts
  add constraint chk_cash_non_negative
  check (type <> 'CASH' or balance >= 0);

create index idx_accounts_user_id on public.accounts(user_id);
create index idx_accounts_user_status on public.accounts(user_id, status);

-- A.3 Table public.categories

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

-- A.4 Table public.transactions

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

-- A.5 Table public.subscriptions

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

-- A.6 Support table public.exchange_rates

create table public.exchange_rates (
  from_currency public.preferred_currency not null,
  to_currency public.preferred_currency not null,
  rate decimal(18,6) not null,
  fetched_at timestamptz not null default now(),
  primary key (from_currency, to_currency)
);

-- A.7 Support table public.user_balances

create table public.user_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_balance decimal(18,2) not null default 0,
  currency public.preferred_currency not null default 'COP',
  updated_at timestamptz not null default now()
);

-- A.8 Enable RLS on all new tables

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.user_balances enable row level security;

-- A.9 RLS policies

-- accounts: full CRUD for owner
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

-- categories: full CRUD for owner
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

-- transactions: full CRUD for owner
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

-- subscriptions: full CRUD for owner
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

-- exchange_rates: read-only for authenticated users
create policy "exchange_rates_select_authenticated"
  on public.exchange_rates for select
  using (auth.uid() is not null);

-- user_balances: read-only for owner
create policy "user_balances_select_own"
  on public.user_balances for select
  using (user_id = auth.uid());

-- A.10 RPC get_accounts_with_meta

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

-- A.11 updated_at trigger function and triggers

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

-- A.12 Trigger recalculate_user_balance

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
  if TG_OP = 'DELETE' then
    user_uuid := OLD.user_id;
  else
    user_uuid := NEW.user_id;
  end if;

  select preferred_currency into pref_currency
  from public.profiles
  where id = user_uuid;

  if pref_currency is null then
    pref_currency := 'COP';
  end if;

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
        total := total + acc_balance;
      else
        total := total + (acc_balance * conv_rate);
      end if;
    end if;
  end loop;

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

-- A.13 Advisor fixes — ensure trigger/security functions are not exposed via API

-- Set search_path on update_updated_at to avoid mutable search_path warning
alter function public.update_updated_at() set search_path = public;

-- Revoke direct execution of trigger functions from API roles
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.handle_new_user() from anon;

revoke execute on function public.recalculate_user_balance() from public;
revoke execute on function public.recalculate_user_balance() from authenticated;
revoke execute on function public.recalculate_user_balance() from anon;

-- get_accounts_with_meta is intentionally callable by authenticated users only
revoke execute on function public.get_accounts_with_meta() from anon;

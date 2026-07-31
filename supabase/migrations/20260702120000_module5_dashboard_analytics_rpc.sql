-- Migration: Module 5 — Dashboard analytics RPCs
-- FinApp: creates 5 read-only RPC functions for the dashboard:
--   get_dashboard_monthly_summary
--   get_dashboard_expenses_by_category
--   get_dashboard_net_worth_by_account
--   get_dashboard_subscriptions
--   get_dashboard_recent_transactions
-- Assumes profiles, accounts, categories, transactions, subscriptions and
-- exchange_rates already exist from previous modules.

-- B.1 RPC: get_dashboard_monthly_summary
-- Returns total income, total expense and net savings for the current calendar
-- month, converted to the user's preferred_currency using exchange_rates.
-- Transfer transactions are excluded.

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


-- B.2 RPC: get_dashboard_expenses_by_category
-- Returns expenses for the current calendar month grouped by category,
-- converted to the user's preferred_currency. Only categories with amount > 0.

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


-- B.3 RPC: get_dashboard_net_worth_by_account
-- Returns active accounts with balances converted to the user's preferred_currency.
-- CREDIT accounts are treated as debt. Repeats totals in every row for easy extraction.

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
      a.id,
      a.name,
      a.type,
      a.currency,
      a.balance,
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
    (ac.type = 'CREDIT') asc,
    ac.name asc;
end;
$$;

revoke execute on function public.get_dashboard_net_worth_by_account() from public;
revoke execute on function public.get_dashboard_net_worth_by_account() from anon;
grant execute on function public.get_dashboard_net_worth_by_account() to authenticated;


-- B.4 RPC: get_dashboard_subscriptions
-- Returns all subscriptions for the user with category metadata, ordered by
-- next billing date ascending.

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


-- B.5 RPC: get_dashboard_recent_transactions
-- Returns the latest N transactions with account and category metadata.
-- For transfers, account_name is built as "origin → destination".

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


-- B.6 Security hardening
-- All dashboard RPCs are security definer with search_path = public.
-- They use auth.uid() internally and are restricted to authenticated users.

-- Migration: Module 6 — Rename transaction/category enum labels to Spanish
-- FinApp: renames enum labels only. No tables or columns are changed.
--
-- Target labels:
--   category_type:  INCOME -> INGRESO, EXPENSE -> GASTO
--   transaction_type: INCOME -> INGRESO, EXPENSE -> GASTO, TRANSFER -> MIGRACIÓN

-- A.1 Rename enum labels
alter type public.category_type rename value 'INCOME' to 'INGRESO';
alter type public.category_type rename value 'EXPENSE' to 'GASTO';

alter type public.transaction_type rename value 'INCOME' to 'INGRESO';
alter type public.transaction_type rename value 'EXPENSE' to 'GASTO';
alter type public.transaction_type rename value 'TRANSFER' to 'MIGRACIÓN';

-- A.2 Trigger function: apply_transaction_balance
-- Updates account balances using the renamed transaction_type labels.
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
    if OLD.type = 'INGRESO' then
      update public.accounts
        set balance = balance - (OLD.amount * OLD.exchange_rate)
        where id = OLD.account_id;
    elsif OLD.type = 'GASTO' then
      update public.accounts
        set balance = balance + (OLD.amount * OLD.exchange_rate)
        where id = OLD.account_id;
    elsif OLD.type = 'MIGRACIÓN' then
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
    if OLD.type = 'INGRESO' then
      update public.accounts
        set balance = balance - (OLD.amount * OLD.exchange_rate)
        where id = OLD.account_id;
    elsif OLD.type = 'GASTO' then
      update public.accounts
        set balance = balance + (OLD.amount * OLD.exchange_rate)
        where id = OLD.account_id;
    elsif OLD.type = 'MIGRACIÓN' then
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
  if NEW.type = 'INGRESO' then
    update public.accounts
      set balance = balance + (NEW.amount * NEW.exchange_rate)
      where id = NEW.account_id;
  elsif NEW.type = 'GASTO' then
    update public.accounts
      set balance = balance - (NEW.amount * NEW.exchange_rate)
      where id = NEW.account_id;
  elsif NEW.type = 'MIGRACIÓN' then
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

-- A.3 RPC: get_dashboard_monthly_summary
-- Returns the current month totals using the renamed transaction_type labels.
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
      case when t.type = 'INGRESO'
        then t.amount * coalesce(
          (select rate from public.exchange_rates
           where from_currency = t.currency and to_currency = pref_currency),
          1.0
        )
        else 0
      end
    ), 0)::decimal(18,2) as total_income,

    coalesce(sum(
      case when t.type = 'GASTO'
        then t.amount * coalesce(
          (select rate from public.exchange_rates
           where from_currency = t.currency and to_currency = pref_currency),
          1.0
        )
        else 0
      end
    ), 0)::decimal(18,2) as total_expense,

    coalesce(sum(
      case when t.type = 'INGRESO'
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
    and t.type in ('INGRESO', 'GASTO')
    and t.date >= month_start
    and t.date < month_end;
end;
$$;

revoke execute on function public.get_dashboard_monthly_summary() from public;
revoke execute on function public.get_dashboard_monthly_summary() from anon;
grant execute on function public.get_dashboard_monthly_summary() to authenticated;

-- A.4 RPC: get_dashboard_expenses_by_category
-- Returns monthly expenses grouped by category.
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
    and t.type = 'GASTO'
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

-- A.5 RPC register_subscription_payment(...)

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
  -- 7. Insert GASTO transaction (trigger updates account balance)
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
    'GASTO',
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

-- Migration: Module 2 — Categories soft delete & RPC (Track A)
-- FinApp: extends public.categories with deleted_at, makes icon NOT NULL,
-- adds partial unique index, listing index, and RPC helpers for the frontend.

-- A.1 Alter table public.categories: soft delete column and icon constraints

alter table public.categories
  add column if not exists deleted_at timestamptz;

-- Backfill existing rows with a default icon before enforcing NOT NULL
update public.categories
  set icon = 'tag'
  where icon is null;

alter table public.categories
  alter column icon set not null,
  alter column icon set default 'tag';

-- A.2 Partial unique index: one active name per user and type

create unique index if not exists categories_unique_name_per_type
  on public.categories (user_id, name, type)
  where deleted_at is null;

-- A.3 Composite index for grouped listing by user, type and name

create index if not exists idx_categories_user_type_name
  on public.categories (user_id, type, name)
  where deleted_at is null;

-- A.4 RPC: list user categories with has_transactions flag

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
revoke execute on function public.get_categories_with_meta() from anon;
grant execute on function public.get_categories_with_meta() to authenticated;

-- A.5 RPC: reassign transactions from source to target category and hard delete source

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
  -- Validate ownership of both categories
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

  -- Reassign transactions atomically (the function runs inside a transaction)
  update public.transactions
    set category_id = p_target_category_id
    where category_id = p_source_category_id
      and user_id = auth.uid();

  -- Hard delete the source category
  delete from public.categories
    where id = p_source_category_id
      and user_id = auth.uid();
end;
$$;

revoke execute on function public.reassign_category_transactions(uuid, uuid) from public;
revoke execute on function public.reassign_category_transactions(uuid, uuid) from anon;
grant execute on function public.reassign_category_transactions(uuid, uuid) to authenticated;

-- A.6 Security hardening
-- Both RPC functions above are security definer with search_path = public.
-- Execution is restricted to the authenticated role only.

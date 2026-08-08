begin;

create schema if not exists extensions;
create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint memberships_one_organization_per_user unique (user_id)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  constraint accounts_organization_id_id_key unique (organization_id, id)
);

create table public.activity_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  account_id uuid not null,
  entry_type text not null default 'note' check (entry_type = 'note'),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_by uuid not null,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  constraint activity_entries_account_tenant_fkey
    foreign key (organization_id, account_id)
    references public.accounts (organization_id, id)
    on delete cascade,
  constraint activity_entries_creator_membership_fkey
    foreign key (organization_id, created_by)
    references public.memberships (organization_id, user_id),
  constraint activity_entries_tenant_idempotency_key
    unique (organization_id, idempotency_key)
);

create index activity_entries_account_newest_idx
  on public.activity_entries (organization_id, account_id, created_at desc, id desc);

comment on constraint memberships_one_organization_per_user on public.memberships is
  'This vertical slice assigns one active tenant to each identity; multi-membership would require an explicit tenant selector.';
comment on constraint activity_entries_account_tenant_fkey on public.activity_entries is
  'The account and activity organization must match, preventing inconsistent cross-tenant references.';
comment on constraint activity_entries_tenant_idempotency_key on public.activity_entries is
  'Each tenant accepts a given create-operation idempotency key at most once.';

create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.memberships as membership
      where membership.organization_id = p_organization_id
        and membership.user_id = (select auth.uid())
    );
$$;

comment on function private.is_org_member(uuid) is
  'Non-recursive RLS helper evaluated from the authenticated JWT subject.';

create or replace function private.prepare_activity_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to create an activity entry.';
  end if;

  select account.organization_id
    into v_organization_id
  from public.accounts as account
  where account.id = new.account_id
    and exists (
      select 1
      from public.memberships as membership
      where membership.organization_id = account.organization_id
        and membership.user_id = v_user_id
    );

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Account not found or is not accessible.';
  end if;

  new.organization_id := v_organization_id;
  new.created_by := v_user_id;
  new.body := btrim(new.body);
  return new;
end;
$$;

create trigger activity_entries_derive_tenant_and_author
before insert on public.activity_entries
for each row execute function private.prepare_activity_entry();

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.accounts enable row level security;
alter table public.activity_entries enable row level security;

create policy organizations_select_for_members
on public.organizations for select to authenticated
using (private.is_org_member(id));

create policy memberships_select_for_coworkers
on public.memberships for select to authenticated
using (private.is_org_member(organization_id));

create policy accounts_select_for_members
on public.accounts for select to authenticated
using (private.is_org_member(organization_id));

create policy activity_entries_select_for_members
on public.activity_entries for select to authenticated
using (private.is_org_member(organization_id));

create policy activity_entries_insert_for_members
on public.activity_entries for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.is_org_member(organization_id)
  and exists (
    select 1
    from public.accounts as account
    where account.id = activity_entries.account_id
      and account.organization_id = activity_entries.organization_id
  )
);

create or replace function public.get_my_workspace()
returns table (
  organization_id uuid,
  organization_name text,
  display_name text,
  account_id uuid,
  account_name text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    organization.id,
    organization.name,
    membership.display_name,
    account.id,
    account.name
  from public.memberships as membership
  join public.organizations as organization
    on organization.id = membership.organization_id
  left join public.accounts as account
    on account.organization_id = membership.organization_id
  where membership.user_id = (select auth.uid())
  order by account.name asc;
$$;

create or replace function public.get_account_activity(p_account_id uuid)
returns table (
  id uuid,
  account_id uuid,
  body text,
  author_user_id uuid,
  author_name text,
  created_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  select account.organization_id
    into v_organization_id
  from public.accounts as account
  where account.id = p_account_id;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Account not found or is not accessible.';
  end if;

  return query
  select
    entry.id,
    entry.account_id,
    entry.body,
    entry.created_by,
    membership.display_name,
    entry.created_at
  from public.activity_entries as entry
  join public.memberships as membership
    on membership.organization_id = entry.organization_id
   and membership.user_id = entry.created_by
  where entry.organization_id = v_organization_id
    and entry.account_id = p_account_id
  order by entry.created_at desc, entry.id desc;
end;
$$;

create or replace function public.create_account_note(
  p_account_id uuid,
  p_body text,
  p_idempotency_key uuid
)
returns table (
  id uuid,
  account_id uuid,
  body text,
  author_user_id uuid,
  author_name text,
  created_at timestamptz,
  was_duplicate boolean
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_clean_body text := btrim(p_body);
  v_entry public.activity_entries%rowtype;
  v_was_duplicate boolean := false;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'An idempotency key is required.';
  end if;

  if v_clean_body is null or char_length(v_clean_body) = 0 then
    raise exception using errcode = '22023', message = 'Note text is required.';
  end if;

  if char_length(v_clean_body) > 2000 then
    raise exception using errcode = '22023', message = 'Note text must be 2000 characters or fewer.';
  end if;

  select account.organization_id
    into v_organization_id
  from public.accounts as account
  where account.id = p_account_id;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Account not found or is not accessible.';
  end if;

  insert into public.activity_entries (account_id, body, idempotency_key)
  values (p_account_id, v_clean_body, p_idempotency_key)
  on conflict on constraint activity_entries_tenant_idempotency_key do nothing
  returning * into v_entry;

  if not found then
    v_was_duplicate := true;

    select entry.*
      into v_entry
    from public.activity_entries as entry
    where entry.organization_id = v_organization_id
      and entry.idempotency_key = p_idempotency_key;

    if not found then
      raise exception using
        errcode = '40001',
        message = 'Concurrent idempotent request could not be resolved; retry the request.';
    end if;

    if v_entry.created_by <> v_user_id
      or v_entry.account_id <> p_account_id
      or v_entry.body <> v_clean_body
    then
      raise exception using
        errcode = '22023',
        message = 'The idempotency key was already used with a different request.';
    end if;
  end if;

  return query
  select
    v_entry.id,
    v_entry.account_id,
    v_entry.body,
    v_entry.created_by,
    membership.display_name,
    v_entry.created_at,
    v_was_duplicate
  from public.memberships as membership
  where membership.organization_id = v_entry.organization_id
    and membership.user_id = v_entry.created_by;
end;
$$;

comment on function public.get_my_workspace() is
  'Returns only the authenticated user tenant and its accounts through RLS.';
comment on function public.get_account_activity(uuid) is
  'Returns an accessible account activity feed newest first.';
comment on function public.create_account_note(uuid, text, uuid) is
  'Derives tenant and author in PostgreSQL and creates at most one note for an idempotency key.';

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
grant usage on schema public to authenticated, service_role;

revoke all on function private.is_org_member(uuid) from public, anon, authenticated;
grant execute on function private.is_org_member(uuid) to authenticated, service_role;
revoke all on function private.prepare_activity_entry() from public, anon, authenticated;

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.memberships from anon, authenticated;
revoke all on table public.accounts from anon, authenticated;
revoke all on table public.activity_entries from anon, authenticated;
grant select on table public.organizations, public.memberships, public.accounts, public.activity_entries to authenticated;
grant insert (account_id, body, idempotency_key) on table public.activity_entries to authenticated;
grant all on table public.organizations, public.memberships, public.accounts, public.activity_entries to service_role;

revoke all on function public.get_my_workspace() from public, anon;
revoke all on function public.get_account_activity(uuid) from public, anon;
revoke all on function public.create_account_note(uuid, text, uuid) from public, anon;
grant execute on function public.get_my_workspace() to authenticated, service_role;
grant execute on function public.get_account_activity(uuid) to authenticated, service_role;
grant execute on function public.create_account_note(uuid, text, uuid) to authenticated, service_role;

commit;


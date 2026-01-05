create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  locale text not null default 'en' check (locale in ('en', 'th')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;
revoke all on public.user_profiles from anon, authenticated;
grant select, update on public.user_profiles to authenticated;

create or replace function private.shares_organization(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships caller
    join public.memberships target
      on target.organization_id = caller.organization_id
    where caller.user_id = (select auth.uid())
      and target.user_id = target_user_id
  );
$$;

revoke all on function private.shares_organization(uuid) from public, anon;
grant execute on function private.shares_organization(uuid) to authenticated;

create policy user_profiles_select_colleague
on public.user_profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.shares_organization(user_id))
);

create policy user_profiles_update_self
on public.user_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, 'staff'), '@', 1)
  );

  insert into public.user_profiles (user_id, display_name)
  values (new.id, left(profile_name, 120));
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger auth_user_profile_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger branches_set_updated_at
before update on public.branches
for each row execute function private.set_updated_at();

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function private.set_updated_at();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.membership_role as enum ('owner', 'admin', 'manager', 'cashier', 'kitchen');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organizations_created_by_idx on public.organizations (created_by);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,15}$'),
  timezone text not null default 'Asia/Bangkok',
  currency text not null default 'THB' check (currency in ('THB', 'MMK')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create index branches_organization_id_idx on public.branches (organization_id);

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index memberships_user_id_organization_id_idx
  on public.memberships (user_id, organization_id);

create table public.branch_assignments (
  branch_id uuid not null references public.branches(id) on delete cascade,
  organization_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (branch_id, user_id),
  foreign key (organization_id, user_id)
    references public.memberships (organization_id, user_id) on delete cascade,
  foreign key (organization_id, branch_id)
    references public.branches (organization_id, id) on delete cascade
);

create index branch_assignments_membership_idx
  on public.branch_assignments (organization_id, user_id);
create index branch_assignments_user_id_idx
  on public.branch_assignments (user_id);

alter table public.organizations enable row level security;
alter table public.organizations force row level security;
alter table public.branches enable row level security;
alter table public.branches force row level security;
alter table public.memberships enable row level security;
alter table public.memberships force row level security;
alter table public.branch_assignments enable row level security;
alter table public.branch_assignments force row level security;

revoke all on public.organizations, public.branches, public.memberships, public.branch_assignments
  from anon, authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, insert, update on public.branches to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, delete on public.branch_assignments to authenticated;

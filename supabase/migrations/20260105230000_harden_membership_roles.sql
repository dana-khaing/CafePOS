drop policy memberships_insert_admin on public.memberships;
drop policy memberships_update_admin on public.memberships;
drop policy memberships_delete_owner on public.memberships;

revoke update on public.organizations from authenticated;
grant update (name, slug) on public.organizations to authenticated;

revoke update on public.branches from authenticated;
grant update (name, code, timezone, currency) on public.branches to authenticated;

revoke update on public.memberships from authenticated;
grant update (role) on public.memberships to authenticated;

create policy memberships_insert_guarded
on public.memberships for insert to authenticated
with check (
  (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1 from public.organizations
      where id = organization_id and created_by = (select auth.uid())
    )
  )
  or (
    role <> 'owner'
    and (
      (select private.has_org_role(
        organization_id,
        array['owner']::public.membership_role[]
      ))
      or (
        role in ('manager', 'cashier', 'kitchen')
        and (select private.has_org_role(
          organization_id,
          array['admin']::public.membership_role[]
        ))
      )
    )
  )
);

create policy memberships_update_guarded
on public.memberships for update to authenticated
using (
  role <> 'owner'
  and (
    (select private.has_org_role(
      organization_id,
      array['owner']::public.membership_role[]
    ))
    or (
      role in ('manager', 'cashier', 'kitchen')
      and (select private.has_org_role(
        organization_id,
        array['admin']::public.membership_role[]
      ))
    )
  )
)
with check (
  role <> 'owner'
  and (
    (select private.has_org_role(
      organization_id,
      array['owner']::public.membership_role[]
    ))
    or (
      role in ('manager', 'cashier', 'kitchen')
      and (select private.has_org_role(
        organization_id,
        array['admin']::public.membership_role[]
      ))
    )
  )
);

create policy memberships_delete_guarded
on public.memberships for delete to authenticated
using (
  role <> 'owner'
  and (
    (select private.has_org_role(
      organization_id,
      array['owner']::public.membership_role[]
    ))
    or (
      role in ('manager', 'cashier', 'kitchen')
      and (select private.has_org_role(
        organization_id,
        array['admin']::public.membership_role[]
      ))
    )
  )
);

comment on table public.memberships is
  'Owner rows are immutable through client RLS. Ownership transfer requires a reviewed server-side operation.';

create or replace function private.member_has_role(
  target_organization_id uuid,
  target_user_id uuid,
  allowed_roles public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.memberships caller
      where caller.organization_id = target_organization_id
        and caller.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.memberships target
      where target.organization_id = target_organization_id
        and target.user_id = target_user_id
        and target.role = any (allowed_roles)
    );
$$;

revoke all on function private.member_has_role(uuid, uuid, public.membership_role[])
  from public, anon;
grant execute on function private.member_has_role(uuid, uuid, public.membership_role[])
  to authenticated;

drop policy branch_assignments_insert_manager on public.branch_assignments;
drop policy branch_assignments_delete_manager on public.branch_assignments;

create policy branch_assignments_insert_guarded
on public.branch_assignments for insert to authenticated
with check (
  (select private.has_org_role(
    organization_id,
    array['owner', 'admin']::public.membership_role[]
  ))
  or (
    (select private.has_org_role(
      organization_id,
      array['manager']::public.membership_role[]
    ))
    and (select private.member_has_role(
      organization_id,
      user_id,
      array['cashier', 'kitchen']::public.membership_role[]
    ))
  )
);

create policy branch_assignments_delete_guarded
on public.branch_assignments for delete to authenticated
using (
  (select private.has_org_role(
    organization_id,
    array['owner', 'admin']::public.membership_role[]
  ))
  or (
    (select private.has_org_role(
      organization_id,
      array['manager']::public.membership_role[]
    ))
    and (select private.member_has_role(
      organization_id,
      user_id,
      array['cashier', 'kitchen']::public.membership_role[]
    ))
  )
);

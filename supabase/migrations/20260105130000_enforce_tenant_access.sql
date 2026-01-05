create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.has_org_role(
  target_organization_id uuid,
  allowed_roles public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
      and role = any (allowed_roles)
  );
$$;

revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.has_org_role(uuid, public.membership_role[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.membership_role[]) to authenticated;

create policy organizations_select_member
on public.organizations for select to authenticated
using (
  created_by = (select auth.uid())
  or (select private.is_org_member(id))
);

create policy organizations_insert_owner
on public.organizations for insert to authenticated
with check (created_by = (select auth.uid()));

create policy organizations_update_admin
on public.organizations for update to authenticated
using (
  (select private.has_org_role(id, array['owner', 'admin']::public.membership_role[]))
)
with check (
  (select private.has_org_role(id, array['owner', 'admin']::public.membership_role[]))
);

create policy memberships_select_member
on public.memberships for select to authenticated
using ((select private.is_org_member(organization_id)));

create policy memberships_insert_admin
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
  or (select private.has_org_role(
    organization_id,
    array['owner', 'admin']::public.membership_role[]
  ))
);

create policy memberships_update_admin
on public.memberships for update to authenticated
using ((select private.has_org_role(
  organization_id,
  array['owner', 'admin']::public.membership_role[]
)))
with check ((select private.has_org_role(
  organization_id,
  array['owner', 'admin']::public.membership_role[]
)));

create policy memberships_delete_owner
on public.memberships for delete to authenticated
using ((select private.has_org_role(
  organization_id,
  array['owner']::public.membership_role[]
)));

create policy branches_select_member
on public.branches for select to authenticated
using ((select private.is_org_member(organization_id)));

create policy branches_insert_admin
on public.branches for insert to authenticated
with check ((select private.has_org_role(
  organization_id,
  array['owner', 'admin']::public.membership_role[]
)));

create policy branches_update_manager
on public.branches for update to authenticated
using ((select private.has_org_role(
  organization_id,
  array['owner', 'admin', 'manager']::public.membership_role[]
)))
with check ((select private.has_org_role(
  organization_id,
  array['owner', 'admin', 'manager']::public.membership_role[]
)));

create policy branch_assignments_select_member
on public.branch_assignments for select to authenticated
using ((select private.is_org_member(organization_id)));

create policy branch_assignments_insert_manager
on public.branch_assignments for insert to authenticated
with check ((select private.has_org_role(
  organization_id,
  array['owner', 'admin', 'manager']::public.membership_role[]
)));

create policy branch_assignments_delete_manager
on public.branch_assignments for delete to authenticated
using ((select private.has_org_role(
  organization_id,
  array['owner', 'admin', 'manager']::public.membership_role[]
)));

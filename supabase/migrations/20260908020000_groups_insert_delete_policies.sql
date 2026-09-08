-- ------------------------------------------------------------
-- RLS GAP CLOSURE: groups / group_members INSERT + DELETE policies
-- ------------------------------------------------------------
-- P1 (20260908000000_init_schema.sql) only defined SELECT policies for
-- groups and group_members. is_admin() is a helper function, not a
-- bypass: without a policy referencing it, every insert/delete on these
-- tables is rejected by RLS regardless of role. This migration adds the
-- missing admin-only INSERT/DELETE policies used by the P4 admin-web
-- group management UI. No existing policy is modified or replaced.

-- ---------------- groups ----------------

create policy "groups_insert_admin"
  on groups for insert
  with check (
    public.is_admin()
    and created_by = auth.uid()
  );

-- ---------------- group_members ----------------

create policy "group_members_insert_admin"
  on group_members for insert
  with check (public.is_admin());

create policy "group_members_delete_admin"
  on group_members for delete
  using (public.is_admin());

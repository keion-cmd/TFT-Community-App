-- ------------------------------------------------------------
-- RLS BUG FIX: infinite recursion in group_members_select_member
-- ------------------------------------------------------------
-- P1 (20260908000000_init_schema.sql) defined "group_members_select_member"
-- with a USING clause that subqueries group_members from within its own
-- policy:
--   exists (select 1 from group_members gm where gm.group_id = ... )
-- Postgres detects this self-reference and raises 42P17 "infinite
-- recursion detected in policy for relation group_members" whenever a
-- non-admin queries group_members directly, or indirectly via any policy
-- on another table that references group_members (e.g.
-- profiles_select_shared_group from 20260908030000). Admin queries never
-- hit this path because group_members_select_admin uses is_admin(), which
-- does not self-reference group_members.
--
-- Fix: add a SECURITY DEFINER helper (is_member_of_group), matching the
-- existing is_admin() pattern, and rebuild the policy to call it instead
-- of subquerying group_members inline. A SECURITY DEFINER function body
-- is not subject to the caller's RLS on the table it queries, so this
-- breaks the recursive policy evaluation.

create or replace function public.is_member_of_group(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from group_members
    where group_id = target_group_id and user_id = auth.uid()
  );
$$;

drop policy if exists "group_members_select_member" on group_members;

create policy "group_members_select_member"
  on group_members for select
  using (public.is_member_of_group(group_id));

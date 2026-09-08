-- ------------------------------------------------------------
-- RLS GAP CLOSURE: shared_links INSERT policy
-- ------------------------------------------------------------
-- P1 (20260908000000_init_schema.sql) only defined SELECT policies for
-- shared_links. The P6 admin-web link broadcast tool inserts a row here
-- before writing the corresponding chat message; without this policy the
-- insert is rejected by RLS. No existing policy is modified or replaced.

create policy "shared_links_insert_admin"
  on shared_links for insert
  with check (public.is_admin());

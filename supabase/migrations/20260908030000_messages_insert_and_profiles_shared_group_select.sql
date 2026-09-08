-- ------------------------------------------------------------
-- RLS GAP CLOSURE: messages INSERT + profiles shared-group SELECT
-- ------------------------------------------------------------
-- P5 (20260908000000_init_schema.sql / a009d50) shipped the mobile
-- messenger UI but only defined a SELECT policy for messages, so no
-- member can send a message under RLS. It also left profiles readable
-- only for your own row (plus admin), so other members' names are
-- unavailable and render as "Member" in chat/member lists. This
-- migration adds the two missing policies. No existing policy is
-- modified or replaced.

-- ---------------- messages ----------------

create policy "messages_insert_member"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and (
      exists (
        select 1 from group_members
        where group_members.group_id = messages.group_id
          and group_members.user_id = auth.uid()
      )
      or public.is_admin()
    )
  );

-- ---------------- profiles ----------------

create policy "profiles_select_shared_group"
  on profiles for select
  using (
    exists (
      select 1
      from group_members gm_self
      join group_members gm_target
        on gm_target.group_id = gm_self.group_id
      where gm_self.user_id = auth.uid()
        and gm_target.user_id = profiles.user_id
    )
  );

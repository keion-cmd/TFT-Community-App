-- ============================================================
-- TFT Community App — Initial Schema
-- Tables: profiles, attendance, groups, group_members, messages, shared_links
-- ============================================================

-- ------------------------------------------------------------
-- EXTENSIONS
-- ------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_url text,
  checked_in_at timestamptz,
  status text,
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  content text,
  type text,
  created_at timestamptz not null default now()
);

create table if not exists shared_links (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  title text,
  shared_by uuid not null references auth.users (id) on delete cascade,
  group_id uuid references groups (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PROFILE CREATION ON SIGNUP
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'member');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table profiles enable row level security;
alter table attendance enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table messages enable row level security;
alter table shared_links enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where profiles.user_id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

-- ---------------- profiles ----------------

create policy "profiles_select_own"
  on profiles for select
  using (user_id = auth.uid());

create policy "profiles_select_admin"
  on profiles for select
  using (public.is_admin());

create policy "profiles_insert_own"
  on profiles for insert
  with check (user_id = auth.uid());

-- ---------------- attendance ----------------

create policy "attendance_select_own"
  on attendance for select
  using (user_id = auth.uid());

create policy "attendance_select_admin"
  on attendance for select
  using (public.is_admin());

create policy "attendance_insert_own"
  on attendance for insert
  with check (user_id = auth.uid());

-- ---------------- groups ----------------

create policy "groups_select_member"
  on groups for select
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
        and group_members.user_id = auth.uid()
    )
  );

create policy "groups_select_admin"
  on groups for select
  using (public.is_admin());

-- ---------------- group_members ----------------

create policy "group_members_select_member"
  on group_members for select
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
    )
  );

create policy "group_members_select_admin"
  on group_members for select
  using (public.is_admin());

-- ---------------- messages ----------------

create policy "messages_select_member"
  on messages for select
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = messages.group_id
        and group_members.user_id = auth.uid()
    )
  );

create policy "messages_select_admin"
  on messages for select
  using (public.is_admin());

-- ---------------- shared_links ----------------

create policy "shared_links_select_member"
  on shared_links for select
  using (
    group_id is null
    or exists (
      select 1 from group_members
      where group_members.group_id = shared_links.group_id
        and group_members.user_id = auth.uid()
    )
  );

create policy "shared_links_select_admin"
  on shared_links for select
  using (public.is_admin());

-- ============================================================
-- Attendance Photos Storage Bucket + RLS Policies
-- Bucket: attendance-photos (private)
-- ============================================================

-- ------------------------------------------------------------
-- BUCKET
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('attendance-photos', 'attendance-photos', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- STORAGE OBJECT POLICIES (attendance-photos only)
-- ------------------------------------------------------------
-- Objects are expected to be stored under a "{user_id}/..." path prefix.

create policy "attendance_photos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'attendance-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attendance_photos_select_own"
  on storage.objects for select
  using (
    bucket_id = 'attendance-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attendance_photos_select_admin"
  on storage.objects for select
  using (
    bucket_id = 'attendance-photos'
    and public.is_admin()
  );

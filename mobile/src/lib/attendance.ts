import { supabase, ATTENDANCE_PHOTOS_BUCKET } from "./supabase";

function startOfTodayIso(): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export async function getTodayAttendance(userId: string) {
  const { data, error } = await supabase
    .from("attendance")
    .select("id, checked_in_at, status")
    .eq("user_id", userId)
    .gte("checked_in_at", startOfTodayIso())
    .order("checked_in_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

export async function getSignedAttendancePhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(ATTENDANCE_PHOTOS_BUCKET)
    .createSignedUrl(path, 3600);

  if (error) throw error;
  return data.signedUrl;
}

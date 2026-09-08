"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAdminGuard } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";

type AttendanceRecord = {
  id: string;
  checked_in_at: string;
  photo_url: string | null;
  thumbnailUrl: string | null;
};

const SIGNED_URL_TTL_SECONDS = 3600;

export default function MemberDetailPage() {
  const { session, checking } = useAdminGuard();
  const params = useParams<{ id: string }>();
  const memberId = params?.id;

  const [fullName, setFullName] = useState<string | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !memberId) return;

    async function loadMember() {
      const [profileResult, historyResult] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", memberId).single(),
        supabase
          .from("attendance")
          .select("id, checked_in_at, photo_url")
          .eq("user_id", memberId)
          .order("checked_in_at", { ascending: false }),
      ]);

      if (profileResult.error || historyResult.error) {
        setError(
          profileResult.error?.message ??
            historyResult.error?.message ??
            "Failed to load member."
        );
        setLoading(false);
        return;
      }

      const records = historyResult.data ?? [];
      const withThumbnails: AttendanceRecord[] = await Promise.all(
        records.map(async (record) => {
          if (!record.photo_url) {
            return { ...record, thumbnailUrl: null };
          }
          const { data: signed } = await supabase.storage
            .from("attendance-photos")
            .createSignedUrl(record.photo_url, SIGNED_URL_TTL_SECONDS);
          return { ...record, thumbnailUrl: signed?.signedUrl ?? null };
        })
      );

      setFullName(profileResult.data?.full_name ?? null);
      setHistory(withThumbnails);
      setLoading(false);
    }

    loadMember();
  }, [session, memberId]);

  if (checking || !session) {
    return (
      <main>
        <p>Checking session…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{fullName ?? "Member"}</h1>
      {loading && <p>Loading attendance history…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((record) => {
              const date = new Date(record.checked_in_at);
              return (
                <tr key={record.id}>
                  <td>
                    {record.thumbnailUrl ? (
                      <img
                        src={record.thumbnailUrl}
                        alt="Check-in photo"
                        width={48}
                        height={48}
                        style={{ objectFit: "cover", borderRadius: 4 }}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{date.toLocaleDateString()}</td>
                  <td>{date.toLocaleTimeString()}</td>
                  <td>Present</td>
                </tr>
              );
            })}
            {history.length === 0 && (
              <tr>
                <td colSpan={4}>No attendance history.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAdminGuard } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";

type AttendanceRecord = {
  id: string;
  checked_in_at: string;
};

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
        supabase.from("profiles").select("full_name").eq("id", memberId).single(),
        supabase
          .from("attendance")
          .select("id, checked_in_at")
          .eq("member_id", memberId)
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

      setFullName(profileResult.data?.full_name ?? null);
      setHistory(historyResult.data ?? []);
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
                  <td>{date.toLocaleDateString()}</td>
                  <td>{date.toLocaleTimeString()}</td>
                  <td>Present</td>
                </tr>
              );
            })}
            {history.length === 0 && (
              <tr>
                <td colSpan={3}>No attendance history.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}

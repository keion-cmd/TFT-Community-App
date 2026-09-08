"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminGuard } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";

type MemberRow = {
  id: string;
  fullName: string | null;
  status: "Present" | "Absent";
  checkedInAt: string | null;
};

export default function MembersPage() {
  const { session, checking } = useAdminGuard();
  const router = useRouter();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    async function loadMembers() {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const [membersResult, attendanceResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "member")
          .order("full_name", { ascending: true }),
        supabase
          .from("attendance")
          .select("member_id, checked_in_at")
          .gte("checked_in_at", startOfDay.toISOString())
          .lt("checked_in_at", endOfDay.toISOString()),
      ]);

      if (membersResult.error || attendanceResult.error) {
        setError(
          membersResult.error?.message ??
            attendanceResult.error?.message ??
            "Failed to load members."
        );
        setLoading(false);
        return;
      }

      const attendanceByMember = new Map<string, string>();
      for (const record of attendanceResult.data ?? []) {
        attendanceByMember.set(record.member_id, record.checked_in_at);
      }

      const merged: MemberRow[] = (membersResult.data ?? []).map((member) => {
        const checkedInAt = attendanceByMember.get(member.id) ?? null;
        return {
          id: member.id,
          fullName: member.full_name,
          status: checkedInAt ? "Present" : "Absent",
          checkedInAt,
        };
      });

      setRows(merged);
      setLoading(false);
    }

    loadMembers();
  }, [session]);

  if (checking || !session) {
    return (
      <main>
        <p>Checking session…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Members</h1>
      {loading && <p>Loading members…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Checked In</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => router.push(`/members/${row.id}`)}
                style={{ cursor: "pointer" }}
              >
                <td>{row.fullName ?? "—"}</td>
                <td>{row.status}</td>
                <td>{row.checkedInAt ? new Date(row.checkedInAt).toLocaleTimeString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

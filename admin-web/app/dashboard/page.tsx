"use client";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const { session, checking } = useAdminGuard();
  const [totalMembers, setTotalMembers] = useState<number | null>(null);
  const [presentToday, setPresentToday] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    async function loadStats() {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const [membersResult, attendanceResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "member"),
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .gte("checked_in_at", startOfDay.toISOString())
          .lt("checked_in_at", endOfDay.toISOString()),
      ]);

      if (membersResult.error || attendanceResult.error) {
        setError(
          membersResult.error?.message ??
            attendanceResult.error?.message ??
            "Failed to load stats."
        );
        setLoading(false);
        return;
      }

      setTotalMembers(membersResult.count ?? 0);
      setPresentToday(attendanceResult.count ?? 0);
      setLoading(false);
    }

    loadStats();
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
      <h1>Dashboard</h1>
      {loading && <p>Loading today's stats…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (
        <section>
          <div>
            <h2>Present Today</h2>
            <p>
              {presentToday} / {totalMembers}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

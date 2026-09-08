"use client";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <p className="text-sm text-muted-foreground">Checking session…</p>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
      {loading && <p className="text-sm text-muted-foreground">Loading today&apos;s stats…</p>}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {!loading && !error && (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Present Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="flex items-baseline gap-2">
                <span className="text-5xl font-semibold tabular-nums text-accent-foreground">
                  {presentToday}
                </span>
                <span className="text-lg font-medium text-muted-foreground">/ {totalMembers}</span>
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Checked in today
              </span>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}

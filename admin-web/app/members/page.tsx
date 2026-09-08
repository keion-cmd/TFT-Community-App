"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminGuard } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
          .select("user_id, full_name")
          .eq("role", "member")
          .order("full_name", { ascending: true }),
        supabase
          .from("attendance")
          .select("user_id, checked_in_at")
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
        attendanceByMember.set(record.user_id, record.checked_in_at);
      }

      const merged: MemberRow[] = (membersResult.data ?? []).map((member) => {
        const checkedInAt = attendanceByMember.get(member.user_id) ?? null;
        return {
          id: member.user_id,
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
        <p className="text-sm text-muted-foreground">Checking session…</p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Members</h1>
      {loading && <p className="text-sm text-muted-foreground">Loading members…</p>}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Checked In</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => router.push(`/members/${row.id}`)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium">{row.fullName ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={row.status === "Present" ? "accent" : "outline"}>
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.checkedInAt ? new Date(row.checkedInAt).toLocaleTimeString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}

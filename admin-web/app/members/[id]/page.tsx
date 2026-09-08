"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAdminGuard } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <p className="text-sm text-muted-foreground">Checking session…</p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{fullName ?? "Member"}</h1>
      {loading && <p className="text-sm text-muted-foreground">Loading attendance history…</p>}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Photo</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((record) => {
              const date = new Date(record.checked_in_at);
              return (
                <TableRow key={record.id}>
                  <TableCell>
                    <Avatar className="h-12 w-12 rounded-md">
                      <AvatarImage src={record.thumbnailUrl ?? undefined} alt="Check-in photo" className="rounded-md" />
                      <AvatarFallback className="rounded-md">—</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{date.toLocaleDateString()}</TableCell>
                  <TableCell className="text-muted-foreground">{date.toLocaleTimeString()}</TableCell>
                  <TableCell>
                    <Badge variant="accent">Present</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {history.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No attendance history.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </main>
  );
}

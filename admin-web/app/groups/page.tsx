"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminGuard } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type GroupRow = {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
};

export default function GroupsPage() {
  const { session, checking } = useAdminGuard();
  const router = useRouter();
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function loadGroups() {
    setLoading(true);

    const [groupsResult, membersResult] = await Promise.all([
      supabase.from("groups").select("id, name, created_at").order("created_at", { ascending: false }),
      supabase.from("group_members").select("group_id"),
    ]);

    if (groupsResult.error || membersResult.error) {
      setError(groupsResult.error?.message ?? membersResult.error?.message ?? "Failed to load groups.");
      setLoading(false);
      return;
    }

    const countByGroup = new Map<string, number>();
    for (const record of membersResult.data ?? []) {
      countByGroup.set(record.group_id, (countByGroup.get(record.group_id) ?? 0) + 1);
    }

    const merged: GroupRow[] = (groupsResult.data ?? []).map((group) => ({
      id: group.id,
      name: group.name,
      createdAt: group.created_at,
      memberCount: countByGroup.get(group.id) ?? 0,
    }));

    setRows(merged);
    setLoading(false);
  }

  useEffect(() => {
    if (!session) return;
    loadGroups();
  }, [session]);

  async function handleCreateGroup(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);

    const trimmed = newGroupName.trim();
    if (!trimmed) {
      setCreateError("Group name is required.");
      return;
    }

    if (!session) return;

    setCreating(true);
    const { error: insertError } = await supabase
      .from("groups")
      .insert({ name: trimmed, created_by: session.userId });
    setCreating(false);

    if (insertError) {
      setCreateError(insertError.message);
      return;
    }

    setNewGroupName("");
    loadGroups();
  }

  if (checking || !session) {
    return (
      <main>
        <p className="text-sm text-muted-foreground">Checking session…</p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Groups</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Group</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateGroup} className="flex flex-wrap items-start gap-3">
            <Input
              type="text"
              placeholder="New group name"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create Group"}
            </Button>
          </form>
          {createError && (
            <p role="alert" className="mt-2 text-sm font-medium text-destructive">
              {createError}
            </p>
          )}
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading groups…</p>}
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
              <TableHead>Created</TableHead>
              <TableHead>Members</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => router.push(`/groups/${row.id}`)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(row.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.memberCount}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No groups yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </main>
  );
}

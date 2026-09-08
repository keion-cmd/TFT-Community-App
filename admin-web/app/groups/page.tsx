"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminGuard } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

type MemberOption = {
  userId: string;
  fullName: string | null;
};

export default function GroupsPage() {
  const { session, checking } = useAdminGuard();
  const router = useRouter();
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
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

  async function loadMemberOptions() {
    const { data, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("role", "member")
      .order("full_name", { ascending: true });

    if (profilesError) {
      setCreateError(profilesError.message);
      return;
    }

    setMemberOptions(
      (data ?? []).map((profile) => ({ userId: profile.user_id, fullName: profile.full_name }))
    );
  }

  function openDialog() {
    setNewGroupName("");
    setSelectedUserIds(new Set());
    setCreateError(null);
    setCreateSuccess(null);
    setDialogOpen(true);
    loadMemberOptions();
  }

  function toggleMember(userId: string, checked: boolean) {
    setSelectedUserIds((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  }

  async function handleCreateGroup(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const trimmed = newGroupName.trim();
    if (!trimmed) {
      setCreateError("Group name is required.");
      return;
    }

    if (!session) return;

    setCreating(true);

    const { data: insertedGroup, error: insertError } = await supabase
      .from("groups")
      .insert({ name: trimmed, created_by: session.userId })
      .select("id")
      .single();

    if (insertError || !insertedGroup) {
      setCreating(false);
      setCreateError(`Failed to create group: ${insertError?.message ?? "unknown error"}`);
      return;
    }

    const memberIds = Array.from(selectedUserIds);
    if (memberIds.length > 0) {
      const { error: membersError } = await supabase
        .from("group_members")
        .insert(memberIds.map((userId) => ({ group_id: insertedGroup.id, user_id: userId })));

      if (membersError) {
        setCreating(false);
        setCreateError(
          `Group "${trimmed}" was created, but adding members failed: ${membersError.message}`
        );
        loadGroups();
        return;
      }
    }

    setCreating(false);
    setCreateSuccess("Group created.");
    setNewGroupName("");
    setSelectedUserIds(new Set());
    loadGroups();
    setDialogOpen(false);
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
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Groups</h1>
        <Button type="button" onClick={openDialog}>
          New Group
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Group</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-group-name">Group name</Label>
              <Input
                id="new-group-name"
                type="text"
                placeholder="Group name"
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Members</Label>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-input p-3">
                {memberOptions.map((member) => (
                  <div key={member.userId} className="flex items-center gap-2">
                    <Checkbox
                      id={`member-${member.userId}`}
                      checked={selectedUserIds.has(member.userId)}
                      onCheckedChange={(checked) => toggleMember(member.userId, checked === true)}
                    />
                    <Label htmlFor={`member-${member.userId}`} className="font-normal">
                      {member.fullName ?? member.userId}
                    </Label>
                  </div>
                ))}
                {memberOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No members available.</p>
                )}
              </div>
            </div>

            {createError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {createError}
              </p>
            )}
            {createSuccess && (
              <p className="text-sm font-medium text-accent-foreground">{createSuccess}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

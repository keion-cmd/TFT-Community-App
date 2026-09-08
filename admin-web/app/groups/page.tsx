"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminGuard } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";

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
        <p>Checking session…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Groups</h1>

      <form onSubmit={handleCreateGroup}>
        <input
          type="text"
          placeholder="New group name"
          value={newGroupName}
          onChange={(event) => setNewGroupName(event.target.value)}
        />
        <button type="submit" disabled={creating}>
          {creating ? "Creating…" : "Create Group"}
        </button>
        {createError && <p role="alert">{createError}</p>}
      </form>

      {loading && <p>Loading groups…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Created</th>
              <th>Members</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => router.push(`/groups/${row.id}`)}
                style={{ cursor: "pointer" }}
              >
                <td>{row.name}</td>
                <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                <td>{row.memberCount}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3}>No groups yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAdminGuard } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";

type MemberRow = {
  userId: string;
  fullName: string | null;
};

type AvailableProfile = {
  userId: string;
  fullName: string | null;
};

export default function GroupDetailPage() {
  const { session, checking } = useAdminGuard();
  const params = useParams<{ id: string }>();
  const groupId = params?.id;

  const [groupName, setGroupName] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<AvailableProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [sendingLink, setSendingLink] = useState(false);

  async function loadGroup() {
    if (!groupId) return;
    setLoading(true);

    const [groupResult, membershipsResult, memberProfilesResult] = await Promise.all([
      supabase.from("groups").select("name").eq("id", groupId).single(),
      supabase.from("group_members").select("user_id").eq("group_id", groupId),
      supabase.from("profiles").select("user_id, full_name").eq("role", "member").order("full_name", { ascending: true }),
    ]);

    if (groupResult.error || membershipsResult.error || memberProfilesResult.error) {
      setError(
        groupResult.error?.message ??
          membershipsResult.error?.message ??
          memberProfilesResult.error?.message ??
          "Failed to load group."
      );
      setLoading(false);
      return;
    }

    const memberUserIds = new Set((membershipsResult.data ?? []).map((row) => row.user_id));
    const profilesByUserId = new Map(
      (memberProfilesResult.data ?? []).map((profile) => [profile.user_id, profile.full_name])
    );

    const currentMembers: MemberRow[] = Array.from(memberUserIds).map((userId) => ({
      userId,
      fullName: profilesByUserId.get(userId) ?? null,
    }));

    const available: AvailableProfile[] = (memberProfilesResult.data ?? [])
      .filter((profile) => !memberUserIds.has(profile.user_id))
      .map((profile) => ({ userId: profile.user_id, fullName: profile.full_name }));

    setGroupName(groupResult.data?.name ?? null);
    setMembers(currentMembers);
    setAvailableProfiles(available);
    setLoading(false);
  }

  useEffect(() => {
    if (!session || !groupId) return;
    loadGroup();
  }, [session, groupId]);

  async function handleAddMember(event: React.FormEvent) {
    event.preventDefault();
    setAddError(null);

    if (!selectedUserId) {
      setAddError("Select a member to add.");
      return;
    }

    if (!groupId) return;

    setAdding(true);
    const { error: insertError } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: selectedUserId });
    setAdding(false);

    if (insertError) {
      setAddError(insertError.message);
      return;
    }

    setSelectedUserId("");
    loadGroup();
  }

  function isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  async function handleSendLink(event: React.FormEvent) {
    event.preventDefault();
    setLinkError(null);
    setLinkSuccess(null);

    const url = linkUrl.trim();
    const title = linkTitle.trim();

    if (!url || !isValidUrl(url)) {
      setLinkError("Enter a valid URL (e.g. https://example.com).");
      return;
    }

    if (!groupId || !session) return;

    setSendingLink(true);

    const { error: linkInsertError } = await supabase.from("shared_links").insert({
      url,
      title: title || null,
      shared_by: session.userId,
      group_id: groupId,
    });

    if (linkInsertError) {
      setSendingLink(false);
      setLinkError(linkInsertError.message);
      return;
    }

    const content = title ? `${title} — ${url}` : url;

    const { error: messageInsertError } = await supabase.from("messages").insert({
      group_id: groupId,
      sender_id: session.userId,
      content,
      type: "link",
    });

    setSendingLink(false);

    if (messageInsertError) {
      setLinkError(messageInsertError.message);
      return;
    }

    setLinkUrl("");
    setLinkTitle("");
    setLinkSuccess("Link sent to group.");
  }

  async function handleRemoveMember(userId: string) {
    if (!groupId) return;

    setRemovingUserId(userId);
    const { error: deleteError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    setRemovingUserId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    loadGroup();
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
      <h1>{groupName ?? "Group"}</h1>
      {loading && <p>Loading group…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId}>
                  <td>{member.fullName ?? "—"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.userId)}
                      disabled={removingUserId === member.userId}
                    >
                      {removingUserId === member.userId ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={2}>No members yet.</td>
                </tr>
              )}
            </tbody>
          </table>

          <form onSubmit={handleAddMember}>
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
            >
              <option value="">Select a member…</option>
              {availableProfiles.map((profile) => (
                <option key={profile.userId} value={profile.userId}>
                  {profile.fullName ?? profile.userId}
                </option>
              ))}
            </select>
            <button type="submit" disabled={adding}>
              {adding ? "Adding…" : "Add Member"}
            </button>
            {addError && <p role="alert">{addError}</p>}
          </form>

          <h2>Broadcast Link</h2>
          <form onSubmit={handleSendLink}>
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Title (optional)"
              value={linkTitle}
              onChange={(event) => setLinkTitle(event.target.value)}
            />
            <button type="submit" disabled={sendingLink}>
              {sendingLink ? "Sending…" : "Send to Group"}
            </button>
            {linkError && <p role="alert">{linkError}</p>}
            {linkSuccess && <p>{linkSuccess}</p>}
          </form>
        </>
      )}
    </main>
  );
}

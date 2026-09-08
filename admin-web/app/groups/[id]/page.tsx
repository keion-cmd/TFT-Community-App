"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAdminGuard } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <p className="text-sm text-muted-foreground">Checking session…</p>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{groupName ?? "Group"}</h1>
      {loading && <p className="text-sm text-muted-foreground">Loading group…</p>}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell className="font-medium">{member.fullName ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveMember(member.userId)}
                      disabled={removingUserId === member.userId}
                    >
                      {removingUserId === member.userId ? "Removing…" : "Remove"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No members yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Member</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMember} className="flex flex-wrap items-start gap-3">
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="h-10 max-w-xs flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select a member…</option>
                  {availableProfiles.map((profile) => (
                    <option key={profile.userId} value={profile.userId}>
                      {profile.fullName ?? profile.userId}
                    </option>
                  ))}
                </select>
                <Button type="submit" disabled={adding}>
                  {adding ? "Adding…" : "Add Member"}
                </Button>
              </form>
              {addError && (
                <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                  {addError}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Broadcast Link</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendLink} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="link-url">URL</Label>
                  <Input
                    id="link-url"
                    type="url"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-title">Title (optional)</Label>
                  <Input
                    id="link-title"
                    type="text"
                    placeholder="Title (optional)"
                    value={linkTitle}
                    onChange={(event) => setLinkTitle(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={sendingLink}>
                  {sendingLink ? "Sending…" : "Send to Group"}
                </Button>
                {linkError && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {linkError}
                  </p>
                )}
                {linkSuccess && (
                  <p className="text-sm font-medium text-accent-foreground">{linkSuccess}</p>
                )}
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

import { supabase } from "./supabase";

export type GroupSummary = {
  id: string;
  name: string;
};

export type ChatMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  type: string | null;
  created_at: string;
  sender_name: string | null;
};

export async function getMyGroups(userId: string): Promise<GroupSummary[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name)")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? [])
    .map((row: any) => row.groups)
    .filter((group: any): group is GroupSummary => Boolean(group))
    .sort((a: GroupSummary, b: GroupSummary) => a.name.localeCompare(b.name));
}

export async function getGroupMessages(groupId: string): Promise<ChatMessage[]> {
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, group_id, sender_id, content, type, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const senderIds = Array.from(new Set((messages ?? []).map((m) => m.sender_id)));
  const namesBySenderId = new Map<string, string>();

  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", senderIds);

    for (const profile of profiles ?? []) {
      if (profile.full_name) namesBySenderId.set(profile.user_id, profile.full_name);
    }
  }

  return (messages ?? []).map((m) => ({
    ...m,
    sender_name: namesBySenderId.get(m.sender_id) ?? null,
  }));
}

export async function sendMessage(groupId: string, senderId: string, content: string): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    group_id: groupId,
    sender_id: senderId,
    content,
    type: "text",
  });

  if (error) throw error;
}

export type RealtimeMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  type: string | null;
  created_at: string;
};

export function subscribeToGroupMessages(
  groupId: string,
  onInsert: (message: RealtimeMessage) => void
): () => void {
  const channel = supabase
    .channel(`messages:group:${groupId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` },
      (payload) => onInsert(payload.new as RealtimeMessage)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

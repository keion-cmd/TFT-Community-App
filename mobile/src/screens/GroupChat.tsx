import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "../lib/supabase";
import {
  type ChatMessage,
  getGroupMessages,
  sendMessage,
  subscribeToGroupMessages,
} from "../lib/messenger";

function parseLinkContent(content: string | null): { label: string; url: string } {
  const raw = content ?? "";
  const separatorIndex = raw.indexOf(" — ");
  if (separatorIndex === -1) {
    return { label: raw, url: raw };
  }
  return {
    label: raw.slice(0, separatorIndex),
    url: raw.slice(separatorIndex + 3),
  };
}

export default function GroupChatScreen() {
  const router = useRouter();
  const { groupId: rawGroupId } = useLocalSearchParams<{ groupId: string }>();
  const groupId = Array.isArray(rawGroupId) ? rawGroupId[0] : rawGroupId;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!groupId) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        router.replace("/");
        return;
      }
      if (cancelled) return;
      setUserId(session.user.id);

      try {
        const existing = await getGroupMessages(groupId);
        if (!cancelled) setMessages(existing);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load messages.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      unsubscribe = subscribeToGroupMessages(groupId, (incoming) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, { ...incoming, sender_name: null }];
        });
      });
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [groupId, router]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || !userId || !groupId) return;

    setSending(true);
    setError(null);
    try {
      await sendMessage(groupId, userId, content);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isOwn = item.sender_id === userId;
          const isLink = item.type === "link";
          const link = isLink ? parseLinkContent(item.content) : null;
          return (
            <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
              <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                {!isOwn ? <Text style={styles.sender}>{item.sender_name ?? "Member"}</Text> : null}
                {isLink && link ? (
                  <Pressable onPress={() => Linking.openURL(link.url)}>
                    <Text style={styles.linkLabel}>🔗 Link</Text>
                    <Text style={[isOwn ? styles.textOwn : styles.textOther, styles.linkText]}>
                      {link.label}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={isOwn ? styles.textOwn : styles.textOther}>{item.content}</Text>
                )}
              </View>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Message..."
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
        >
          <Text style={styles.sendButtonText}>{sending ? "..." : "Send"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 12 },
  error: { color: "#c0392b", padding: 8, textAlign: "center" },
  bubbleRow: { flexDirection: "row", marginBottom: 8 },
  bubbleRowOwn: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  bubbleOwn: { backgroundColor: "#2563eb" },
  bubbleOther: { backgroundColor: "#e5e7eb" },
  sender: { fontSize: 11, fontWeight: "600", color: "#374151", marginBottom: 2 },
  textOwn: { color: "#fff", fontSize: 15 },
  textOther: { color: "#111827", fontSize: 15 },
  linkLabel: { fontSize: 10, fontWeight: "700", color: "#93c5fd", marginBottom: 2 },
  linkText: { textDecorationLine: "underline" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonDisabled: { backgroundColor: "#93c5fd" },
  sendButtonText: { color: "#fff", fontWeight: "600" },
});

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { supabase } from "../lib/supabase";
import { getMyGroups, type GroupSummary } from "../lib/messenger";

const AVATAR_COLORS = ["#E17076", "#7BC862", "#65AADD", "#A695E7", "#EE7AAE", "#6EC9CB", "#F2A45E"];

function getAvatarColor(name: string): string {
  const code = name.trim().length > 0 ? name.trim().charCodeAt(0) : 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function getInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : "?";
}

function GroupAvatar({ name }: { name: string }) {
  return (
    <View style={[styles.avatar, { backgroundColor: getAvatarColor(name) }]}>
      <Text style={styles.avatarText}>{getInitial(name)}</Text>
    </View>
  );
}

export default function MessengerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session) {
      router.replace("/");
      return;
    }

    try {
      const myGroups = await getMyGroups(session.user.id);
      setGroups(myGroups);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0088CC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messenger</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {groups.length === 0 && !error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>You don't belong to any groups yet.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => router.push(`/messenger/${item.id}`)}
            >
              <GroupAvatar name={item.name} />
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowText} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E7EBF0" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#E7EBF0" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0088CC",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  empty: { fontSize: 15, color: "#6B7280", textAlign: "center" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  error: { color: "#c0392b", marginHorizontal: 16, marginBottom: 8 },
  separator: { height: 1, backgroundColor: "#D9DEE6", marginLeft: 76 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  rowPressed: { backgroundColor: "#EAF6FC" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  rowTextContainer: { flex: 1, justifyContent: "center" },
  rowText: { fontSize: 16, fontWeight: "700", color: "#111827" },
});

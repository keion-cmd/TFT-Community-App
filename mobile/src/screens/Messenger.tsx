import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { supabase } from "../lib/supabase";
import { getMyGroups, type GroupSummary } from "../lib/messenger";

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
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messenger</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {groups.length === 0 && !error ? (
        <Text style={styles.empty}>You don't belong to any groups yet.</Text>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/messenger/${item.id}`)}>
              <Text style={styles.rowText}>{item.name}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 16 },
  empty: { fontSize: 14, color: "#555" },
  error: { color: "#c0392b", marginBottom: 12 },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  rowText: { fontSize: 16, fontWeight: "500" },
});

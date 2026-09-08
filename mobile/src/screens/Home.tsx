import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import { getTodayAttendance } from "../lib/attendance";

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [checkedInToday, setCheckedInToday] = useState(false);

  const loadData = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const activeSession = sessionData.session;

    if (!activeSession) {
      router.replace("/");
      return;
    }

    setSession(activeSession);

    const [{ data: profile }, attendanceRow] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", activeSession.user.id)
        .maybeSingle(),
      getTodayAttendance(activeSession.user.id).catch(() => null),
    ]);

    setDisplayName(profile?.full_name || activeSession.user.email || "");
    setCheckedInToday(Boolean(attendanceRow));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading || !session) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome{displayName ? `, ${displayName}` : ""}</Text>
      <Text style={styles.status}>
        {checkedInToday ? "You're checked in for today." : "You haven't checked in today."}
      </Text>

      <Pressable
        style={[styles.button, checkedInToday && styles.buttonSecondary]}
        onPress={() => router.push("/checkin")}
        disabled={checkedInToday}
      >
        <Text style={checkedInToday ? styles.buttonSecondaryText : styles.buttonText}>
          {checkedInToday ? "Checked In" : "Check In"}
        </Text>
      </Pressable>

      <Pressable style={styles.buttonOutline} onPress={() => router.push("/messenger")}>
        <Text style={styles.buttonOutlineText}>Messenger</Text>
      </Pressable>

      <Pressable style={styles.signOut} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 8, textAlign: "center" },
  status: { fontSize: 14, color: "#555", marginBottom: 24, textAlign: "center" },
  button: {
    width: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonSecondary: { backgroundColor: "#e5e7eb" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  buttonSecondaryText: { color: "#6b7280", fontSize: 16, fontWeight: "600" },
  buttonOutline: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonOutlineText: { color: "#2563eb", fontSize: 16, fontWeight: "600" },
  signOut: { marginTop: 12, paddingVertical: 8 },
  signOutText: { color: "#c0392b", fontSize: 14 },
});

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";

import { supabase, ATTENDANCE_PHOTOS_BUCKET } from "../lib/supabase";
import { getTodayAttendance } from "../lib/attendance";

type Stage = "loading" | "already_checked_in" | "camera" | "preview" | "uploading" | "success";

export default function CheckInScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>("loading");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/");
        return;
      }
      setUserId(session.user.id);

      const existing = await getTodayAttendance(session.user.id).catch(() => null);
      if (existing) {
        setStage("already_checked_in");
        return;
      }

      if (!permission || !permission.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          setError("Camera permission is required to check in.");
          setStage("camera");
          return;
        }
      }
      setStage("camera");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCapture() {
    if (!cameraRef.current) return;
    setError(null);
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    setPhotoUri(photo.uri);
    setStage("preview");
  }

  function handleRetake() {
    setPhotoUri(null);
    setStage("camera");
  }

  async function handleConfirm() {
    if (!photoUri || !userId) return;
    setError(null);
    setStage("uploading");

    try {
      const alreadyCheckedIn = await getTodayAttendance(userId);
      if (alreadyCheckedIn) {
        setStage("already_checked_in");
        return;
      }

      const response = await fetch(photoUri);
      const blob = await response.blob();
      const filePath = `${userId}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(ATTENDANCE_PHOTOS_BUCKET)
        .upload(filePath, blob, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("attendance").insert({
        user_id: userId,
        photo_url: filePath,
        checked_in_at: new Date().toISOString(),
        status: "present",
      });

      if (insertError) throw insertError;

      setStage("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed. Try again.");
      setStage("preview");
    }
  }

  if (stage === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (stage === "already_checked_in") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Already checked in</Text>
        <Text style={styles.message}>You've already checked in today.</Text>
        <Pressable style={styles.button} onPress={() => router.replace("/home")}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  if (stage === "success") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Checked in!</Text>
        <Text style={styles.message}>Your attendance was recorded successfully.</Text>
        <Pressable style={styles.button} onPress={() => router.replace("/home")}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  if (!permission || !permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          {error || "Camera permission is required to check in."}
        </Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  if (stage === "preview" && photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.row}>
          <Pressable style={styles.buttonOutline} onPress={handleRetake}>
            <Text style={styles.buttonOutlineText}>Retake</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleConfirm}>
            <Text style={styles.buttonText}>Confirm</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (stage === "uploading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.message}>Uploading check-in...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={handleCapture}>
        <Text style={styles.buttonText}>Capture</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "flex-end" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 8, textAlign: "center" },
  message: { fontSize: 14, color: "#555", marginBottom: 16, textAlign: "center" },
  camera: { flex: 1, borderRadius: 12, overflow: "hidden", marginBottom: 16 },
  preview: { flex: 1, borderRadius: 12, marginBottom: 16 },
  row: { flexDirection: "row", gap: 12 },
  button: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  buttonOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonOutlineText: { color: "#2563eb", fontSize: 16, fontWeight: "600" },
  error: { color: "#c0392b", marginBottom: 12, textAlign: "center" },
});

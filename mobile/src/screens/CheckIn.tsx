import { StyleSheet, Text, View } from "react-native";

export default function CheckInScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check In</Text>
      <Text>Placeholder screen — camera capture logic deferred.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 8 },
});

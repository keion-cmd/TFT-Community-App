import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";
import { signInWithGoogle } from "../lib/googleAuth";

const MIN_PASSWORD_LENGTH = 6;

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function handleSignUp() {
    setError(null);

    if (!fullName || !email || !password || !confirmPassword) {
      setError("Fill in all fields.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.replace("/home");
      return;
    }

    setConfirmationSent(true);
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleSubmitting(true);
    const { error: googleError, cancelled } = await signInWithGoogle();
    setGoogleSubmitting(false);

    if (cancelled) {
      return;
    }

    if (googleError) {
      setError(googleError.message);
      return;
    }

    router.replace("/home");
  }

  if (confirmationSent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.info}>
          We sent a confirmation link to {email.trim()}. Confirm your account,
          then sign in.
        </Text>
        <Pressable style={styles.button} onPress={() => router.replace("/")}>
          <Text style={styles.buttonText}>Back to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Create account</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        autoCapitalize="words"
        value={fullName}
        onChangeText={setFullName}
        editable={!submitting}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!submitting}
      />
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
          editable={!submitting}
        />
        <Pressable
          style={styles.toggleButton}
          onPress={() => setShowPassword((prev) => !prev)}
        >
          <Text style={styles.toggleButtonText}>
            {showPassword ? "Hide" : "Show"}
          </Text>
        </Pressable>
      </View>
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Confirm password"
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!submitting}
        />
        <Pressable
          style={styles.toggleButton}
          onPress={() => setShowConfirmPassword((prev) => !prev)}
        >
          <Text style={styles.toggleButtonText}>
            {showConfirmPassword ? "Hide" : "Show"}
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        style={[styles.googleButton, googleSubmitting && styles.buttonDisabled]}
        onPress={handleGoogleSignIn}
        disabled={submitting || googleSubmitting}
      >
        {googleSubmitting ? (
          <ActivityIndicator color="#2563eb" />
        ) : (
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.replace("/")} disabled={submitting}>
        <Text style={styles.linkText}>Already have an account? Sign in</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 24 },
  info: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#444",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  passwordRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleButtonText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    color: "#c0392b",
    marginBottom: 12,
    textAlign: "center",
  },
  button: {
    width: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#888",
    fontSize: 13,
  },
  googleButton: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  googleButtonText: { color: "#2563eb", fontSize: 16, fontWeight: "600" },
  linkText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
});

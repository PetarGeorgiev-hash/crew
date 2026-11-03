import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "../../themed-text";
import { ThemedView } from "../../themed-view";

export default function EmailVerificationPrompt() {
  const { user, verifyEmail, resendVerifyEmail, isLoading, error } = useAuth();
  const theme = useTheme();
  const [isVerifying, setIsVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");

  if (!user || user.emailVerified) return null;

  const resendCode = async () => {
    setNotice("");
    if (await resendVerifyEmail())
      setNotice("A new verification code was sent.");
  };

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedText type="subtitle">Verify your email</ThemedText>
      <ThemedText>
        Verify {user.email} to help secure your account. You can do this now or
        later.
      </ThemedText>
      {isVerifying && (
        <View style={styles.form}>
          <TextInput
            value={code}
            onChangeText={(value) => {
              setCode(value);
              setNotice("");
            }}
            autoComplete="one-time-code"
            keyboardType="number-pad"
            placeholder="Verification code"
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.backgroundSelected,
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            disabled={isLoading || !code.trim()}
            onPress={() => void verifyEmail(code)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.backgroundSelected },
              (pressed || isLoading || !code.trim()) && styles.buttonPressed,
            ]}
          >
            <ThemedText>
              {isLoading ? "Verifying..." : "Verify email"}
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={() => void resendCode()}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.backgroundSelected },
              (pressed || isLoading) && styles.buttonPressed,
            ]}
          >
            <ThemedText>{isLoading ? "Sending..." : "Resend code"}</ThemedText>
          </Pressable>
        </View>
      )}
      {!isVerifying && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsVerifying(true)}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.buttonPressed,
          ]}
        >
          <ThemedText>Verify now</ThemedText>
        </Pressable>
      )}
      {notice ? <ThemedText>{notice}</ThemedText> : null}
      {error ? (
        <ThemedText accessibilityRole="alert" style={styles.error}>
          {error.message}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  form: {
    gap: 8,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
  },
  button: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  buttonPressed: {
    opacity: 0.6,
  },
  error: {
    color: "#d32f2f",
  },
});

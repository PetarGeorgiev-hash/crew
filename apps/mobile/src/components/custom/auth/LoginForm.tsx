import { useAuth } from "@/context/auth";
import { useTheme } from "@/hooks/use-theme";
import {
  Keyboard,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { ThemedText } from "../../themed-text";
import { ThemedView } from "../../themed-view";
import { useState } from "react";

export default function LoginForm() {
  const { signIn, isLoading, AuthMethod } = useAuth();
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const formContent = (
    <View style={styles.dismissArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode={Platform.OS === "web" ? "none" : "on-drag"}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.contentContainer}>
            <View style={styles.titleContainer}>
              <ThemedText type="subtitle" style={styles.title}>
                Welcome to Your App
              </ThemedText>
              <ThemedText style={styles.description}>
                Experience seamless authentication{"\n"}
                powered by Expo.{"\n"}
              </ThemedText>
            </View>
            <View style={styles.form}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                onChangeText={(text) => setEmail(text)}
                value={email}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
              />
              <ThemedText style={styles.label}>Password</ThemedText>
              <TextInput
                onChangeText={(text) => setPassword(text)}
                value={password}
                autoComplete="current-password"
                secureTextEntry
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
              />
              <View style={styles.buttonContainer}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isLoading}
                  onPress={() => signIn(AuthMethod.local, email, password)}
                  style={({ pressed }) => [
                    styles.loginButton,
                    { backgroundColor: theme.backgroundSelected },
                    (pressed || isLoading) && styles.buttonPressed,
                  ]}
                >
                  <ThemedText>
                    {isLoading ? "Signing in..." : "Login"}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
            <View style={styles.buttonContainer}>
              <Pressable
                accessibilityRole="button"
                disabled={isLoading}
                onPress={() => signIn(AuthMethod.google)}
                style={({ pressed }) => [
                  styles.googleButton,
                  { backgroundColor: theme.backgroundSelected },
                  (pressed || isLoading) && styles.buttonPressed,
                ]}
              >
                <ThemedText>
                  {isLoading ? "Signing in..." : "Sign in with Google"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {Platform.OS === "web" ? (
        formContent
      ) : (
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
          accessible={false}
        >
          {formContent}
        </TouchableWithoutFeedback>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  dismissArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    alignItems: "center",
    gap: 12,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  contentContainer: {
    width: "100%",
    gap: 32,
  },
  title: {
    textAlign: "center",
    fontSize: 30,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  description: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  form: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
  },
  loginButton: {
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  googleButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  buttonPressed: {
    opacity: 0.6,
  },
});

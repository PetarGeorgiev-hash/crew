import { useState } from "react";
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
import { useAuth } from "@/context/auth";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "../../themed-text";
import { ThemedView } from "../../themed-view";

type AuthScreen = "login" | "register" | "choice" | "verify";

export default function LoginForm() {
  const {
    signIn,
    register,
    registrationUser,
    deferVerification,
    verifyEmail,
    resendVerifyEmail,
    isLoading,
    error,
    AuthMethod,
  } = useAuth();
  const theme = useTheme();

  const [screen, setScreen] = useState<AuthScreen>("login");
  const activeScreen: AuthScreen = registrationUser
    ? screen === "verify"
      ? "verify"
      : "choice"
    : screen;
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const submitRegistration = async () => {
    if (await register(username, email, password)) setScreen("choice");
  };

  const submitVerification = async () => {
    await verifyEmail(verificationCode);
  };

  const formContent = (
    <View style={styles.dismissArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode={Platform.OS === "web" ? "none" : "on-drag"}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.contentContainer}>
            {registrationUser && activeScreen === "choice" ? (
              <>
                <View style={styles.titleContainer}>
                  <ThemedText type="subtitle" style={styles.title}>
                    Verify your email?
                  </ThemedText>
                  <ThemedText style={styles.description}>
                    Email verification is optional. If you have the code for{" "}
                    {registrationUser.email}, verify now or do it later.
                  </ThemedText>
                </View>
                <View style={styles.buttonContainer}>
                  <AuthButton
                    title="Verify now"
                    disabled={isLoading}
                    onPress={() => setScreen("verify")}
                    theme={theme}
                  />
                  <AuthButton
                    title="Do this later"
                    disabled={isLoading}
                    onPress={deferVerification}
                    theme={theme}
                  />
                </View>
              </>
            ) : activeScreen === "verify" && registrationUser ? (
              <>
                <View style={styles.titleContainer}>
                  <ThemedText type="subtitle" style={styles.title}>
                    Check your email
                  </ThemedText>
                  <ThemedText style={styles.description}>
                    Enter the verification code sent to {registrationUser.email}
                    .
                  </ThemedText>
                </View>
                <View style={styles.form}>
                  <ThemedText style={styles.label}>
                    Verification code
                  </ThemedText>
                  <TextInput
                    onChangeText={setVerificationCode}
                    value={verificationCode}
                    autoComplete="one-time-code"
                    keyboardType="number-pad"
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: theme.background,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                  />
                  <AuthButton
                    title={isLoading ? "Verifying..." : "Verify email"}
                    disabled={isLoading || !verificationCode.trim()}
                    onPress={submitVerification}
                    theme={theme}
                  />
                  <AuthButton
                    title={isLoading ? "Sending..." : "Resend code"}
                    disabled={isLoading}
                    onPress={() => void resendVerifyEmail()}
                    theme={theme}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={isLoading}
                    onPress={() => setScreen("choice")}
                  >
                    <ThemedText style={styles.link}>Do this later</ThemedText>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.titleContainer}>
                  <ThemedText type="subtitle" style={styles.title}>
                    {activeScreen === "register"
                      ? "Create your account"
                      : "Welcome to Crew"}
                  </ThemedText>
                  <ThemedText style={styles.description}>
                    {activeScreen === "register"
                      ? "Choose a unique username, then sign up with your email and password."
                      : "Sign in or create an account to continue."}
                  </ThemedText>
                </View>
                <View style={styles.form}>
                  {activeScreen === "register" && (
                    <>
                      <ThemedText style={styles.label}>Username</ThemedText>
                      <TextInput
                        onChangeText={setUsername}
                        value={username}
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={30}
                        placeholder="3–30 letters, numbers, or underscores"
                        style={[
                          styles.input,
                          {
                            color: theme.text,
                            backgroundColor: theme.background,
                            borderColor: theme.backgroundSelected,
                          },
                        ]}
                      />
                    </>
                  )}
                  <ThemedText style={styles.label}>Email</ThemedText>
                  <TextInput
                    onChangeText={setEmail}
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
                    onChangeText={setPassword}
                    value={password}
                    autoComplete={
                      activeScreen === "register"
                        ? "new-password"
                        : "current-password"
                    }
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
                  <AuthButton
                    title={
                      isLoading
                        ? activeScreen === "register"
                          ? "Creating account..."
                          : "Signing in..."
                        : activeScreen === "register"
                          ? "Create account"
                          : "Login"
                    }
                    disabled={isLoading}
                    onPress={
                      activeScreen === "register"
                        ? submitRegistration
                        : () => signIn(AuthMethod.local, email, password)
                    }
                    theme={theme}
                  />
                </View>
                {activeScreen === "login" && (
                  <AuthButton
                    title={isLoading ? "Signing in..." : "Sign in with Google"}
                    disabled={isLoading}
                    onPress={() => signIn(AuthMethod.google)}
                    theme={theme}
                  />
                )}
                <Pressable
                  accessibilityRole="button"
                  disabled={isLoading}
                  onPress={() =>
                    setScreen(
                      activeScreen === "register" ? "login" : "register",
                    )
                  }
                >
                  <ThemedText style={styles.link}>
                    {activeScreen === "register"
                      ? "Already have an account? Sign in"
                      : "Create an account"}
                  </ThemedText>
                </Pressable>
              </>
            )}
            {error && (
              <ThemedText accessibilityRole="alert" style={styles.error}>
                {error.message}
              </ThemedText>
            )}
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          {formContent}
        </TouchableWithoutFeedback>
      )}
    </ThemedView>
  );
}

function AuthButton({
  title,
  disabled,
  onPress,
  theme,
}: {
  title: string;
  disabled: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundSelected },
        (pressed || disabled) && styles.buttonPressed,
      ]}
    >
      <ThemedText>{title}</ThemedText>
    </Pressable>
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
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  buttonPressed: {
    opacity: 0.6,
  },
  link: {
    textAlign: "center",
    textDecorationLine: "underline",
  },
  error: {
    color: "#d32f2f",
    textAlign: "center",
  },
});

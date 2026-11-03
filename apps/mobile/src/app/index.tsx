import { ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import LoginForm from "@/components/custom/auth/LoginForm";
import EmailVerificationPrompt from "@/components/custom/auth/EmailVerificationPrompt";
import { useAuth } from "@/context/auth";
import LogoutBtn from "@/components/custom/auth/LogoutBtn";

export default function HomeScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.account}>
          <ThemedText type="title" style={styles.title}>
            Welcome, {user.userName}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{user.email}</ThemedText>
        </ThemedView>
        <EmailVerificationPrompt />
        <LogoutBtn />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  account: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
});

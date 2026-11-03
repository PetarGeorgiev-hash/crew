import { useAuth } from "@/context/auth";
import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "@/components/themed-text";

export default function LogoutBtn() {
  const { signOut, isLoading } = useAuth();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isLoading}
      onPress={() => void signOut()}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundSelected },
        (pressed || isLoading) && styles.buttonPressed,
      ]}
    >
      <ThemedText>{isLoading ? "Signing out..." : "Sign out"}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonPressed: {
    opacity: 0.6,
  },
});

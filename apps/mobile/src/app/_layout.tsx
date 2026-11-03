import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Platform, useColorScheme } from "react-native";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import {
  AuthProvider,
  getAccessToken,
  refreshSession,
  useAuth,
} from "@/context/auth";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { API_URL } from "@/utils/constants";
import { SetContextLink } from "@apollo/client/link/context";
import { createAuthErrorLink } from "@/auth/auth-error-link";

const link = new HttpLink({
  uri: API_URL,
  credentials: Platform.OS === "web" ? "include" : "omit",
});

const authLink = new SetContextLink(({ headers }) => {
  const token = getAccessToken();
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const client = new ApolloClient({
  link: createAuthErrorLink(refreshSession).concat(authLink).concat(link),
  cache: new InMemoryCache(),
});

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isLoading } = useAuth();

  return (
    <>
      <AnimatedSplashOverlay isLoading={isLoading} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}

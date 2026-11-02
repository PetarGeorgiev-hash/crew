import * as React from "react";
import * as WebBrowser from "expo-web-browser";
import { useIdTokenAuthRequest } from "expo-auth-session/providers/google";
import {
  AuthUserFieldsFragmentDoc,
  AuthUserFieldsFragment,
  SignInWithGoogleDocument,
  LogoutDocument,
  WebSignInWithGoogleDocument,
  WebLogoutDocument,
  LoginDocument,
  WebLoginDocument,
  RefreshDocument,
  WebRefreshTokenDocument,
} from "@/gql/graphql";
import { useFragment as getFragmentData } from "@/gql/fragment-masking";
import {
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  API_URL,
  REFRESH_TOKEN_KEY,
} from "@/utils/constants";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { singleFlight } from "@/auth/single-flight";

export type AuthUser = AuthUserFieldsFragment;

WebBrowser.maybeCompleteAuthSession();

const refreshClient = new ApolloClient({
  link: new HttpLink({
    uri: API_URL,
    credentials: Platform.OS === "web" ? "include" : "omit",
  }),
  cache: new InMemoryCache(),
});

const performRefreshSession = async (): Promise<{
  accessToken: string;
  user: AuthUser;
} | null> => {
  if (Platform.OS === "web") {
    const { data } = await refreshClient.mutate({
      mutation: WebRefreshTokenDocument,
      fetchPolicy: "no-cache",
    });
    const result = data?.webRefresh;
    if (!result) throw new Error("Refresh returned no authentication data");

    setAccessToken(result.accessToken);
    return {
      accessToken: result.accessToken,
      user: getFragmentData(AuthUserFieldsFragmentDoc, result.user),
    };
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const { data } = await refreshClient.mutate({
    mutation: RefreshDocument,
    variables: { refreshTokenInput: { refreshToken } },
    fetchPolicy: "no-cache",
  });
  const result = data?.refresh;
  if (!result) throw new Error("Refresh returned no authentication data");

  await setRefreshToken(result.refreshToken);
  setAccessToken(result.accessToken);
  return {
    accessToken: result.accessToken,
    user: getFragmentData(AuthUserFieldsFragmentDoc, result.user),
  };
};

export const refreshSession = singleFlight(performRefreshSession);

enum AuthMethod {
  local,
  google,
}

const AuthContext = React.createContext({
  user: null as AuthUser | null,
  clearTokens: () => {},
  signIn: (authMethod: AuthMethod, email?: string, password?: string) => {},
  signOut: () => {},
  isLoading: false,
  error: null as Error | null,
  AuthMethod: AuthMethod,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const restoreSessionRef = React.useRef<Promise<AuthUser | null> | null>(null);
  //TODO: add Apple and Meta auth options
  const [_requst, _response, promptAsync] = useIdTokenAuthRequest({
    //TODO: add Android google client id
    iosClientId: EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });

  //local
  const [loginMutation] = useMutation(LoginDocument, {
    context: { skipAuthRefresh: true },
  });
  const [webLoginMutation] = useMutation(WebLoginDocument, {
    context: { skipAuthRefresh: true },
  });

  //google
  const [signInWithGoogle] = useMutation(SignInWithGoogleDocument, {
    context: { skipAuthRefresh: true },
  });
  const [webSignInWithGoogle] = useMutation(WebSignInWithGoogleDocument, {
    context: { skipAuthRefresh: true },
  });

  //logout
  const [logoutMutation] = useMutation(LogoutDocument);
  const [webLogoutMutation] = useMutation(WebLogoutDocument);

  const isWeb = Platform.OS === "web";

  React.useEffect(() => {
    let cancelled = false;

    if (!restoreSessionRef.current) {
      restoreSessionRef.current = (async () => {
        const result = await refreshSession();
        return result?.user ?? null;
      })();
    }

    void restoreSessionRef.current
      .then((restoredUser) => {
        if (!cancelled && restoredUser) setUser(restoredUser);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause : new Error(String(cause)));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (
    method: AuthMethod = AuthMethod.local,
    email?: string,
    password?: string,
  ) => {
    setError(null);
    switch (method) {
      case AuthMethod.local:
        if (email && password) localSignIn(email, password);
        break;
      case AuthMethod.google:
        googleSignIn();
        break;
    }
  };

  const localSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (isWeb) {
        const { data } = await webLoginMutation({
          variables: {
            loginModel: {
              email,
              password,
            },
          },
        });

        const result = data?.webLogin;
        if (!result) {
          throw new Error("Sign-in returned no authentication data");
        }

        setUser(getFragmentData(AuthUserFieldsFragmentDoc, result.user));
        setAccessToken(result.accessToken);
      } else {
        const { data } = await loginMutation({
          variables: { loginModel: { email, password } },
        });
        const result = data?.login;
        console.log(result);
        if (!result) {
          throw new Error("Sign-in returned no authentication data");
        }

        setUser(getFragmentData(AuthUserFieldsFragmentDoc, result.user));
        setAccessToken(result.accessToken);
        await setRefreshToken(result.refreshToken);
      }
    } catch (cause) {
      console.log(cause);
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setIsLoading(false);
    }
  };

  const googleSignIn = async () => {
    try {
      const result = await promptAsync();
      if (result.type !== "success") return;
      setIsLoading(true);

      const idToken = result.params.id_token;
      if (!idToken) {
        throw new Error("Google did not return an ID token");
      }

      if (isWeb) {
        const { data } = await webSignInWithGoogle({
          variables: { idToken },
        });
        const result = data?.webSignInWithGoogle;
        if (!result) {
          throw new Error("Google sign-in returned no authentication data");
        }

        setUser(getFragmentData(AuthUserFieldsFragmentDoc, result.user));
        setAccessToken(result.accessToken);
      } else {
        const { data } = await signInWithGoogle({
          variables: { idToken },
        });
        const result = data?.signInWithGoogle;
        if (!result) {
          throw new Error("Google sign-in returned no authentication data");
        }

        setUser(getFragmentData(AuthUserFieldsFragmentDoc, result.user));
        setAccessToken(result.accessToken);
        await setRefreshToken(result.refreshToken);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const err = "The server did not confirm sign-out";
      if (isWeb) {
        const { data } = await webLogoutMutation();
        if (!data?.webLogout.success) {
          throw new Error(err);
        }
      } else {
        const { data } = await logoutMutation();
        if (!data?.logout.success) {
          throw new Error(err);
        }
        await clearTokens();
      }

      setAccessToken(null);
      setUser(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        clearTokens,
        signIn,
        signOut,
        isLoading,
        error,
        AuthMethod,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

let accessToken: string | null = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getRefreshToken = async () => {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};

export const setRefreshToken = async (token: string) => {
  return await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
};

const clearTokens = async () => {
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

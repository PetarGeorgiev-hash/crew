import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, Keyframe } from "react-native-reanimated";
import { useState } from "react";
import { scheduleOnRN } from "react-native-worklets";

const DURATION = 300;

export function AnimatedSplashOverlay({ isLoading }: { isLoading: boolean }) {
  const [hasLaidOut, setHasLaidOut] = useState(false);
  const [visible, setVisible] = useState(true);
  const animate = hasLaidOut && !isLoading;

  if (!visible) return null;

  const content = (
    <View style={styles.splashContent}>
      <Text style={styles.brand}>Crew</Text>
      {isLoading && <ActivityIndicator color="#ffffff" />}
    </View>
  );

  return animate ? (
    <Animated.View
      entering={new Keyframe({
        0: { opacity: 1 },
        100: { opacity: 0, easing: Easing.out(Easing.ease) },
      })
        .duration(DURATION)
        .withCallback((finished) => {
          "worklet";
          if (finished) scheduleOnRN(setVisible, false);
        })}
      style={styles.splashOverlay}
    >
      {content}
    </Animated.View>
  ) : (
    <View onLayout={() => setHasLaidOut(true)} style={styles.splashOverlay}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#208AEF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  splashContent: {
    alignItems: "center",
    gap: 24,
  },
  brand: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "700",
  },
});

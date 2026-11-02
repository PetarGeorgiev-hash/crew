import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { Keyframe, Easing } from 'react-native-reanimated';
import { useState } from 'react';
import { scheduleOnRN } from 'react-native-worklets';

import classes from './animated-icon.module.css';
const DURATION = 300;

export function AnimatedSplashOverlay({ isLoading }: { isLoading: boolean }) {
  const [hasLaidOut, setHasLaidOut] = useState(false);
  const [visible, setVisible] = useState(true);
  const animate = hasLaidOut && !isLoading;

  if (!visible) return null;

  const content = (
    <View style={styles.splashContent}>
      <Image style={styles.splashImage} source={require('@/assets/images/expo-logo.png')} />
      {isLoading && <ActivityIndicator color="#ffffff" />}
    </View>
  );

  return animate ? (
    <Animated.View
      entering={new Keyframe({
        0: { opacity: 1 },
        100: { opacity: 0, easing: Easing.out(Easing.ease) },
      }).duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) scheduleOnRN(setVisible, false);
      })}
      style={styles.splashOverlay}>
      {content}
    </Animated.View>
  ) : (
    <View onLayout={() => setHasLaidOut(true)} style={styles.splashOverlay}>
      {content}
    </View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: 0 }],
  },
  60: {
    transform: [{ scale: 1.2 }],
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(1.2),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    opacity: 0,
  },
  60: {
    transform: [{ scale: 1.2 }],
    opacity: 0,
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(1.2),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '-180deg' }, { scale: 0.8 }],
    opacity: 0,
  },
  [DURATION / 1000]: {
    transform: [{ rotateZ: '0deg' }, { scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(0.7),
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View style={styles.background} entering={keyframe.duration(DURATION)}>
        <div className={classes.expoLogoBackground} />
      </Animated.View>

      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  splashContent: {
    alignItems: 'center',
    gap: 24,
  },
  splashImage: {
    width: 76,
    height: 71,
  },
  container: {
    alignItems: 'center',
    width: '100%',
    zIndex: 1000,
    position: 'absolute',
    top: 128 / 2 + 138,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71,
  },
  background: {
    width: 128,
    height: 128,
    position: 'absolute',
  },
});

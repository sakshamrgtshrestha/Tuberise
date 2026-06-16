import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { FontSize } from '../theme/typography';

export default function ToastPill({ message, visible }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 10, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.pill, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: Colors.overlayDark,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '80%',
    zIndex: 999,
    // pointer events none so touches pass through
    pointerEvents: 'none',
  },
  text: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});

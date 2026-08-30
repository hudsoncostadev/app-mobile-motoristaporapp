import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors, radius } from "@/src/theme";

export default function AnimatedProgress({
  progress,
  height = 10,
  trackColor = "rgba(255,255,255,0.1)",
  fillColor = colors.accent,
  style,
}: {
  progress: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  style?: ViewStyle;
}) {
  const w = useSharedValue(0);

  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(progress, 1)), {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, w]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${w.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }, style]}>
      <Animated.View style={[styles.fill, { backgroundColor: fillColor }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.pill, overflow: "hidden", width: "100%" },
  fill: { height: "100%", borderRadius: radius.pill },
});

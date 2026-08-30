import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, View } from "react-native";
import { colors, font, radius, spacing } from "@/src/theme";

type Variant = "white" | "dark" | "accent";

export default function PrimaryButton({
  label,
  onPress,
  variant = "white",
  loading = false,
  disabled = false,
  icon,
  testID,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  testID?: string;
  style?: ViewStyle;
}) {
  const bg =
    variant === "white" ? colors.white : variant === "accent" ? colors.accent : colors.card;
  const fg =
    variant === "dark" ? colors.white : colors.card;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 58,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: {
    fontFamily: font.bold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
});

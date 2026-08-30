import React, { createContext, useContext, useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, AlertCircle } from "lucide-react-native";
import { colors, font, radius, spacing } from "@/src/theme";

type ToastType = "success" | "error";
type ToastCtx = { show: (msg: string, type?: ToastType) => void };

const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<ToastType>("success");
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timer = useRef<any>(null);

  const show = useCallback((message: string, t: ToastType = "success") => {
    setMsg(message);
    setType(t);
    if (timer.current) clearTimeout(timer.current);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 2600);
  }, [opacity, translateY]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <Animated.View
        pointerEvents="none"
        testID="app-toast"
        style={[
          styles.wrap,
          { top: insets.top + spacing.sm, opacity, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.toast}>
          {type === "success" ? (
            <CheckCircle2 size={18} color={colors.accent} />
          ) : (
            <AlertCircle size={18} color="#ff6b6b" />
          )}
          <Text style={styles.text} numberOfLines={2}>{msg}</Text>
        </View>
      </Animated.View>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    maxWidth: "100%",
  },
  text: {
    color: colors.white,
    fontFamily: font.medium,
    fontSize: 14,
    flexShrink: 1,
  },
});

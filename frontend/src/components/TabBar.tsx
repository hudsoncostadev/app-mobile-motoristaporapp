import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Home, Target, BarChart3, User } from "lucide-react-native";
import { colors, font, radius } from "@/src/theme";

export const TAB_BAR_HEIGHT = 66;

const ICONS: Record<string, any> = {
  index: Home,
  goals: Target,
  balance: BarChart3,
  profile: User,
};
const LABELS: Record<string, string> = {
  index: "Início",
  goals: "Metas",
  balance: "Balanço",
  profile: "Perfil",
};

export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="bottom-navigation"
      style={[
        styles.bar,
        { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const Icon = ICONS[route.name] ?? Home;
        const label = LABELS[route.name] ?? route.name;

        const onPress = () => {
          if (process.env.EXPO_OS !== "web") {
            Haptics.selectionAsync().catch(() => {});
          }
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            testID={`tab-${route.name}`}
            onPress={onPress}
            style={styles.item}
          >
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Icon
                size={22}
                color={focused ? colors.accent : colors.muted}
                strokeWidth={focused ? 2.4 : 2}
              />
            </View>
            <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "flex-start", gap: 4 },
  iconWrap: {
    width: 44,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: colors.card },
  label: { fontFamily: font.medium, fontSize: 11, color: colors.muted },
  labelActive: { fontFamily: font.bold, color: colors.onSurface },
});

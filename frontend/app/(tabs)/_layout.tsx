import { Tabs } from "expo-router";
import TabBar from "@/src/components/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Início" }} />
      <Tabs.Screen name="goals" options={{ title: "Metas" }} />
      <Tabs.Screen name="balance" options={{ title: "Balanço" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}

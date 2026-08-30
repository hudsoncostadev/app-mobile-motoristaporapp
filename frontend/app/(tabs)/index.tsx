import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import {
  Play,
  Square,
  Car,
  Clock,
  Route as RouteIcon,
  CheckCircle2,
  TrendingUp,
} from "lucide-react-native";
import {
  colors,
  font,
  radius,
  spacing,
  formatBRL,
  formatTimer,
  formatHours,
  todayLabel,
  greeting,
} from "@/src/theme";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/Toast";
import { TAB_BAR_HEIGHT } from "@/src/components/TabBar";
import PrimaryButton from "@/src/components/PrimaryButton";
import GoalDashboard, { GoalData } from "@/src/components/GoalDashboard";

type Workday = {
  workday_id: string;
  status: string;
  started_at: string | null;
  bruto: number;
  liquido: number;
  gastos_total: number;
  km: number;
  hours: number;
  rides_total: number;
};
type TodayResp = { state: "none" | "active" | "closed"; workday: Workday | null };

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();

  const [today, setToday] = useState<TodayResp | null>(null);
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const [t, g] = await Promise.all([
        api<TodayResp>("/workday/today"),
        api<GoalData>("/goals"),
      ]);
      setToday(t);
      setGoal(g);
    } catch {
      show("Erro ao carregar dados", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [show]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Real-time timer
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (today?.state === "active" && today.workday?.started_at) {
      const start = new Date(today.workday.started_at).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [today]);

  const startDay = async () => {
    setBusy(true);
    if (process.env.EXPO_OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const res = await api<TodayResp>("/workday/start", { method: "POST" });
      setToday(res);
      show("Bom trabalho! Dia iniciado");
    } catch (e: any) {
      show(e?.message || "Não foi possível iniciar", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.card} />
      </View>
    );
  }

  const state = today?.state ?? "none";
  const wd = today?.workday;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.xl,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.xl,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.card} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting} testID="home-greeting">{greeting()}</Text>
            <Text style={styles.date}>{todayLabel()}</Text>
          </View>
          <View style={styles.avatar}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{(user?.name ?? "P").trim().charAt(0).toUpperCase()}</Text>
            )}
          </View>
        </View>

        {/* Main card */}
        <View style={styles.card} testID="earnings-card">
          <View style={styles.cardTopRow}>
            <Text style={styles.cardSubtitle}>
              {state === "active" ? "Tempo Trabalhando" : "Faturamento Hoje"}
            </Text>
            <View style={[styles.statusPill, state === "active" && styles.statusPillActive]}>
              <View style={[styles.dot, { backgroundColor: state === "active" ? colors.accent : colors.mutedOnCard }]} />
              <Text style={[styles.statusText, state === "active" && { color: colors.accent }]}>
                {state === "active" ? "Trabalhando" : state === "closed" ? "Dia encerrado" : "Parado"}
              </Text>
            </View>
          </View>

          {state === "active" ? (
            <Text style={styles.timer} testID="workday-timer">{formatTimer(elapsed)}</Text>
          ) : (
            <Text style={styles.value} testID="earnings-value">
              {formatBRL(state === "closed" ? wd?.bruto ?? 0 : 0)}
            </Text>
          )}

          {state === "closed" && wd ? (
            <>
              <View style={styles.liquidoTag}>
                <TrendingUp size={13} color={colors.accent} />
                <Text style={styles.liquidoText}>Líquido {formatBRL(wd.liquido)}</Text>
              </View>
              <View style={styles.statGrid}>
                <Stat icon={<Car size={14} color={colors.accent} />} label="Corridas" value={String(wd.rides_total)} />
                <Stat icon={<RouteIcon size={14} color={colors.accent} />} label="KM" value={`${wd.km}`} />
                <Stat icon={<Clock size={14} color={colors.accent} />} label="Tempo" value={formatHours(wd.hours)} />
              </View>
              <View style={styles.closedBanner} testID="closed-banner">
                <CheckCircle2 size={16} color={colors.accent} />
                <Text style={styles.closedText}>Dia encerrado. Bom descanso!</Text>
              </View>
            </>
          ) : state === "active" ? (
            <PrimaryButton
              testID="end-workday-button"
              label="Encerrar Dia de Trabalho"
              variant="white"
              onPress={() => router.push("/close-day")}
              icon={<Square size={16} color={colors.card} fill={colors.card} />}
              style={{ marginTop: spacing.xl }}
            />
          ) : (
            <PrimaryButton
              testID="start-workday-button"
              label="Iniciar Dia de Trabalho"
              variant="white"
              loading={busy}
              onPress={startDay}
              icon={<Play size={16} color={colors.card} fill={colors.card} />}
              style={{ marginTop: spacing.xl }}
            />
          )}
        </View>

        {/* Goal dashboard */}
        <Text style={styles.sectionTitle}>Sua meta</Text>
        {goal && (
          <GoalDashboard
            goal={goal}
            compact
            onPressConfigure={() => router.push("/goals")}
          />
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statHead}>
        {icon}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xl },
  greeting: { fontFamily: font.extrabold, fontSize: 24, color: colors.onSurface, letterSpacing: -0.6 },
  date: { fontFamily: font.medium, fontSize: 14, color: colors.muted, marginTop: 2 },
  avatar: {
    width: 46, height: 46, borderRadius: radius.pill, backgroundColor: colors.card,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { color: colors.accent, fontFamily: font.black, fontSize: 18 },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardSubtitle: { fontFamily: font.semibold, fontSize: 14, color: colors.accent, letterSpacing: 0.3 },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill,
  },
  statusPillActive: { backgroundColor: "rgba(197,240,74,0.12)" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: font.semibold, fontSize: 12, color: colors.mutedOnCard },
  value: { fontFamily: font.black, fontSize: 52, color: colors.white, letterSpacing: -1.5, marginTop: spacing.lg },
  timer: {
    fontFamily: font.black, fontSize: 54, color: colors.white,
    letterSpacing: -1, marginTop: spacing.lg, fontVariant: ["tabular-nums"],
  },
  liquidoTag: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.md },
  liquidoText: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },
  statGrid: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: radius.md, padding: spacing.md },
  statHead: { flexDirection: "row", alignItems: "center", gap: 5 },
  statLabel: { fontFamily: font.medium, fontSize: 11, color: colors.mutedOnCard },
  statValue: { fontFamily: font.bold, fontSize: 15, color: colors.white, marginTop: 4 },
  closedBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: "rgba(197,240,74,0.1)", borderRadius: radius.md,
    padding: spacing.md, marginTop: spacing.lg,
  },
  closedText: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },

  sectionTitle: {
    fontFamily: font.extrabold, fontSize: 18, color: colors.onSurface,
    marginTop: spacing.xxl, marginBottom: spacing.md, letterSpacing: -0.4,
  },
});

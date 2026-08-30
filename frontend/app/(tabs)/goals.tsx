import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { CalendarRange, CalendarDays, Sun } from "lucide-react-native";
import { colors, font, radius, spacing, formatBRL } from "@/src/theme";
import { api } from "@/src/api/client";
import { useToast } from "@/src/components/Toast";
import { TAB_BAR_HEIGHT } from "@/src/components/TabBar";
import PrimaryButton from "@/src/components/PrimaryButton";
import SheetModal from "@/src/components/SheetModal";
import GoalDashboard, { GoalData } from "@/src/components/GoalDashboard";
import AnimatedProgress from "@/src/components/AnimatedProgress";

export default function Goals() {
  const insets = useSafeAreaInsets();
  const { show } = useToast();

  const [goal, setGoal] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [days, setDays] = useState(6);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<GoalData>("/goals");
      setGoal(res);
    } catch {
      show("Erro ao carregar metas", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [show]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openSheet = () => {
    setTarget(goal?.configured ? String(goal.monthly_target) : "");
    setDays(goal?.configured ? (goal.days_per_week ?? 6) : 6);
    setSheetOpen(true);
  };

  const save = async () => {
    const value = parseFloat(target.replace(",", "."));
    if (!value || value <= 0) {
      show("Informe um valor válido", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await api<GoalData>("/goals", {
        method: "POST",
        body: { monthly_target: value, days_per_week: days },
      });
      setGoal(res);
      setSheetOpen(false);
      if (process.env.EXPO_OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      show("Meta salva!");
    } catch (e: any) {
      show(e?.message || "Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  };

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
        <Text style={styles.title}>Metas</Text>
        <Text style={styles.subtitle}>Seu objetivo de faturamento</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.card} style={{ marginTop: spacing.xxxl }} />
        ) : (
          <>
            <GoalDashboard goal={goal!} onPressConfigure={openSheet} />

            {goal?.configured && (
              <>
                {/* Progress breakdown */}
                <View style={styles.breakdown}>
                  <ProgressLine
                    icon={<Sun size={16} color={colors.card} />}
                    label="Hoje"
                    current={goal.today_bruto ?? 0}
                    target={goal.daily_target ?? 0}
                    progress={goal.today_progress ?? 0}
                  />
                  <ProgressLine
                    icon={<CalendarDays size={16} color={colors.card} />}
                    label="Esta semana"
                    current={goal.week_bruto ?? 0}
                    target={goal.weekly_target ?? 0}
                    progress={goal.week_progress ?? 0}
                  />
                  <ProgressLine
                    icon={<CalendarRange size={16} color={colors.card} />}
                    label="Este mês"
                    current={goal.month_bruto}
                    target={goal.monthly_target ?? 0}
                    progress={goal.progress ?? 0}
                    last
                  />
                </View>

                {/* Plan info */}
                <View style={styles.planCard}>
                  <Text style={styles.planTitle}>Seu plano</Text>
                  <View style={styles.planRow}>
                    <Text style={styles.planLabel}>Dias trabalhados no mês</Text>
                    <Text style={styles.planValue}>
                      {goal.worked_days_count ?? 0} / {goal.working_days ?? 0}
                    </Text>
                  </View>
                  <View style={styles.planRow}>
                    <Text style={styles.planLabel}>Sugestão por dia restante</Text>
                    <Text style={[styles.planValue, { color: colors.onSurface }]}>
                      {formatBRL(goal.needed_per_day ?? 0)}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <PrimaryButton
              testID="configure-goal-button"
              label={goal?.configured ? "Ajustar meta" : "Definir minha meta"}
              variant="dark"
              onPress={openSheet}
              style={{ marginTop: spacing.xl }}
            />
          </>
        )}
      </ScrollView>

      <SheetModal visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Meta mensal" testID="goal-sheet">
        <Text style={styles.inputLabel}>Quanto quer faturar no mês? (bruto)</Text>
        <View style={styles.amountWrap}>
          <Text style={styles.currency}>R$</Text>
          <TextInput
            testID="goal-target-input"
            value={target}
            onChangeText={setTarget}
            placeholder="0,00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            style={styles.amountInput}
          />
        </View>

        <Text style={[styles.inputLabel, { marginTop: spacing.lg }]}>Quantos dias trabalha por semana?</Text>
        <View style={styles.daysRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const active = days === d;
            return (
              <Pressable
                key={d}
                testID={`days-${d}`}
                onPress={() => setDays(d)}
                style={[styles.dayChip, active && styles.dayChipActive]}
              >
                <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          testID="save-goal-button"
          label="Salvar meta"
          variant="dark"
          loading={saving}
          onPress={save}
          style={{ marginTop: spacing.xl }}
        />
      </SheetModal>
    </View>
  );
}

function ProgressLine({
  icon, label, current, target, progress, last,
}: {
  icon: React.ReactNode; label: string; current: number; target: number; progress: number; last?: boolean;
}) {
  return (
    <View style={[lineStyles.wrap, !last && lineStyles.border]}>
      <View style={lineStyles.head}>
        <View style={lineStyles.left}>
          <View style={lineStyles.icon}>{icon}</View>
          <Text style={lineStyles.label}>{label}</Text>
        </View>
        <Text style={lineStyles.value}>
          {formatBRL(current)} <Text style={lineStyles.target}>/ {formatBRL(target)}</Text>
        </Text>
      </View>
      <AnimatedProgress
        progress={progress}
        height={8}
        trackColor={colors.divider}
        fillColor={colors.card}
        style={{ marginTop: spacing.sm }}
      />
    </View>
  );
}

const lineStyles = StyleSheet.create({
  wrap: { paddingVertical: spacing.lg },
  border: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  icon: {
    width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.lightGray,
    alignItems: "center", justifyContent: "center",
  },
  label: { fontFamily: font.semibold, fontSize: 15, color: colors.onSurface },
  value: { fontFamily: font.bold, fontSize: 14, color: colors.onSurface },
  target: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: { fontFamily: font.black, fontSize: 30, color: colors.onSurface, letterSpacing: -1 },
  subtitle: { fontFamily: font.medium, fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: spacing.xl },

  breakdown: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, marginTop: spacing.md,
  },
  planCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl, marginTop: spacing.md },
  planTitle: { fontFamily: font.extrabold, fontSize: 16, color: colors.onSurface, marginBottom: spacing.md },
  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  planLabel: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  planValue: { fontFamily: font.bold, fontSize: 15, color: colors.onSurface },

  inputLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.muted, marginBottom: spacing.sm },
  amountWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.card, paddingHorizontal: spacing.lg, height: 68,
  },
  currency: { fontFamily: font.bold, fontSize: 24, color: colors.muted, marginRight: spacing.sm },
  amountInput: { flex: 1, fontFamily: font.black, fontSize: 32, color: colors.onSurface, letterSpacing: -1 },
  daysRow: { flexDirection: "row", gap: 6, justifyContent: "space-between" },
  dayChip: {
    flex: 1, height: 48, borderRadius: radius.sm, backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.divider, alignItems: "center", justifyContent: "center",
  },
  dayChipActive: { backgroundColor: colors.card, borderColor: colors.card },
  dayChipText: { fontFamily: font.bold, fontSize: 16, color: colors.onSurface },
  dayChipTextActive: { color: colors.accent },
});

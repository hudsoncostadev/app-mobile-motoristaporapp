import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Target, TrendingUp, ChevronRight } from "lucide-react-native";
import { colors, font, radius, spacing, formatBRL } from "@/src/theme";
import AnimatedProgress from "@/src/components/AnimatedProgress";

export type GoalData = {
  configured: boolean;
  monthly_target?: number;
  daily_target?: number;
  weekly_target?: number;
  month_bruto: number;
  month_liquido: number;
  week_bruto?: number;
  today_bruto?: number;
  progress?: number;
  remaining?: number;
  needed_per_day?: number;
  worked_days_count?: number;
  working_days?: number;
  today_progress?: number;
  week_progress?: number;
  days_per_week?: number;
};

export default function GoalDashboard({
  goal,
  onPressConfigure,
  compact = false,
}: {
  goal: GoalData;
  onPressConfigure?: () => void;
  compact?: boolean;
}) {
  if (!goal.configured) {
    return (
      <Pressable
        testID="goal-empty-card"
        onPress={onPressConfigure}
        style={({ pressed }) => [styles.emptyCard, { opacity: pressed ? 0.9 : 1 }]}
      >
        <View style={styles.emptyIcon}>
          <Target size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.emptyTitle}>Defina sua meta mensal</Text>
          <Text style={styles.emptySub}>Toque para configurar seu objetivo</Text>
        </View>
        <ChevronRight size={20} color={colors.mutedOnCard} />
      </Pressable>
    );
  }

  const pct = Math.round((goal.progress ?? 0) * 100);

  return (
    <View style={styles.card} testID="goal-dashboard">
      <View style={styles.top}>
        <View style={styles.labelRow}>
          <Target size={15} color={colors.accent} />
          <Text style={styles.label}>Meta do mês</Text>
        </View>
        {onPressConfigure && (
          <Pressable testID="goal-configure-button" onPress={onPressConfigure} hitSlop={8}>
            <Text style={styles.editLink}>Ajustar</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.bruto} testID="goal-month-bruto">{formatBRL(goal.month_bruto)}</Text>
        <Text style={styles.target}>de {formatBRL(goal.monthly_target ?? 0)}</Text>
      </View>

      <View style={styles.liquidoRow}>
        <TrendingUp size={13} color={colors.mutedOnCard} />
        <Text style={styles.liquido}>Líquido: {formatBRL(goal.month_liquido)}</Text>
      </View>

      <AnimatedProgress progress={goal.progress ?? 0} height={12} style={{ marginTop: spacing.lg }} />

      <View style={styles.footer}>
        <Text style={styles.pct}>{pct}% atingido</Text>
        <Text style={styles.remaining}>Faltam {formatBRL(goal.remaining ?? 0)}</Text>
      </View>

      {!compact && (
        <View style={styles.miniGrid}>
          <View style={styles.miniBox}>
            <Text style={styles.miniLabel}>Meta diária</Text>
            <Text style={styles.miniValue}>{formatBRL(goal.daily_target ?? 0)}</Text>
          </View>
          <View style={styles.miniBox}>
            <Text style={styles.miniLabel}>Meta semanal</Text>
            <Text style={styles.miniValue}>{formatBRL(goal.weekly_target ?? 0)}</Text>
          </View>
          <View style={styles.miniBox}>
            <Text style={styles.miniLabel}>Sugestão/dia</Text>
            <Text style={[styles.miniValue, { color: colors.accent }]}>
              {formatBRL(goal.needed_per_day ?? 0)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.accent },
  editLink: { fontFamily: font.semibold, fontSize: 13, color: colors.mutedOnCard },
  amountRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.lg },
  bruto: { fontFamily: font.black, fontSize: 34, color: colors.white, letterSpacing: -1 },
  target: { fontFamily: font.medium, fontSize: 14, color: colors.mutedOnCard },
  liquidoRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  liquido: { fontFamily: font.medium, fontSize: 13, color: colors.mutedOnCard },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
  pct: { fontFamily: font.extrabold, fontSize: 14, color: colors.accent },
  remaining: { fontFamily: font.medium, fontSize: 13, color: colors.mutedOnCard },
  miniGrid: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  miniBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  miniLabel: { fontFamily: font.medium, fontSize: 11, color: colors.mutedOnCard },
  miniValue: { fontFamily: font.bold, fontSize: 14, color: colors.white, marginTop: 4 },

  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  emptyIcon: {
    width: 42, height: 42, borderRadius: radius.pill,
    backgroundColor: "rgba(197,240,74,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontFamily: font.bold, fontSize: 15, color: colors.white },
  emptySub: { fontFamily: font.regular, fontSize: 12, color: colors.mutedOnCard, marginTop: 2 },
});

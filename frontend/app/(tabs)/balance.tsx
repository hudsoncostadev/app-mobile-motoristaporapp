import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import {
  Wallet,
  CalendarDays,
  Car,
  Route as RouteIcon,
  Clock,
  TrendingDown,
} from "lucide-react-native";
import { colors, font, radius, spacing, formatBRL, formatHours } from "@/src/theme";
import { api } from "@/src/api/client";
import { useToast } from "@/src/components/Toast";
import { TAB_BAR_HEIGHT } from "@/src/components/TabBar";

type Day = { day_key: string; label: string; bruto: number; liquido: number };
type Record = {
  workday_id: string;
  day_key: string;
  ended_at: string | null;
  bruto: number;
  liquido: number;
  gastos_total: number;
  km: number;
  hours: number;
  rides_total: number;
};
type Summary = {
  total_bruto: number;
  total_liquido: number;
  total_gastos: number;
  total_rides: number;
  total_km: number;
  total_hours: number;
  week_bruto: number;
  week_liquido: number;
  today_bruto: number;
  days: Day[];
  records: Record[];
};

export default function Balance() {
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<Summary>("/balance/summary");
      setData(res);
    } catch {
      show("Erro ao carregar balanço", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [show]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.card} />
      </View>
    );
  }

  const maxDay = Math.max(...(data?.days.map((d) => d.bruto) ?? [0]), 1);

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
        <Text style={styles.title}>Balanço</Text>
        <Text style={styles.subtitle}>Bruto, líquido e gastos</Text>

        {/* Total card - bruto big, liquido small */}
        <View style={styles.totalCard} testID="total-balance-card">
          <View style={styles.walletRow}>
            <Wallet size={18} color={colors.accent} />
            <Text style={styles.totalLabel}>Faturamento Bruto</Text>
          </View>
          <Text style={styles.totalValue} testID="total-bruto-value">{formatBRL(data?.total_bruto ?? 0)}</Text>

          <View style={styles.brutoSubRow}>
            <View style={styles.subStat}>
              <Text style={styles.subStatLabel}>Líquido</Text>
              <Text style={styles.subStatValue} testID="total-liquido-value">{formatBRL(data?.total_liquido ?? 0)}</Text>
            </View>
            <View style={styles.subDivider} />
            <View style={styles.subStat}>
              <View style={styles.gastoLabelRow}>
                <TrendingDown size={12} color={colors.mutedOnCard} />
                <Text style={styles.subStatLabel}>Gastos</Text>
              </View>
              <Text style={styles.subStatValue}>{formatBRL(data?.total_gastos ?? 0)}</Text>
            </View>
          </View>
        </View>

        {/* Aggregate mini row */}
        <View style={styles.miniRow}>
          <MiniStat icon={<Car size={16} color={colors.card} />} value={String(data?.total_rides ?? 0)} label="Corridas" />
          <MiniStat icon={<RouteIcon size={16} color={colors.card} />} value={`${data?.total_km ?? 0}`} label="KM" />
          <MiniStat icon={<Clock size={16} color={colors.card} />} value={formatHours(data?.total_hours ?? 0)} label="Tempo" />
        </View>

        {/* 7-day chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <CalendarDays size={16} color={colors.card} />
            <Text style={styles.chartTitle}>Bruto · últimos 7 dias</Text>
          </View>
          <View style={styles.chart}>
            {data?.days.map((d) => {
              const h = 6 + (d.bruto / maxDay) * 96;
              const isTop = d.bruto === maxDay && d.bruto > 0;
              return (
                <View key={d.day_key} style={styles.barCol}>
                  <Text style={styles.barValue}>{d.bruto > 0 ? Math.round(d.bruto) : ""}</Text>
                  <View style={[styles.bar, { height: h, backgroundColor: isTop ? colors.accent : colors.card }]} />
                  <Text style={styles.barLabel}>{d.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Records */}
        <Text style={styles.sectionTitle}>Histórico de dias</Text>
        {(data?.records.length ?? 0) === 0 ? (
          <View style={styles.emptyBox} testID="records-empty">
            <Car size={26} color={colors.muted} />
            <Text style={styles.emptyText}>Nenhum dia encerrado ainda.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {data!.records.map((r) => (
              <View key={r.workday_id} style={styles.recRow} testID={`record-${r.workday_id}`}>
                <View style={styles.recTop}>
                  <Text style={styles.recDate}>
                    {new Date((r.ended_at ?? r.day_key) + (r.ended_at ? "" : "T12:00:00")).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}
                  </Text>
                  <Text style={styles.recBruto}>{formatBRL(r.bruto)}</Text>
                </View>
                <View style={styles.recBottom}>
                  <Text style={styles.recMeta}>
                    {r.rides_total} corridas · {r.km}km · {formatHours(r.hours)}
                  </Text>
                  <Text style={styles.recLiquido}>Líq. {formatBRL(r.liquido)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.miniStat}>
      <View style={styles.miniIcon}>{icon}</View>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.black, fontSize: 30, color: colors.onSurface, letterSpacing: -1 },
  subtitle: { fontFamily: font.medium, fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: spacing.xl },

  totalCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl },
  walletRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  totalLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.accent },
  totalValue: { fontFamily: font.black, fontSize: 44, color: colors.white, letterSpacing: -1.5, marginTop: spacing.md },
  brutoSubRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xl },
  subStat: { flex: 1 },
  gastoLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  subStatLabel: { fontFamily: font.medium, fontSize: 12, color: colors.mutedOnCard },
  subStatValue: { fontFamily: font.extrabold, fontSize: 18, color: colors.white, marginTop: 3 },
  subDivider: { width: 1, height: 38, backgroundColor: "rgba(255,255,255,0.12)", marginHorizontal: spacing.lg },

  miniRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  miniStat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, alignItems: "flex-start" },
  miniIcon: {
    width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.lightGray,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.sm,
  },
  miniValue: { fontFamily: font.extrabold, fontSize: 16, color: colors.onSurface },
  miniLabel: { fontFamily: font.medium, fontSize: 11, color: colors.muted, marginTop: 1 },

  chartCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md },
  chartHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  chartTitle: { fontFamily: font.bold, fontSize: 15, color: colors.onSurface },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 150 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 6 },
  bar: { width: 22, borderRadius: 8 },
  barValue: { fontFamily: font.semibold, fontSize: 10, color: colors.muted, height: 14 },
  barLabel: { fontFamily: font.medium, fontSize: 10, color: colors.muted },

  sectionTitle: {
    fontFamily: font.extrabold, fontSize: 18, color: colors.onSurface,
    marginTop: spacing.xxl, marginBottom: spacing.md, letterSpacing: -0.4,
  },
  emptyBox: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl, backgroundColor: colors.white, borderRadius: radius.md },
  emptyText: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  list: { gap: spacing.sm },
  recRow: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg },
  recTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recDate: { fontFamily: font.bold, fontSize: 15, color: colors.onSurface, textTransform: "capitalize" },
  recBruto: { fontFamily: font.extrabold, fontSize: 17, color: colors.onSurface },
  recBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  recMeta: { fontFamily: font.regular, fontSize: 12, color: colors.muted, flex: 1 },
  recLiquido: { fontFamily: font.semibold, fontSize: 13, color: colors.onSurface },
});

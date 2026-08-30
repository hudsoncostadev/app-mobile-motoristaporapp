import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { X, ArrowLeft, Clock, Route as RouteIcon, Check } from "lucide-react-native";
import { colors, font, radius, spacing, formatBRL, formatTimer } from "@/src/theme";
import { api } from "@/src/api/client";
import { useToast } from "@/src/components/Toast";
import PrimaryButton from "@/src/components/PrimaryButton";

const APPS = ["Uber", "99", "Outros"];

function num(s: string): number {
  const v = parseFloat((s || "").replace(",", "."));
  return isNaN(v) ? 0 : v;
}

export default function CloseDay() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { show } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  const [selected, setSelected] = useState<string[]>(["Uber"]);
  const [earn, setEarn] = useState<Record<string, string>>({});
  const [rides, setRides] = useState<Record<string, string>>({});
  const [km, setKm] = useState("");

  const [abastecimento, setAbastecimento] = useState("");
  const [alimentacao, setAlimentacao] = useState("");
  const [manutencao, setManutencao] = useState("");
  const [outrosGasto, setOutrosGasto] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ state: string; workday: any }>("/workday/today");
        if (res.state !== "active" || !res.workday?.started_at) {
          show("Nenhum dia ativo", "error");
          router.back();
          return;
        }
        const start = new Date(res.workday.started_at).getTime();
        const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
        tick();
        timerRef.current = setInterval(tick, 1000);
      } catch {
        show("Erro ao carregar", "error");
        router.back();
      } finally {
        setLoading(false);
      }
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [router, show]);

  const toggleApp = (app: string) => {
    setSelected((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  const bruto = selected.reduce((sum, a) => sum + num(earn[a] || ""), 0);
  const gastos = num(abastecimento) + num(alimentacao) + num(manutencao) + num(outrosGasto);
  const liquido = bruto - gastos;

  const goStep2 = () => {
    if (selected.length === 0) {
      show("Selecione ao menos um app", "error");
      return;
    }
    if (bruto <= 0) {
      show("Informe o valor ganho", "error");
      return;
    }
    setStep(2);
  };

  const submit = useCallback(async () => {
    setSaving(true);
    try {
      const apps = selected.map((a) => ({
        platform: a,
        amount: num(earn[a] || ""),
        rides: Math.round(num(rides[a] || "")),
      }));
      await api("/workday/close", {
        method: "POST",
        body: {
          apps,
          km: num(km),
          expenses: {
            abastecimento: num(abastecimento),
            alimentacao: num(alimentacao),
            manutencao: num(manutencao),
            outros: num(outrosGasto),
          },
        },
      });
      if (process.env.EXPO_OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      show("Dia encerrado com sucesso!");
      router.back();
    } catch (e: any) {
      show(e?.message || "Erro ao encerrar dia", "error");
    } finally {
      setSaving(false);
    }
  }, [selected, earn, rides, km, abastecimento, alimentacao, manutencao, outrosGasto, router, show]);

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.card} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          testID="close-day-back"
          onPress={() => (step === 2 ? setStep(1) : router.back())}
          style={styles.headerBtn}
        >
          {step === 2 ? <ArrowLeft size={20} color={colors.card} /> : <X size={20} color={colors.card} />}
        </Pressable>
        <View style={styles.stepDots}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
        </View>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAwareScrollView
        bottomOffset={90}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 120 }}
      >
        <Text style={styles.stepLabel}>PASSO {step} DE 2</Text>
        <Text style={styles.title}>{step === 1 ? "Ganhos do dia" : "Gastos do dia"}</Text>
        <Text style={styles.subtitle}>
          {step === 1
            ? "Marque os apps que você usou e informe os valores."
            : "Informe seus gastos de hoje (opcional)."}
        </Text>

        {step === 1 ? (
          <>
            {/* Auto hours + km summary */}
            <View style={styles.autoCard}>
              <View style={styles.autoItem}>
                <View style={styles.autoIcon}><Clock size={16} color={colors.accent} /></View>
                <View>
                  <Text style={styles.autoLabel}>Horas trabalhadas</Text>
                  <Text style={styles.autoValue} testID="auto-hours">{formatTimer(elapsed)}</Text>
                </View>
              </View>
            </View>

            {/* App selector */}
            <Text style={styles.fieldLabel}>Apps utilizados</Text>
            <View style={styles.appRow}>
              {APPS.map((app) => {
                const active = selected.includes(app);
                return (
                  <Pressable
                    key={app}
                    testID={`app-toggle-${app}`}
                    onPress={() => toggleApp(app)}
                    style={[styles.appChip, active && styles.appChipActive]}
                  >
                    {active && <Check size={15} color={colors.accent} strokeWidth={3} />}
                    <Text style={[styles.appChipText, active && styles.appChipTextActive]}>{app}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Per-app inputs */}
            {selected.map((app) => (
              <View key={app} style={styles.appBlock} testID={`app-block-${app}`}>
                <Text style={styles.appBlockTitle}>{app}</Text>
                <View style={styles.dualRow}>
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.miniLabel}>Ganho (R$)</Text>
                    <TextInput
                      testID={`earn-${app}`}
                      value={earn[app] || ""}
                      onChangeText={(v) => setEarn((p) => ({ ...p, [app]: v }))}
                      placeholder="0,00"
                      placeholderTextColor={colors.muted}
                      keyboardType="decimal-pad"
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Corridas</Text>
                    <TextInput
                      testID={`rides-${app}`}
                      value={rides[app] || ""}
                      onChangeText={(v) => setRides((p) => ({ ...p, [app]: v }))}
                      placeholder="0"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </View>
                </View>
              </View>
            ))}

            {/* KM */}
            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Quilometragem rodada</Text>
            <View style={styles.kmWrap}>
              <RouteIcon size={18} color={colors.muted} />
              <TextInput
                testID="km-input"
                value={km}
                onChangeText={setKm}
                placeholder="0"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={styles.kmInput}
              />
              <Text style={styles.kmUnit}>km</Text>
            </View>

            <View style={styles.brutoPreview}>
              <Text style={styles.brutoPreviewLabel}>Faturamento bruto</Text>
              <Text style={styles.brutoPreviewValue}>{formatBRL(bruto)}</Text>
            </View>
          </>
        ) : (
          <>
            <ExpenseInput label="Abastecimento" testID="exp-abastecimento" value={abastecimento} onChange={setAbastecimento} />
            <ExpenseInput label="Alimentação" testID="exp-alimentacao" value={alimentacao} onChange={setAlimentacao} />
            <ExpenseInput label="Manutenção" testID="exp-manutencao" value={manutencao} onChange={setManutencao} />
            <ExpenseInput label="Outros" testID="exp-outros" value={outrosGasto} onChange={setOutrosGasto} />

            {/* Summary */}
            <View style={styles.summaryCard} testID="close-summary">
              <SummaryRow label="Faturamento bruto" value={formatBRL(bruto)} />
              <SummaryRow label="Total de gastos" value={`- ${formatBRL(gastos)}`} muted />
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLiquidoLabel}>Lucro líquido</Text>
                <Text style={styles.summaryLiquidoValue}>{formatBRL(liquido)}</Text>
              </View>
            </View>
          </>
        )}
      </KeyboardAwareScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {step === 1 ? (
          <PrimaryButton testID="next-step-button" label="Próximo: Gastos" variant="dark" onPress={goStep2} />
        ) : (
          <PrimaryButton
            testID="finish-close-button"
            label="Encerrar e salvar"
            variant="dark"
            loading={saving}
            onPress={submit}
            icon={<Check size={18} color={colors.white} strokeWidth={2.6} />}
          />
        )}
      </View>
    </View>
  );
}

function ExpenseInput({ label, value, onChange, testID }: { label: string; value: string; onChange: (v: string) => void; testID: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.kmWrap}>
        <Text style={styles.currency}>R$</Text>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChange}
          placeholder="0,00"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          style={styles.kmInput}
        />
      </View>
    </View>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, muted && { color: colors.mutedOnCard }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.lightGray,
    alignItems: "center", justifyContent: "center",
  },
  stepDots: { flexDirection: "row", gap: 6 },
  stepDot: { width: 28, height: 6, borderRadius: radius.pill, backgroundColor: colors.divider },
  stepDotActive: { backgroundColor: colors.card },

  stepLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.5, color: colors.accent, marginTop: spacing.md },
  title: { fontFamily: font.black, fontSize: 30, color: colors.onSurface, letterSpacing: -1, marginTop: 4 },
  subtitle: { fontFamily: font.medium, fontSize: 14, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.xl },

  autoCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.xl },
  autoItem: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  autoIcon: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: "rgba(197,240,74,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  autoLabel: { fontFamily: font.medium, fontSize: 12, color: colors.mutedOnCard },
  autoValue: { fontFamily: font.black, fontSize: 22, color: colors.white, fontVariant: ["tabular-nums"], marginTop: 2 },

  fieldLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.muted, marginBottom: spacing.sm },
  appRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  appChip: {
    flexDirection: "row", alignItems: "center", gap: 6, flex: 1, height: 50, borderRadius: radius.md,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.divider,
    alignContent: "center", justifyContent: "center",
  },
  appChipActive: { backgroundColor: colors.card, borderColor: colors.card },
  appChipText: { fontFamily: font.bold, fontSize: 15, color: colors.onSurface },
  appChipTextActive: { color: colors.accent },

  appBlock: {
    backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md,
  },
  appBlockTitle: { fontFamily: font.extrabold, fontSize: 16, color: colors.onSurface, marginBottom: spacing.md },
  dualRow: { flexDirection: "row", gap: spacing.md },
  miniLabel: { fontFamily: font.medium, fontSize: 12, color: colors.muted, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.divider,
    paddingHorizontal: spacing.md, height: 52, fontFamily: font.bold, fontSize: 18, color: colors.onSurface,
  },
  kmWrap: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.white,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.card, paddingHorizontal: spacing.lg, height: 58,
  },
  kmInput: { flex: 1, fontFamily: font.bold, fontSize: 20, color: colors.onSurface },
  kmUnit: { fontFamily: font.semibold, fontSize: 15, color: colors.muted },
  currency: { fontFamily: font.bold, fontSize: 18, color: colors.muted },

  brutoPreview: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xl,
  },
  brutoPreviewLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.card },
  brutoPreviewValue: { fontFamily: font.black, fontSize: 24, color: colors.card, letterSpacing: -0.5 },

  summaryCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, marginTop: spacing.lg },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  summaryLabel: { fontFamily: font.medium, fontSize: 15, color: colors.mutedOnCard },
  summaryValue: { fontFamily: font.bold, fontSize: 16, color: colors.white },
  summaryDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: spacing.md },
  summaryLiquidoLabel: { fontFamily: font.bold, fontSize: 16, color: colors.white },
  summaryLiquidoValue: { fontFamily: font.black, fontSize: 26, color: colors.accent, letterSpacing: -0.5 },

  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider,
  },
});

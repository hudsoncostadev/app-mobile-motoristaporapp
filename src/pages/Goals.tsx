import React, { useState, useCallback, useEffect } from "react";
import { CalendarRange, CalendarDays, Sun, X, Check } from "lucide-react";
import { colors, font, radius, spacing, formatBRL } from "../theme";
import { getGoal, saveGoal } from "../db";
import { useAuth } from "../auth";
import { useToast } from "../toast";
import { TAB_BAR_HEIGHT } from "../components/TabBar";
import PrimaryButton from "../components/PrimaryButton";
import GoalDashboard from "../components/GoalDashboard";
import type { GoalData } from "../types";

export default function Goals() {
  const { user } = useAuth();
  const { show } = useToast();

  const [goal, setGoal] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [days, setDays] = useState(6);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getGoal();
      setGoal(res);
    } catch {
      show("Erro ao carregar metas", "error");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user, load]);

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
      const res = await saveGoal(value, days);
      setGoal(res);
      setSheetOpen(false);
      show("Meta salva!");
    } catch (e: any) {
      show(e?.message || "Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: 1, backgroundColor: colors.surface, overflowY: "auto", maxWidth: "480px", margin: "0 auto", width: "100%" }}>
      <div style={{ paddingTop: spacing.xl + 16, padding: `${spacing.xl + 16}px ${spacing.xl}px ${TAB_BAR_HEIGHT + spacing.xl}px` }}>
        <h1 style={{ fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 30, color: colors.onSurface, letterSpacing: -1, margin: 0 }}>Metas</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: spacing.xl }}>Seu objetivo de faturamento</p>

        {loading ? (
          <div style={{ marginTop: spacing.xxxl, display: "flex", justifyContent: "center" }}>
            <div style={{ width: 32, height: 32, border: "3px solid " + colors.card, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }}>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        ) : (
          <>
            {goal && <GoalDashboard goal={goal} onPressConfigure={openSheet} />}

            {goal?.configured && (
              <>
                <div style={{ backgroundColor: colors.white, borderRadius: radius.lg, padding: `0 ${spacing.lg}px`, marginTop: spacing.md }}>
                  <ProgressLine icon={<Sun size={16} color={colors.card} />} label="Hoje" current={goal.today_bruto ?? 0} target={goal.daily_target ?? 0} progress={goal.today_progress ?? 0} />
                  <ProgressLine icon={<CalendarDays size={16} color={colors.card} />} label="Esta semana" current={goal.week_bruto ?? 0} target={goal.weekly_target ?? 0} progress={goal.week_progress ?? 0} />
                  <ProgressLine icon={<CalendarRange size={16} color={colors.card} />} label="Este mês" current={goal.month_bruto} target={goal.monthly_target ?? 0} progress={goal.progress ?? 0} last />
                </div>

                <div style={{ backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl, marginTop: spacing.md }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.extrabold, fontSize: 16, color: colors.onSurface, marginBottom: spacing.md }}>Seu plano</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 14, color: colors.muted }}>Dias trabalhados no mês</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 15, color: colors.onSurface }}>{goal.worked_days_count ?? 0} / {goal.working_days ?? 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 14, color: colors.muted }}>Sugestão por dia restante</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 15, color: colors.onSurface }}>{formatBRL(goal.needed_per_day ?? 0)}</span>
                  </div>
                </div>
              </>
            )}

            <div style={{ marginTop: spacing.xl }}>
              <PrimaryButton
                testID="configure-goal-button"
                label={goal?.configured ? "Ajustar meta" : "Definir minha meta"}
                variant="dark"
                onClick={openSheet}
              />
            </div>
          </>
        )}
      </div>

      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 200 }} />
          <div data-testid="goal-sheet" style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: "480px",
            backgroundColor: colors.surface, borderRadius: "32px 32px 0 0",
            padding: spacing.xl, zIndex: 201,
            boxShadow: "0 -8px 30px rgba(0,0,0,0.15)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 20, color: colors.onSurface, margin: 0 }}>Meta mensal</h2>
              <button onClick={() => setSheetOpen(false)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                <X size={22} color={colors.card} />
              </button>
            </div>

            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 13, color: colors.muted, marginBottom: spacing.sm }}>Quanto quer faturar no mês? (bruto)</div>
            <div style={{ display: "flex", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.md, border: "1.5px solid " + colors.card, padding: `0 ${spacing.lg}px`, height: 68 }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 24, color: colors.muted, marginRight: spacing.sm }}>R$</span>
              <input
                data-testid="goal-target-input"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="0,00"
                type="text"
                inputMode="decimal"
                style={{ flex: 1, fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 32, color: colors.onSurface, letterSpacing: -1, border: "none", outline: "none", background: "transparent" }}
              />
            </div>

            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 13, color: colors.muted, marginTop: spacing.lg, marginBottom: spacing.sm }}>Quantos dias trabalha por semana?</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const active = days === d;
                return (
                  <button
                    key={d}
                    data-testid={`days-${d}`}
                    onClick={() => setDays(d)}
                    style={{
                      flex: 1, height: 48, borderRadius: radius.sm,
                      backgroundColor: active ? colors.card : colors.white,
                      border: "1.5px solid " + (active ? colors.card : colors.divider),
                      cursor: "pointer",
                      fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 16,
                      color: active ? colors.accent : colors.onSurface,
                    }}
                  >{d}</button>
                );
              })}
            </div>

            <div style={{ marginTop: spacing.xl }}>
              <PrimaryButton testID="save-goal-button" label="Salvar meta" variant="dark" loading={saving} onClick={save} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProgressLine({ icon, label, current, target, progress, last }: { icon: React.ReactNode; label: string; current: number; target: number; progress: number; last?: boolean }) {
  return (
    <div style={{ padding: `${spacing.lg}px 0`, borderBottom: last ? "none" : `1px solid ${colors.divider}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: colors.lightGray, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
          <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 15, color: colors.onSurface }}>{label}</span>
        </div>
        <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 14, color: colors.onSurface }}>
          {formatBRL(current)} <span style={{ fontWeight: font.medium, fontSize: 12, color: colors.muted }}>/ {formatBRL(target)}</span>
        </span>
      </div>
      <div style={{ marginTop: spacing.sm, height: 8, borderRadius: 999, backgroundColor: colors.divider, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(progress * 100, 100)}%`, height: "100%", borderRadius: 999, backgroundColor: colors.card, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

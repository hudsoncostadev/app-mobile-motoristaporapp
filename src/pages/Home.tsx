import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Square, Car, Clock, Route as RouteIcon, CircleCheck as CheckCircle2, TrendingUp } from "lucide-react";
import { colors, font, radius, spacing, formatBRL, formatTimer, formatHours, todayLabel, greeting } from "../theme";
import { api } from "../api";
import { useAuth } from "../auth";
import { useToast } from "../toast";
import { TAB_BAR_HEIGHT } from "../components/TabBar";
import PrimaryButton from "../components/PrimaryButton";
import GoalDashboard from "../components/GoalDashboard";
import type { TodayResp, GoalData } from "../types";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();

  const [today, setToday] = useState<TodayResp | null>(null);
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    }
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (today?.state === "active" && today.workday?.started_at) {
      const start = new Date(today.workday.started_at).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [today]);

  const startDay = async () => {
    setBusy(true);
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
      <div style={{ flex: 1, backgroundColor: colors.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid " + colors.card, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const state = today?.state ?? "none";
  const wd = today?.workday;

  return (
    <div style={{ flex: 1, backgroundColor: colors.surface, overflowY: "auto", maxWidth: "480px", margin: "0 auto", width: "100%" }}>
      <div style={{ paddingTop: spacing.xl + 16, padding: `${spacing.xl + 16}px ${spacing.xl}px ${TAB_BAR_HEIGHT + spacing.xl}px` }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: spacing.xl }}>
          <div style={{ flex: 1 }}>
            <div data-testid="home-greeting" style={{ fontFamily: "Inter, sans-serif", fontWeight: font.extrabold, fontSize: 24, color: colors.onSurface, letterSpacing: -0.6 }}>{greeting()}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 14, color: colors.muted, marginTop: 2 }}>{todayLabel()}</div>
          </div>
          <div style={{
            width: 46, height: 46, borderRadius: 999, backgroundColor: colors.card,
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}>
            {user?.picture ? (
              <img src={user.picture} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: colors.accent, fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 18 }}>
                {(user?.name ?? "P").trim().charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div data-testid="earnings-card" style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 14, color: colors.accent, letterSpacing: 0.3 }}>
              {state === "active" ? "Tempo Trabalhando" : "Faturamento Hoje"}
            </span>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              backgroundColor: state === "active" ? "rgba(197,240,74,0.12)" : "rgba(255,255,255,0.08)",
              padding: `6px ${spacing.md}px`, borderRadius: radius.pill,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: state === "active" ? colors.accent : colors.mutedOnCard }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 12, color: state === "active" ? colors.accent : colors.mutedOnCard }}>
                {state === "active" ? "Trabalhando" : state === "closed" ? "Dia encerrado" : "Parado"}
              </span>
            </div>
          </div>

          {state === "active" ? (
            <div data-testid="workday-timer" style={{ fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 54, color: colors.white, letterSpacing: -1, marginTop: spacing.lg, fontVariantNumeric: "tabular-nums" }}>{formatTimer(elapsed)}</div>
          ) : (
            <div data-testid="earnings-value" style={{ fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 52, color: colors.white, letterSpacing: -1.5, marginTop: spacing.lg }}>
              {formatBRL(state === "closed" ? wd?.bruto ?? 0 : 0)}
            </div>
          )}

          {state === "closed" && wd ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: spacing.md }}>
                <TrendingUp size={13} color={colors.accent} />
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 13, color: colors.accent }}>Líquido {formatBRL(wd.liquido)}</span>
              </div>
              <div style={{ display: "flex", gap: spacing.sm, marginTop: spacing.xl }}>
                <Stat icon={<Car size={14} color={colors.accent} />} label="Corridas" value={String(wd.rides_total)} />
                <Stat icon={<RouteIcon size={14} color={colors.accent} />} label="KM" value={`${wd.km}`} />
                <Stat icon={<Clock size={14} color={colors.accent} />} label="Tempo" value={formatHours(wd.hours)} />
              </div>
              <div data-testid="closed-banner" style={{
                display: "flex", alignItems: "center", gap: spacing.sm,
                backgroundColor: "rgba(197,240,74,0.1)", borderRadius: radius.md,
                padding: spacing.md, marginTop: spacing.lg,
              }}>
                <CheckCircle2 size={16} color={colors.accent} />
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 13, color: colors.accent }}>Dia encerrado. Bom descanso!</span>
              </div>
            </>
          ) : state === "active" ? (
            <div style={{ marginTop: spacing.xl }}>
              <PrimaryButton
                testID="end-workday-button"
                label="Encerrar Dia de Trabalho"
                variant="white"
                onClick={() => navigate("/close-day")}
                icon={<Square size={16} color={colors.card} fill={colors.card} />}
              />
            </div>
          ) : (
            <div style={{ marginTop: spacing.xl }}>
              <PrimaryButton
                testID="start-workday-button"
                label="Iniciar Dia de Trabalho"
                variant="white"
                loading={busy}
                onClick={startDay}
                icon={<Play size={16} color={colors.card} fill={colors.card} />}
              />
            </div>
          )}
        </div>

        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.extrabold, fontSize: 18, color: colors.onSurface, marginTop: spacing.xxl, marginBottom: spacing.md, letterSpacing: -0.4 }}>Sua meta</div>
        {goal && (
          <GoalDashboard goal={goal} compact onPressConfigure={() => navigate("/goals")} />
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: radius.md, padding: spacing.md }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>{icon}<span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 11, color: colors.mutedOnCard }}>{label}</span></div>
      <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 15, color: colors.white, marginTop: 4 }}>{value}</div>
    </div>
  );
}

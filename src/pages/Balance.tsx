import React, { useState, useCallback, useEffect } from "react";
import { Wallet, CalendarDays, Car, Route as RouteIcon, Clock, TrendingDown } from "lucide-react";
import { colors, font, radius, spacing, formatBRL, formatHours } from "../theme";
import { getBalanceSummary } from "../db";
import { useAuth } from "../auth";
import { useToast } from "../toast";
import { TAB_BAR_HEIGHT } from "../components/TabBar";
import type { BalanceSummary } from "../types";

export default function Balance() {
  const { user } = useAuth();
  const { show } = useToast();
  const [data, setData] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await getBalanceSummary();
      setData(res);
    } catch {
      show("Erro ao carregar balanço", "error");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user, load]);

  if (loading) {
    return (
      <div style={{ flex: 1, backgroundColor: colors.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid " + colors.card, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const maxDay = Math.max(...(data?.days.map((d) => d.bruto) ?? [0]), 1);

  return (
    <div style={{ flex: 1, backgroundColor: colors.surface, overflowY: "auto", maxWidth: "480px", margin: "0 auto", width: "100%" }}>
      <div style={{ paddingTop: spacing.xl + 16, padding: `${spacing.xl + 16}px ${spacing.xl}px ${TAB_BAR_HEIGHT + spacing.xl}px` }}>
        <h1 style={{ fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 30, color: colors.onSurface, letterSpacing: -1, margin: 0 }}>Balanço</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: spacing.xl }}>Bruto, líquido e gastos</p>

        <div data-testid="total-balance-card" style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl }}>
          <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
            <Wallet size={18} color={colors.accent} />
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 14, color: colors.accent }}>Faturamento Bruto</span>
          </div>
          <div data-testid="total-bruto-value" style={{ fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 44, color: colors.white, letterSpacing: -1.5, marginTop: spacing.md }}>{formatBRL(data?.total_bruto ?? 0)}</div>

          <div style={{ display: "flex", alignItems: "center", marginTop: spacing.xl }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 12, color: colors.mutedOnCard }}>Líquido</div>
              <div data-testid="total-liquido-value" style={{ fontFamily: "Inter, sans-serif", fontWeight: font.extrabold, fontSize: 18, color: colors.white, marginTop: 3 }}>{formatBRL(data?.total_liquido ?? 0)}</div>
            </div>
            <div style={{ width: 1, height: 38, backgroundColor: "rgba(255,255,255,0.12)", margin: `0 ${spacing.lg}px` }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <TrendingDown size={12} color={colors.mutedOnCard} />
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 12, color: colors.mutedOnCard }}>Gastos</span>
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.extrabold, fontSize: 18, color: colors.white, marginTop: 3 }}>{formatBRL(data?.total_gastos ?? 0)}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: spacing.sm, marginTop: spacing.md }}>
          <MiniStat icon={<Car size={16} color={colors.card} />} value={String(data?.total_rides ?? 0)} label="Corridas" />
          <MiniStat icon={<RouteIcon size={16} color={colors.card} />} value={`${data?.total_km ?? 0}`} label="KM" />
          <MiniStat icon={<Clock size={16} color={colors.card} />} value={formatHours(data?.total_hours ?? 0)} label="Tempo" />
        </div>

        <div style={{ backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md }}>
          <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg }}>
            <CalendarDays size={16} color={colors.card} />
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 15, color: colors.onSurface }}>Bruto · últimos 7 dias</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 150 }}>
            {data?.days.map((d) => {
              const h = 6 + (d.bruto / maxDay) * 96;
              const isTop = d.bruto === maxDay && d.bruto > 0;
              return (
                <div key={d.day_key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 10, color: colors.muted, height: 14 }}>{d.bruto > 0 ? Math.round(d.bruto) : ""}</span>
                  <div style={{ width: 22, height: h, borderRadius: 8, backgroundColor: isTop ? colors.accent : colors.card }} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 10, color: colors.muted }}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.extrabold, fontSize: 18, color: colors.onSurface, marginTop: spacing.xxl, marginBottom: spacing.md, letterSpacing: -0.4 }}>Histórico de dias</div>
        {(data?.records.length ?? 0) === 0 ? (
          <div data-testid="records-empty" style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: spacing.md, padding: `${spacing.xxl}px 0`, backgroundColor: colors.white, borderRadius: radius.md }}>
            <Car size={26} color={colors.muted} />
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 14, color: colors.muted }}>Nenhum dia encerrado ainda.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
            {data!.records.map((r) => (
              <div key={r.workday_id} data-testid={`record-${r.workday_id}`} style={{ backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 15, color: colors.onSurface, textTransform: "capitalize" }}>
                    {new Date((r.ended_at ?? r.day_key) + (r.ended_at ? "" : "T12:00:00")).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                  </span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.extrabold, fontSize: 17, color: colors.onSurface }}>{formatBRL(r.bruto)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.regular, fontSize: 12, color: colors.muted, flex: 1 }}>{r.rides_total} corridas · {r.km}km · {formatHours(r.hours)}</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 13, color: colors.onSurface }}>Líq. {formatBRL(r.liquido)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: colors.lightGray, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: spacing.sm }}>{icon}</div>
      <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.extrabold, fontSize: 16, color: colors.onSurface }}>{value}</span>
      <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 11, color: colors.muted, marginTop: 1 }}>{label}</span>
    </div>
  );
}

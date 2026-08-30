import React from "react";
import { Target, TrendingUp, ChevronRight } from "lucide-react";
import { colors, font, radius, spacing, formatBRL } from "../theme";
import type { GoalData } from "../types";

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
      <button
        data-testid="goal-empty-card"
        onClick={onPressConfigure}
        style={{
          display: "flex",
          alignItems: "center",
          gap: spacing.md,
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          padding: spacing.lg,
          border: "none",
          cursor: "pointer",
          width: "100%",
        }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: 999,
          backgroundColor: "rgba(197,240,74,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Target size={20} color={colors.accent} />
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 15, color: colors.white }}>Defina sua meta mensal</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.regular, fontSize: 12, color: colors.mutedOnCard, marginTop: 2 }}>Toque para configurar seu objetivo</div>
        </div>
        <ChevronRight size={20} color={colors.mutedOnCard} />
      </button>
    );
  }

  const pct = Math.round((goal.progress ?? 0) * 100);

  return (
    <div data-testid="goal-dashboard" style={{
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.xl,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Target size={15} color={colors.accent} />
          <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 14, color: colors.accent }}>Meta do mês</span>
        </div>
        {onPressConfigure && (
          <button data-testid="goal-configure-button" onClick={onPressConfigure} style={{ border: "none", background: "transparent", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 13, color: colors.mutedOnCard }}>
            Ajustar
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.lg }}>
        <span data-testid="goal-month-bruto" style={{ fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 34, color: colors.white, letterSpacing: -1 }}>{formatBRL(goal.month_bruto)}</span>
        <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 14, color: colors.mutedOnCard }}>de {formatBRL(goal.monthly_target ?? 0)}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
        <TrendingUp size={13} color={colors.mutedOnCard} />
        <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 13, color: colors.mutedOnCard }}>Líquido: {formatBRL(goal.month_liquido)}</span>
      </div>

      <div style={{ marginTop: spacing.lg, height: 12, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <div style={{
          width: `${Math.min((goal.progress ?? 0) * 100, 100)}%`,
          height: "100%",
          borderRadius: 999,
          backgroundColor: colors.accent,
          transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.extrabold, fontSize: 14, color: colors.accent }}>{pct}% atingido</span>
        <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 13, color: colors.mutedOnCard }}>Faltam {formatBRL(goal.remaining ?? 0)}</span>
      </div>

      {!compact && (
        <div style={{ display: "flex", gap: spacing.sm, marginTop: spacing.xxl }}>
          <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: radius.md, padding: spacing.md }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 11, color: colors.mutedOnCard }}>Meta diária</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 14, color: colors.white, marginTop: 4 }}>{formatBRL(goal.daily_target ?? 0)}</div>
          </div>
          <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: radius.md, padding: spacing.md }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 11, color: colors.mutedOnCard }}>Meta semanal</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 14, color: colors.white, marginTop: 4 }}>{formatBRL(goal.weekly_target ?? 0)}</div>
          </div>
          <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: radius.md, padding: spacing.md }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 11, color: colors.mutedOnCard }}>Sugestão/dia</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 14, color: colors.accent, marginTop: 4 }}>{formatBRL(goal.needed_per_day ?? 0)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

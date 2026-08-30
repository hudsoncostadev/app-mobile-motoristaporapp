import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowLeft, Clock, Route as RouteIcon, Check } from "lucide-react";
import { colors, font, radius, spacing, formatBRL, formatTimer } from "../theme";
import { api } from "../api";
import { useToast } from "../toast";
import PrimaryButton from "../components/PrimaryButton";

const APPS = ["Uber", "99", "Outros"];

function num(s: string): number {
  const v = parseFloat((s || "").replace(",", "."));
  return isNaN(v) ? 0 : v;
}

export default function CloseDay() {
  const navigate = useNavigate();
  const { show } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          navigate("/");
          return;
        }
        const start = new Date(res.workday.started_at).getTime();
        const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
        tick();
        timerRef.current = setInterval(tick, 1000);
      } catch {
        show("Erro ao carregar", "error");
        navigate("/");
      } finally {
        setLoading(false);
      }
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [navigate, show]);

  const toggleApp = (app: string) => {
    setSelected((prev) => prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]);
  };

  const bruto = selected.reduce((sum, a) => sum + num(earn[a] || ""), 0);
  const gastos = num(abastecimento) + num(alimentacao) + num(manutencao) + num(outrosGasto);
  const liquido = bruto - gastos;

  const goStep2 = () => {
    if (selected.length === 0) { show("Selecione ao menos um app", "error"); return; }
    if (bruto <= 0) { show("Informe o valor ganho", "error"); return; }
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
      show("Dia encerrado com sucesso!");
      navigate("/");
    } catch (e: any) {
      show(e?.message || "Erro ao encerrar dia", "error");
    } finally {
      setSaving(false);
    }
  }, [selected, earn, rides, km, abastecimento, alimentacao, manutencao, outrosGasto, navigate, show]);

  if (loading) {
    return (
      <div style={{ flex: 1, backgroundColor: colors.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid " + colors.card, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, backgroundColor: colors.surface, maxWidth: "480px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${spacing.xl + 8}px ${spacing.xl}px ${spacing.md}px` }}>
        <button data-testid="close-day-back" onClick={() => (step === 2 ? setStep(1) : navigate("/"))} style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: colors.lightGray, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {step === 2 ? <ArrowLeft size={20} color={colors.card} /> : <X size={20} color={colors.card} />}
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 28, height: 6, borderRadius: 999, backgroundColor: colors.card }} />
          <div style={{ width: 28, height: 6, borderRadius: 999, backgroundColor: step === 2 ? colors.card : colors.divider }} />
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: `0 ${spacing.xl}px 120px` }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 11, letterSpacing: 1.5, color: colors.accent, marginTop: spacing.md }}>PASSO {step} DE 2</div>
        <h1 style={{ fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 30, color: colors.onSurface, letterSpacing: -1, marginTop: 4, margin: 0 }}>{step === 1 ? "Ganhos do dia" : "Gastos do dia"}</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: spacing.xl }}>
          {step === 1 ? "Marque os apps que você usou e informe os valores." : "Informe seus gastos de hoje (opcional)."}
        </p>

        {step === 1 ? (
          <>
            <div style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.xl, display: "flex", alignItems: "center", gap: spacing.md }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: "rgba(197,240,74,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={16} color={colors.accent} />
              </div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 12, color: colors.mutedOnCard }}>Horas trabalhadas</div>
                <div data-testid="auto-hours" style={{ fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 22, color: colors.white, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{formatTimer(elapsed)}</div>
              </div>
            </div>

            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 13, color: colors.muted, marginBottom: spacing.sm }}>Apps utilizados</div>
            <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.lg }}>
              {APPS.map((app) => {
                const active = selected.includes(app);
                return (
                  <button key={app} data-testid={`app-toggle-${app}`} onClick={() => toggleApp(app)} style={{
                    flex: 1, height: 50, borderRadius: radius.md,
                    backgroundColor: active ? colors.card : colors.white,
                    border: "1.5px solid " + (active ? colors.card : colors.divider),
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 15,
                    color: active ? colors.accent : colors.onSurface,
                  }}>
                    {active && <Check size={15} color={colors.accent} strokeWidth={3} />}
                    {app}
                  </button>
                );
              })}
            </div>

            {selected.map((app) => (
              <div key={app} data-testid={`app-block-${app}`} style={{ backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.extrabold, fontSize: 16, color: colors.onSurface, marginBottom: spacing.md }}>{app}</div>
                <div style={{ display: "flex", gap: spacing.md }}>
                  <div style={{ flex: 1.4 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 12, color: colors.muted, marginBottom: 6 }}>Ganho (R$)</div>
                    <input data-testid={`earn-${app}`} value={earn[app] || ""} onChange={(e) => setEarn((p) => ({ ...p, [app]: e.target.value }))} placeholder="0,00" inputMode="decimal" style={{ backgroundColor: colors.surface, borderRadius: radius.sm, border: "1.5px solid " + colors.divider, padding: `0 ${spacing.md}px`, height: 52, fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 18, color: colors.onSurface, width: "100%", outline: "none" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 12, color: colors.muted, marginBottom: 6 }}>Corridas</div>
                    <input data-testid={`rides-${app}`} value={rides[app] || ""} onChange={(e) => setRides((p) => ({ ...p, [app]: e.target.value }))} placeholder="0" inputMode="numeric" style={{ backgroundColor: colors.surface, borderRadius: radius.sm, border: "1.5px solid " + colors.divider, padding: `0 ${spacing.md}px`, height: 52, fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 18, color: colors.onSurface, width: "100%", outline: "none" }} />
                  </div>
                </div>
              </div>
            ))}

            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 13, color: colors.muted, marginTop: spacing.lg, marginBottom: spacing.sm }}>Quilometragem rodada</div>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, backgroundColor: colors.white, borderRadius: radius.md, border: "1.5px solid " + colors.card, padding: `0 ${spacing.lg}px`, height: 58 }}>
              <RouteIcon size={18} color={colors.muted} />
              <input data-testid="km-input" value={km} onChange={(e) => setKm(e.target.value)} placeholder="0" inputMode="decimal" style={{ flex: 1, fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 20, color: colors.onSurface, border: "none", outline: "none", background: "transparent" }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 15, color: colors.muted }}>km</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xl }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 14, color: colors.card }}>Faturamento bruto</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 24, color: colors.card, letterSpacing: -0.5 }}>{formatBRL(bruto)}</span>
            </div>
          </>
        ) : (
          <>
            <ExpenseInput label="Abastecimento" testID="exp-abastecimento" value={abastecimento} onChange={setAbastecimento} />
            <ExpenseInput label="Alimentação" testID="exp-alimentacao" value={alimentacao} onChange={setAlimentacao} />
            <ExpenseInput label="Manutenção" testID="exp-manutencao" value={manutencao} onChange={setManutencao} />
            <ExpenseInput label="Outros" testID="exp-outros" value={outrosGasto} onChange={setOutrosGasto} />

            <div data-testid="close-summary" style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, marginTop: spacing.lg }}>
              <SummaryRow label="Faturamento bruto" value={formatBRL(bruto)} />
              <SummaryRow label="Total de gastos" value={`- ${formatBRL(gastos)}`} muted />
              <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.12)", margin: `${spacing.md}px 0` }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 16, color: colors.white }}>Lucro líquido</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 26, color: colors.accent, letterSpacing: -0.5 }}>{formatBRL(liquido)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: `${spacing.md}px ${spacing.xl}px ${spacing.md}px`, backgroundColor: colors.surface, borderTop: "1px solid " + colors.divider, maxWidth: "480px", margin: "0 auto" }}>
        {step === 1 ? (
          <PrimaryButton testID="next-step-button" label="Próximo: Gastos" variant="dark" onClick={goStep2} />
        ) : (
          <PrimaryButton testID="finish-close-button" label="Encerrar e salvar" variant="dark" loading={saving} onClick={submit} icon={<Check size={18} color={colors.white} strokeWidth={2.6} />} />
        )}
      </div>
    </div>
  );
}

function ExpenseInput({ label, value, onChange, testID }: { label: string; value: string; onChange: (v: string) => void; testID: string }) {
  return (
    <div style={{ marginBottom: spacing.md }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 13, color: colors.muted, marginBottom: spacing.sm }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, backgroundColor: colors.white, borderRadius: radius.md, border: "1.5px solid " + colors.card, padding: `0 ${spacing.lg}px`, height: 58 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 18, color: colors.muted }}>R$</span>
        <input data-testid={testID} value={value} onChange={(e) => onChange(e.target.value)} placeholder="0,00" inputMode="decimal" style={{ flex: 1, fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 20, color: colors.onSurface, border: "none", outline: "none", background: "transparent" }} />
      </div>
    </div>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 15, color: colors.mutedOnCard }}>{label}</span>
      <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 16, color: muted ? colors.mutedOnCard : colors.white }}>{value}</span>
    </div>
  );
}

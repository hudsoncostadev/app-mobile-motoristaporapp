import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User as UserIcon } from "lucide-react";
import { colors, font, radius, spacing } from "../theme";
import { useAuth } from "../auth";
import { useToast } from "../toast";

import PrimaryButton from "../components/PrimaryButton";

export default function Login() {
  const navigate = useNavigate();
  const { loginEmail, register } = useAuth();
  const { show } = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      show("Preencha todos os campos", "error");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") await loginEmail(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
      navigate("/");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível entrar";
      show(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    fontFamily: "Inter, sans-serif",
    fontWeight: font.medium,
    fontSize: 16,
    color: colors.onSurface,
    border: "none",
    outline: "none",
    background: "transparent",
    height: "100%",
  };

  const inputWrapStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: `0 ${spacing.lg}px`,
    height: 58,
    border: "1.5px solid " + colors.card,
  };

  return (
    <div style={{
      flex: 1,
      backgroundColor: colors.surface,
      overflowY: "auto",
      maxWidth: "480px",
      margin: "0 auto",
      width: "100%",
    }}>
      <div style={{
        padding: `48px ${spacing.xl}px 24px`,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 48 }}>
          <div style={{
            width: 46, height: 46, borderRadius: radius.md,
            backgroundColor: colors.card,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: colors.accent, fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 24 }}>D</span>
          </div>
          <span style={{
            fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 11,
            letterSpacing: 2, color: colors.card,
            backgroundColor: colors.accent,
            padding: `6px ${spacing.md}px`,
            borderRadius: radius.pill,
          }}>MOTORISTA</span>
        </div>

        <h1 style={{ fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 40, lineHeight: 1.1, color: colors.onSurface, letterSpacing: -1, margin: 0 }}>
          Ganhe mais,<br />dirija melhor.
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontWeight: font.regular, fontSize: 15, color: colors.muted, marginTop: spacing.md, marginBottom: spacing.xxl }}>
          Seu banco digital de faturamento. Controle cada corrida.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
          {mode === "register" && (
            <div style={inputWrapStyle}>
              <UserIcon size={18} color={colors.muted} />
              <input
                data-testid="name-input"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}
          <div style={inputWrapStyle}>
            <Mail size={18} color={colors.muted} />
            <input
              data-testid="email-input"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={inputWrapStyle}>
            <Lock size={18} color={colors.muted} />
            <input
              data-testid="password-input"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            />
          </div>

          <div style={{ marginTop: spacing.sm }}>
            <PrimaryButton
              testID="submit-button"
              label={mode === "login" ? "Entrar" : "Criar conta"}
              variant="dark"
              loading={loading}
              onClick={submit}
            />
          </div>
        </div>

        <button
          data-testid="toggle-mode-button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          style={{
            marginTop: spacing.xl,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            fontWeight: font.regular,
            fontSize: 14,
            color: colors.muted,
            width: "100%",
          }}
        >
          {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
          <span style={{ fontWeight: font.bold, color: colors.onSurface }}>
            {mode === "login" ? "Cadastre-se" : "Entrar"}
          </span>
        </button>
      </div>
    </div>
  );
}

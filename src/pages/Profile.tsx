import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, ChevronRight, LogOut, ShieldCheck, CircleHelp as HelpCircle, Pencil, Mail, X } from "lucide-react";
import { colors, font, radius, spacing } from "../theme";
import { api } from "../api";
import { useAuth } from "../auth";
import { useToast } from "../toast";
import { TAB_BAR_HEIGHT } from "../components/TabBar";
import PrimaryButton from "../components/PrimaryButton";
import type { User } from "../types";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuth();
  const { show } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [vehicle, setVehicle] = useState(user?.vehicle ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api<{ user: User }>("/profile", {
        method: "PUT",
        body: { name: name.trim(), vehicle: vehicle.trim() },
      });
      setUser(res.user);
      setSheetOpen(false);
      show("Perfil atualizado");
    } catch {
      show("Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  };

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  const openEdit = () => {
    setName(user?.name ?? "");
    setVehicle(user?.vehicle ?? "");
    setSheetOpen(true);
  };

  const rows = [
    { icon: Car, label: "Meu veículo", value: user?.vehicle || "Não informado", onPress: openEdit, testID: "row-vehicle" },
    { icon: ShieldCheck, label: "Conta", value: "Verificada", onPress: () => show("Conta verificada"), testID: "row-account" },
    { icon: HelpCircle, label: "Suporte", value: "", onPress: () => show("Fale conosco em breve"), testID: "row-support" },
  ];

  return (
    <div style={{ flex: 1, backgroundColor: colors.surface, overflowY: "auto", maxWidth: "480px", margin: "0 auto", width: "100%" }}>
      <div style={{ paddingTop: spacing.xl + 16, padding: `${spacing.xl + 16}px ${spacing.xl}px ${TAB_BAR_HEIGHT + spacing.xl}px` }}>
        <h1 style={{ fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 30, color: colors.onSurface, letterSpacing: -1, margin: "0 0 " + spacing.xl + "px" }}>Perfil</h1>

        <div data-testid="profile-card" style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{
            width: 84, height: 84, borderRadius: 999, backgroundColor: colors.accent,
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}>
            {user?.picture ? (
              <img src={user.picture} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: colors.card, fontFamily: "Inter, sans-serif", fontWeight: font.black, fontSize: 34 }}>{(user?.name ?? "P").trim().charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div data-testid="profile-name" style={{ fontFamily: "Inter, sans-serif", fontWeight: font.extrabold, fontSize: 22, color: colors.white, marginTop: spacing.lg }}>{user?.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
            <Mail size={13} color={colors.mutedOnCard} />
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.regular, fontSize: 13, color: colors.mutedOnCard }}>{user?.email}</span>
          </div>
          <button data-testid="edit-profile-button" onClick={openEdit} style={{
            display: "flex", alignItems: "center", gap: 6, backgroundColor: colors.accent,
            padding: `0 ${spacing.lg}px`, height: 40, borderRadius: radius.pill, marginTop: spacing.lg,
            border: "none", cursor: "pointer",
          }}>
            <Pencil size={14} color={colors.card} />
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 14, color: colors.card }}>Editar perfil</span>
          </button>
        </div>

        <div style={{ backgroundColor: colors.white, borderRadius: radius.md, marginTop: spacing.lg, padding: `0 ${spacing.lg}px` }}>
          {rows.map((row, i) => {
            const RowIcon = row.icon;
            return (
              <button
                key={row.label}
                data-testid={row.testID}
                onClick={row.onPress}
                style={{
                  display: "flex", alignItems: "center", gap: spacing.md, padding: `${spacing.lg}px 0`,
                  border: "none", borderBottom: i < rows.length - 1 ? `1px solid ${colors.divider}` : "none",
                  background: "transparent", cursor: "pointer", width: "100%", textAlign: "left",
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 999, backgroundColor: colors.lightGray, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RowIcon size={19} color={colors.card} />
                </div>
                <span style={{ flex: 1, fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 15, color: colors.onSurface }}>{row.label}</span>
                {!!row.value && <span style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 13, color: colors.muted, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.value}</span>}
                <ChevronRight size={18} color={colors.muted} />
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: spacing.xl }}>
          <PrimaryButton testID="logout-button" label="Sair da conta" variant="dark" onClick={doLogout} icon={<LogOut size={18} color={colors.white} />} />
        </div>

        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 12, color: colors.muted, textAlign: "center", marginTop: spacing.xl }}>DriverBank · v1.0.0</div>
      </div>

      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 200 }} />
          <div data-testid="edit-profile-sheet" style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: "480px",
            backgroundColor: colors.surface, borderRadius: "32px 32px 0 0",
            padding: spacing.xl, zIndex: 201,
            boxShadow: "0 -8px 30px rgba(0,0,0,0.15)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontWeight: font.bold, fontSize: 20, color: colors.onSurface, margin: 0 }}>Editar perfil</h2>
              <button onClick={() => setSheetOpen(false)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                <X size={22} color={colors.card} />
              </button>
            </div>

            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 13, color: colors.muted, marginBottom: spacing.sm }}>Nome</div>
            <input data-testid="edit-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" style={{ backgroundColor: colors.white, borderRadius: radius.md, border: "1.5px solid " + colors.card, padding: `0 ${spacing.lg}px`, height: 56, fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 16, color: colors.onSurface, width: "100%", outline: "none" }} />

            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: font.semibold, fontSize: 13, color: colors.muted, marginTop: spacing.lg, marginBottom: spacing.sm }}>Veículo</div>
            <input data-testid="edit-vehicle-input" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="Ex: Onix 2020 - ABC1D23" style={{ backgroundColor: colors.white, borderRadius: radius.md, border: "1.5px solid " + colors.card, padding: `0 ${spacing.lg}px`, height: 56, fontFamily: "Inter, sans-serif", fontWeight: font.medium, fontSize: 16, color: colors.onSurface, width: "100%", outline: "none" }} />

            <div style={{ marginTop: spacing.xl }}>
              <PrimaryButton testID="save-profile-button" label="Salvar" variant="dark" loading={saving} onClick={save} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

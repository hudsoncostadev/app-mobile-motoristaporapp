import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  Car,
  ChevronRight,
  LogOut,
  ShieldCheck,
  HelpCircle,
  Pencil,
  Mail,
} from "lucide-react-native";
import { colors, font, radius, spacing } from "@/src/theme";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/Toast";
import { TAB_BAR_HEIGHT } from "@/src/components/TabBar";
import PrimaryButton from "@/src/components/PrimaryButton";
import SheetModal from "@/src/components/SheetModal";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, setUser } = useAuth();
  const { show } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [vehicle, setVehicle] = useState(user?.vehicle ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api<{ user: any }>("/profile", {
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
    router.replace("/login");
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
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.xl,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.xl,
        }}
      >
        <Text style={styles.title}>Perfil</Text>

        {/* Profile card */}
        <View style={styles.card} testID="profile-card">
          <View style={styles.avatar}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{(user?.name ?? "P").trim().charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.name} testID="profile-name">{user?.name}</Text>
          <View style={styles.emailRow}>
            <Mail size={13} color={colors.mutedOnCard} />
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <Pressable testID="edit-profile-button" onPress={openEdit} style={styles.editBtn}>
            <Pencil size={14} color={colors.card} />
            <Text style={styles.editText}>Editar perfil</Text>
          </Pressable>
        </View>

        {/* Settings list */}
        <View style={styles.list}>
          {rows.map((row, i) => (
            <Pressable
              key={row.label}
              testID={row.testID}
              onPress={row.onPress}
              style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
            >
              <View style={styles.rowIcon}>
                <row.icon size={19} color={colors.card} />
              </View>
              <Text style={styles.rowLabel}>{row.label}</Text>
              {!!row.value && <Text style={styles.rowValue}>{row.value}</Text>}
              <ChevronRight size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        <PrimaryButton
          testID="logout-button"
          label="Sair da conta"
          variant="dark"
          onPress={doLogout}
          icon={<LogOut size={18} color={colors.white} />}
          style={{ marginTop: spacing.xl }}
        />

        <Text style={styles.version}>DriverBank · v1.0.0</Text>
      </ScrollView>

      <SheetModal visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Editar perfil" testID="edit-profile-sheet">
        <Text style={styles.inputLabel}>Nome</Text>
        <TextInput
          testID="edit-name-input"
          value={name}
          onChangeText={setName}
          placeholder="Seu nome"
          placeholderTextColor={colors.muted}
          style={styles.textInput}
        />
        <Text style={[styles.inputLabel, { marginTop: spacing.lg }]}>Veículo</Text>
        <TextInput
          testID="edit-vehicle-input"
          value={vehicle}
          onChangeText={setVehicle}
          placeholder="Ex: Onix 2020 - ABC1D23"
          placeholderTextColor={colors.muted}
          style={styles.textInput}
        />
        <PrimaryButton
          testID="save-profile-button"
          label="Salvar"
          variant="dark"
          loading={saving}
          onPress={save}
          style={{ marginTop: spacing.xl }}
        />
      </SheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: { fontFamily: font.black, fontSize: 30, color: colors.onSurface, letterSpacing: -1, marginBottom: spacing.xl },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center" },
  avatar: {
    width: 84, height: 84, borderRadius: radius.pill, backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { color: colors.card, fontFamily: font.black, fontSize: 34 },
  name: { fontFamily: font.extrabold, fontSize: 22, color: colors.white, marginTop: spacing.lg },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  email: { fontFamily: font.regular, fontSize: 13, color: colors.mutedOnCard },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg, height: 40, borderRadius: radius.pill, marginTop: spacing.lg,
  },
  editText: { fontFamily: font.bold, fontSize: 14, color: colors.card },

  list: { backgroundColor: colors.white, borderRadius: radius.md, marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowIcon: {
    width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.lightGray,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.onSurface },
  rowValue: { fontFamily: font.medium, fontSize: 13, color: colors.muted, maxWidth: 140 },
  version: { fontFamily: font.medium, fontSize: 12, color: colors.muted, textAlign: "center", marginTop: spacing.xl },

  inputLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.muted, marginBottom: spacing.sm },
  textInput: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.card,
    paddingHorizontal: spacing.lg, height: 56, fontFamily: font.medium, fontSize: 16, color: colors.onSurface,
  },
});

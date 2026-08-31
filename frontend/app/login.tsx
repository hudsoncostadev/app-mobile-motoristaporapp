import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Mail, Lock, User as UserIcon } from "lucide-react-native";
import { colors, font, radius, spacing } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/Toast";
import PrimaryButton from "@/src/components/PrimaryButton";
import { ApiError } from "@/src/api/client";

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loginEmail, register } = useAuth();
  const { show } = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      show("Preencha todos os campos", "error");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") await loginEmail(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
      router.replace("/(tabs)");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Não foi possível entrar";
      show(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>D</Text>
          </View>
          <Text style={styles.badge}>MOTORISTA</Text>
        </View>

        <Text style={styles.title}>Ganhe mais,{"\n"}dirija melhor.</Text>
        <Text style={styles.subtitle}>
          Seu banco digital de faturamento. Controle cada corrida.
        </Text>

        <View style={styles.form}>
          {mode === "register" && (
            <View style={styles.inputWrap}>
              <UserIcon size={18} color={colors.muted} />
              <TextInput
                testID="name-input"
                placeholder="Seu nome"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
          )}
          <View style={styles.inputWrap}>
            <Mail size={18} color={colors.muted} />
            <TextInput
              testID="email-input"
              placeholder="E-mail"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
          <View style={styles.inputWrap}>
            <Lock size={18} color={colors.muted} />
            <TextInput
              testID="password-input"
              placeholder="Senha"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
            />
          </View>

          <PrimaryButton
            testID="submit-button"
            label={mode === "login" ? "Entrar" : "Criar conta"}
            variant="dark"
            loading={loading}
            onPress={submit}
            style={{ marginTop: spacing.sm }}
          />

        </View>

        <Pressable
          testID="toggle-mode-button"
          onPress={() => setMode(mode === "login" ? "register" : "login")}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>
            {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
            <Text style={styles.toggleStrong}>
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </Text>
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.xl, flexGrow: 1 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xxxl,
  },
  logoMark: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMarkText: { color: colors.accent, fontFamily: font.black, fontSize: 24 },
  badge: {
    fontFamily: font.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.card,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  title: {
    fontFamily: font.black,
    fontSize: 40,
    lineHeight: 44,
    color: colors.onSurface,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.muted,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  form: { gap: spacing.md },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 58,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  input: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 16,
    color: colors.onSurface,
    height: "100%",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  line: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: { fontFamily: font.medium, color: colors.muted, fontSize: 13 },
  googleBtn: {
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  gIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  gIconText: { color: colors.accent, fontFamily: font.black, fontSize: 13 },
  googleText: { fontFamily: font.bold, fontSize: 16, color: colors.card },
  toggle: { marginTop: spacing.xl, alignItems: "center" },
  toggleText: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  toggleStrong: { fontFamily: font.bold, color: colors.onSurface },
});

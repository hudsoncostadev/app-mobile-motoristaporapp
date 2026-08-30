export const colors = {
  surface: "#f4f4f4",
  card: "#010101",
  onCard: "#ffffff",
  onSurface: "#010101",
  accent: "#c5f04a",
  onAccent: "#010101",
  white: "#ffffff",
  muted: "#8a8a8a",
  mutedOnCard: "#9a9a9a",
  border: "#010101",
  divider: "#e5e5e5",
  lightGray: "#e9e9e9",
  error: "#ff3b30",
};

export const font = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 32,
  pill: 999,
};

export function formatBRL(value: number): string {
  return "R$ " + (value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function todayLabel(): string {
  const d = new Date();
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia, Parceiro";
  if (h < 18) return "Boa tarde, Parceiro";
  return "Boa noite, Parceiro";
}

export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

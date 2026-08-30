import { supabase } from "./supabase";
import type { TodayResp, GoalData, BalanceSummary, Workday, User } from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---- Auth ----

export async function verifyUserPassword(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.rpc("verify_user_password", {
    user_email: email,
    user_password: password,
  });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Credenciais inválidas");
  const u = data[0];
  return { user_id: u.id, name: u.name, email: u.email, picture: null, vehicle: null };
}

export async function signupUser(name: string, email: string, password: string): Promise<User> {
  const { data, error } = await supabase.rpc("signup_user", {
    p_email: email,
    p_password: password,
    p_name: name,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return {
    user_id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    picture: null,
    vehicle: null,
  };
}

// ---- Workday ----

export async function getToday(): Promise<TodayResp> {
  const uid = getStoredUserId();
  if (!uid) return { state: "none", workday: null };

  const { data, error } = await supabase.rpc("get_today_workday", { p_user_id: uid });
  if (error) throw new Error(error.message);
  if (!data || data.state === "none") return { state: "none", workday: null };
  return { state: data.state, workday: rowToWorkday(data.workday) };
}

export async function startWorkday(): Promise<TodayResp> {
  const uid = getStoredUserId();
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("start_workday", { p_user_id: uid });
  if (error) throw new Error(error.message);
  return { state: data.state, workday: rowToWorkday(data.workday) };
}

export async function closeWorkday(
  apps: { platform: string; amount: number; rides: number }[],
  km: number,
  expenses: Record<string, number>
): Promise<TodayResp> {
  const uid = getStoredUserId();
  if (!uid) throw new Error("Not authenticated");

  const validApps = apps.filter((a) => a.amount > 0 || a.rides > 0);
  const { data, error } = await supabase.rpc("close_workday_data", {
    p_user_id: uid,
    p_apps: validApps,
    p_km: km,
    p_expenses: expenses,
  });
  if (error) throw new Error(error.message);
  return { state: data.state, workday: rowToWorkday(data.workday) };
}

function rowToWorkday(row: any): Workday {
  if (!row) return {} as Workday;
  return {
    workday_id: row.id,
    day_key: row.day_key,
    status: row.status,
    started_at: row.started_at,
    ended_at: row.ended_at,
    bruto: Number(row.bruto) || 0,
    liquido: Number(row.liquido) || 0,
    gastos_total: Number(row.gastos_total) || 0,
    km: Number(row.km) || 0,
    hours: Number(row.hours) || 0,
    rides_total: row.rides_total || 0,
    apps: row.apps || [],
    expenses: row.expenses || {},
  };
}

// ---- Goals ----

export async function getGoal(): Promise<GoalData> {
  const uid = getStoredUserId();
  if (!uid) return { configured: false, month_bruto: 0, month_liquido: 0, worked_days_count: 0 };

  const { data, error } = await supabase.rpc("get_goal_data", { p_user_id: uid });
  if (error) throw new Error(error.message);
  if (!data) return { configured: false, month_bruto: 0, month_liquido: 0, worked_days_count: 0 };

  if (!data.configured) {
    return { configured: false, month_bruto: 0, month_liquido: 0, worked_days_count: 0 };
  }

  return {
    configured: true,
    monthly_target: Number(data.monthly_target) || 0,
    days_per_week: data.days_per_week || 5,
  month_bruto: 0,
    month_liquido: 0,
  worked_days_count: 0,
  daily_target: Number(data.monthly_target) > 0 && data.days_per_week > 0
      ? round2(Number(data.monthly_target) / (data.days_per_week * 4))
      : 0,
    weekly_target: Number(data.monthly_target) > 0 && data.days_per_week > 0
      ? round2((Number(data.monthly_target) / (data.days_per_week * 4)) * data.days_per_week)
      : 0,
    progress: 0,
    week_progress: 0,
    today_progress: 0,
    remaining: Number(data.monthly_target) || 0,
    needed_per_day: 0,
  };
}

export async function saveGoal(monthlyTarget: number, daysPerWeek: number): Promise<GoalData> {
  const uid = getStoredUserId();
  if (!uid) throw new Error("Not authenticated");

  const { error } = await supabase.rpc("save_goal_data", {
    p_user_id: uid,
    p_monthly_target: monthlyTarget,
    p_days_per_week: daysPerWeek,
  });
  if (error) throw new Error(error.message);
  return getGoal();
}

// ---- Balance ----

export async function getBalanceSummary(): Promise<BalanceSummary> {
  const uid = getStoredUserId();
  if (!uid) return emptyBalance();

  const { data, error } = await supabase.rpc("get_balance_data", { p_user_id: uid });
  if (error) throw new Error(error.message);
  if (!data) return emptyBalance();

  const chart = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    chart.push({
      day_key: dt.toISOString().slice(0, 10),
      label: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      bruto: 0,
      liquido: 0,
    });
  }

  return {
    total_bruto: Number(data.total_bruto) || 0,
    total_liquido: Number(data.total_liquido) || 0,
    total_gastos: Number(data.total_gastos) || 0,
    total_rides: data.total_rides || 0,
    total_km: Number(data.total_km) || 0,
    total_hours: Number(data.total_hours) || 0,
    week_bruto: Number(data.week_bruto) || 0,
    week_liquido: Number(data.week_liquido) || 0,
    today_bruto: Number(data.today_bruto) || 0,
    days: chart,
    records: [],
  };
}

function emptyBalance(): BalanceSummary {
  const chart = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    chart.push({
      day_key: dt.toISOString().slice(0, 10),
      label: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      bruto: 0,
      liquido: 0,
    });
  }
  return {
    total_bruto: 0, total_liquido: 0, total_gastos: 0,
    total_rides: 0, total_km: 0, total_hours: 0,
    week_bruto: 0, week_liquido: 0, today_bruto: 0,
    days: chart, records: [],
  };
}

// ---- Profile ----

export async function updateProfile(name: string, vehicle: string): Promise<void> {
  const uid = getStoredUserId();
  if (!uid) throw new Error("Not authenticated");

  const { error } = await supabase.rpc("update_profile_data", {
    p_user_id: uid,
    p_name: name,
    p_vehicle: vehicle,
  });
  if (error) throw new Error(error.message);
}

// ---- Local storage for user session ----

const STORAGE_KEY = "driverbank_user";

export function getStoredUserId(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user.user_id ?? null;
  } catch {
    return null;
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeUser(user: User): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}

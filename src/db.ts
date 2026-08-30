import { supabase } from "./supabase";
import type { TodayResp, GoalData, BalanceSummary, Workday } from "./types";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
function monthPrefix(): string {
  return new Date().toISOString().slice(0, 7);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// ---- Workday ----

export async function getToday(): Promise<TodayResp> {
  const uid = await getUserId();
  if (!uid) return { state: "none", workday: null };

  const { data: active } = await supabase
    .from("workdays")
    .select("*")
    .eq("user_id", uid)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (active) return { state: "active", workday: rowToWorkday(active) };

  const { data: closed } = await supabase
    .from("workdays")
    .select("*")
    .eq("user_id", uid)
    .eq("status", "closed")
    .eq("day_key", todayKey())
    .is("deleted_at", null)
    .maybeSingle();

  if (closed) return { state: "closed", workday: rowToWorkday(closed) };
  return { state: "none", workday: null };
}

export async function startWorkday(): Promise<TodayResp> {
  const uid = await getUserId();
  if (!uid) throw new Error("Not authenticated");

  const existing = await getToday();
  if (existing.state === "active") return existing;
  if (existing.state === "closed") throw new Error("Você já encerrou o dia de hoje");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("workdays")
    .insert({
      user_id: uid,
      day_key: todayKey(),
      status: "active",
      started_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { state: "active", workday: rowToWorkday(data) };
}

export async function closeWorkday(
  apps: { platform: string; amount: number; rides: number }[],
  km: number,
  expenses: Record<string, number>
): Promise<TodayResp> {
  const uid = await getUserId();
  if (!uid) throw new Error("Not authenticated");

  const { data: active } = await supabase
    .from("workdays")
    .select("*")
    .eq("user_id", uid)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (!active) throw new Error("Nenhum dia de trabalho ativo");

  const ended = new Date();
  const started = new Date(active.started_at || ended.toISOString());
  const hours = Math.max((ended.getTime() - started.getTime()) / 3600000, 0);
  const validApps = apps.filter((a) => a.amount > 0 || a.rides > 0);
  const bruto = round2(validApps.reduce((s, a) => s + a.amount, 0));
  const ridesTotal = validApps.reduce((s, a) => s + a.rides, 0);
  const gastosTotal = round2(
    (expenses.abastecimento || 0) + (expenses.alimentacao || 0) + (expenses.manutencao || 0) + (expenses.outros || 0)
  );
  const liquido = round2(bruto - gastosTotal);

  const { data, error } = await supabase
    .from("workdays")
    .update({
      status: "closed",
      ended_at: ended.toISOString(),
      hours: round2(hours),
      km: Math.round(km * 10) / 10,
      bruto,
      liquido,
      gastos_total: gastosTotal,
      rides_total: ridesTotal,
      apps: validApps,
      expenses,
    })
    .eq("id", active.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { state: "closed", workday: rowToWorkday(data) };
}

function rowToWorkday(row: any): Workday {
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
  const uid = await getUserId();
  if (!uid) return { configured: false, month_bruto: 0, month_liquido: 0, worked_days_count: 0 };

  const { data: goalRow } = await supabase
    .from("goal_settings")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  const { data: days } = await supabase
    .from("workdays")
    .select("day_key, bruto, liquido, km, hours, rides_total")
    .eq("user_id", uid)
    .eq("status", "closed")
    .is("deleted_at", null)
    .order("ended_at", { ascending: false });

  return computeGoal(goalRow, days || []);
}

export async function saveGoal(monthlyTarget: number, daysPerWeek: number): Promise<GoalData> {
  const uid = await getUserId();
  if (!uid) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("goal_settings")
    .upsert({
      user_id: uid,
      monthly_target: round2(monthlyTarget),
      days_per_week: daysPerWeek,
      updated_at: new Date().toISOString(),
    });

  if (error) throw new Error(error.message);
  return getGoal();
}

function computeGoal(goal: any, days: any[]): GoalData {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const mp = monthPrefix();
  const monthDays = days.filter((d) => String(d.day_key).startsWith(mp));
  const monthBruto = round2(monthDays.reduce((s, d) => s + (Number(d.bruto) || 0), 0));
  const monthLiquido = round2(monthDays.reduce((s, d) => s + (Number(d.liquido) || 0), 0));
  const workedDaysCount = monthDays.length;

  if (!goal) {
    return { configured: false, month_bruto: monthBruto, month_liquido: monthLiquido, worked_days_count: workedDaysCount, days_in_month: daysInMonth };
  }

  const monthlyTarget = round2(goal.monthly_target);
  const dpw = goal.days_per_week;
  const weeksInMonth = daysInMonth / 7;
  const workingDays = Math.max(Math.round(dpw * weeksInMonth), 1);
  const dailyTarget = round2(monthlyTarget / workingDays);
  const weeklyTarget = round2(dailyTarget * dpw);

  const weekKeys = new Set<string>();
  for (let i = 0; i < 7; i++) weekKeys.add(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  const weekBruto = round2(days.filter((d) => weekKeys.has(String(d.day_key))).reduce((s, d) => s + (Number(d.bruto) || 0), 0));
  const todayBruto = round2(days.find((d) => String(d.day_key) === todayKey())?.bruto || 0);

  const remaining = Math.max(round2(monthlyTarget - monthBruto), 0);
  const daysLeft = Math.max(workingDays - workedDaysCount, 0);
  const neededPerDay = daysLeft > 0 ? round2(remaining / daysLeft) : 0;

  return {
    configured: true,
    monthly_target: monthlyTarget,
    days_per_week: dpw,
    working_days: workingDays,
    daily_target: dailyTarget,
    weekly_target: weeklyTarget,
    month_bruto: monthBruto,
    month_liquido: monthLiquido,
    week_bruto: weekBruto,
    today_bruto: todayBruto,
    worked_days_count: workedDaysCount,
    days_in_month: daysInMonth,
    progress: monthlyTarget > 0 ? Math.min(monthBruto / monthlyTarget, 1) : 0,
    week_progress: weeklyTarget > 0 ? Math.min(weekBruto / weeklyTarget, 1) : 0,
    today_progress: dailyTarget > 0 ? Math.min(todayBruto / dailyTarget, 1) : 0,
    remaining,
    needed_per_day: neededPerDay,
  };
}

// ---- Balance ----

export async function getBalanceSummary(): Promise<BalanceSummary> {
  const uid = await getUserId();
  if (!uid) return emptyBalance();

  const { data: days } = await supabase
    .from("workdays")
    .select("*")
    .eq("user_id", uid)
    .eq("status", "closed")
    .is("deleted_at", null)
    .order("ended_at", { ascending: false });

  const allDays = days || [];
  const totalBruto = round2(allDays.reduce((s, r) => s + (Number(r.bruto) || 0), 0));
  const totalLiquido = round2(allDays.reduce((s, r) => s + (Number(r.liquido) || 0), 0));
  const totalGastos = round2(allDays.reduce((s, r) => s + (Number(r.gastos_total) || 0), 0));
  const totalRides = allDays.reduce((s, r) => s + (r.rides_total || 0), 0);
  const totalKm = Math.round(allDays.reduce((s, r) => s + (Number(r.km) || 0), 0) * 10) / 10;
  const totalHours = Math.round(allDays.reduce((s, r) => s + (Number(r.hours) || 0), 0) * 10) / 10;

  const byDay: Record<string, any> = {};
  allDays.forEach((r) => { byDay[String(r.day_key)] = r; });

  const chart = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    const dk = dt.toISOString().slice(0, 10);
    const rec = byDay[dk];
    chart.push({
      day_key: dk,
      label: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      bruto: rec ? round2(Number(rec.bruto) || 0) : 0,
      liquido: rec ? round2(Number(rec.liquido) || 0) : 0,
    });
  }

  const weekKeys = new Set<string>();
  for (let i = 0; i < 7; i++) weekKeys.add(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  const weekBruto = round2(allDays.filter((r) => weekKeys.has(String(r.day_key))).reduce((s, r) => s + (Number(r.bruto) || 0), 0));
  const weekLiquido = round2(allDays.filter((r) => weekKeys.has(String(r.day_key))).reduce((s, r) => s + (Number(r.liquido) || 0), 0));

  const records = allDays.slice(0, 60).map((r) => ({
    workday_id: r.id,
    day_key: String(r.day_key),
    ended_at: r.ended_at,
    bruto: Number(r.bruto) || 0,
    liquido: Number(r.liquido) || 0,
    gastos_total: Number(r.gastos_total) || 0,
    km: Number(r.km) || 0,
    hours: Number(r.hours) || 0,
    rides_total: r.rides_total || 0,
  }));

  return {
    total_bruto: totalBruto,
    total_liquido: totalLiquido,
    total_gastos: totalGastos,
    total_rides: totalRides,
    total_km: totalKm,
    total_hours: totalHours,
    week_bruto: weekBruto,
    week_liquido: weekLiquido,
    today_bruto: byDay[todayKey()]?.bruto || 0,
    days: chart,
    records,
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
  const uid = await getUserId();
  if (!uid) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ name, vehicle })
    .eq("id", uid);

  if (error) throw new Error(error.message);
}

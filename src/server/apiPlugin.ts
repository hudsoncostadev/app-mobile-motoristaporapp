import bcryptjs from "bcryptjs";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const bcrypt = bcryptjs;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "../../backend/driverbank.json");

type DBShape = {
  users: Record<string, any>;
  sessions: Record<string, { user_id: string; expires_at: string }>;
  workdays: any[];
  goals: Record<string, any>;
};

let db: DBShape | null = null;

function loadDB(): DBShape {
  if (db) return db;
  if (existsSync(DB_PATH)) {
    try {
      const raw = readFileSync(DB_PATH, "utf-8");
      db = JSON.parse(raw);
    } catch {
      db = freshDB();
    }
  } else {
    db = freshDB();
  }
  // Migrate: ensure all keys exist
  if (!db!.users) db!.users = {};
  if (!db!.sessions) db!.sessions = {};
  if (!db!.workdays) db!.workdays = [];
  if (!db!.goals) db!.goals = {};
  return db!;
}

function freshDB(): DBShape {
  return { users: {}, sessions: {}, workdays: [], goals: {} };
}

function saveDB() {
  if (!db) return;
  try {
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("Failed to save DB:", e);
  }
}

function nowISO() { return new Date().toISOString(); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function monthPrefix() { return new Date().toISOString().slice(0, 7); }
function genId(prefix: string) { return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`; }

function createSession(userId: string): string {
  const token = `st_${randomUUID().replace(/-/g, "")}${randomUUID().replace(/-/g, "")}`;
  const d = loadDB();
  d.sessions[token] = { user_id: userId, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() };
  saveDB();
  return token;
}

function getUserByToken(token: string): any | null {
  const d = loadDB();
  const session = d.sessions[token];
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) return null;
  return d.users[session.user_id] || null;
}

function publicUser(u: any) {
  return { user_id: u.user_id, name: u.name, email: u.email, picture: u.picture, vehicle: u.vehicle };
}

function serializeWorkday(row: any) {
  return {
    workday_id: row.workday_id,
    day_key: row.day_key,
    status: row.status,
    started_at: row.started_at,
    ended_at: row.ended_at,
    bruto: Math.round((row.bruto || 0) * 100) / 100,
    liquido: Math.round((row.liquido || 0) * 100) / 100,
    gastos_total: Math.round((row.gastos_total || 0) * 100) / 100,
    km: row.km || 0,
    hours: Math.round((row.hours || 0) * 100) / 100,
    rides_total: row.rides_total || 0,
    apps: row.apps || [],
    expenses: row.expenses || {},
  };
}

function findActive(userId: string) {
  return loadDB().workdays.find((w) => w.user_id === userId && w.status === "active" && !w.deleted_at);
}
function findClosedToday(userId: string) {
  return loadDB().workdays.find((w) => w.user_id === userId && w.status === "closed" && w.day_key === todayKey() && !w.deleted_at);
}
function closedDays(userId: string) {
  return loadDB().workdays.filter((w) => w.user_id === userId && w.status === "closed" && !w.deleted_at).sort((a, b) => (b.ended_at || "").localeCompare(a.ended_at || ""));
}

function computeGoal(goal: any, days: any[]) {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const mp = monthPrefix();
  const monthDays = days.filter((d) => d.day_key.startsWith(mp));
  const monthBruto = Math.round(monthDays.reduce((s, d) => s + (d.bruto || 0), 0) * 100) / 100;
  const monthLiquido = Math.round(monthDays.reduce((s, d) => s + (d.liquido || 0), 0) * 100) / 100;
  const workedDaysCount = monthDays.length;

  if (!goal) {
    return { configured: false, month_bruto: monthBruto, month_liquido: monthLiquido, worked_days_count: workedDaysCount, days_in_month: daysInMonth };
  }

  const monthlyTarget = Math.round(goal.monthly_target * 100) / 100;
  const daysPerWeek = goal.days_per_week;
  const weeksInMonth = daysInMonth / 7;
  const workingDays = Math.max(Math.round(daysPerWeek * weeksInMonth), 1);
  const dailyTarget = Math.round((monthlyTarget / workingDays) * 100) / 100;
  const weeklyTarget = Math.round((dailyTarget * daysPerWeek) * 100) / 100;

  const weekKeys = new Set<string>();
  for (let i = 0; i < 7; i++) weekKeys.add(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  const weekBruto = Math.round(days.filter((d) => weekKeys.has(d.day_key)).reduce((s, d) => s + (d.bruto || 0), 0) * 100) / 100;
  const todayBruto = Math.round((days.find((d) => d.day_key === todayKey())?.bruto || 0) * 100) / 100;

  const remaining = Math.max(Math.round((monthlyTarget - monthBruto) * 100) / 100, 0);
  const daysLeft = Math.max(workingDays - workedDaysCount, 0);
  const neededPerDay = daysLeft > 0 ? Math.round((remaining / daysLeft) * 100) / 100 : 0;

  return {
    configured: true, monthly_target: monthlyTarget, days_per_week: daysPerWeek,
    working_days: workingDays, daily_target: dailyTarget, weekly_target: weeklyTarget,
    month_bruto: monthBruto, month_liquido: monthLiquido, week_bruto: weekBruto, today_bruto: todayBruto,
    worked_days_count: workedDaysCount, days_in_month: daysInMonth,
    progress: monthlyTarget > 0 ? Math.min(monthBruto / monthlyTarget, 1) : 0,
    week_progress: weeklyTarget > 0 ? Math.min(weekBruto / weeklyTarget, 1) : 0,
    today_progress: dailyTarget > 0 ? Math.min(todayBruto / dailyTarget, 1) : 0,
    remaining, needed_per_day: neededPerDay,
  };
}

function daysToDictList(rows: any[]) {
  return rows.map((r) => ({
    workday_id: r.workday_id, day_key: r.day_key, status: r.status,
    started_at: r.started_at, ended_at: r.ended_at,
    bruto: r.bruto || 0, liquido: r.liquido || 0, gastos_total: r.gastos_total || 0,
    km: r.km || 0, hours: r.hours || 0, rides_total: r.rides_total || 0,
  }));
}

async function readBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: any) => { data += chunk; });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
  });
}

export function apiPlugin() {
  return {
    name: "driverbank-api",
    configureServer(server: any) {
      server.middlewares.use("/api", async (req: any, res: any, next: any) => {
        const url = new URL(req.url, "http://localhost");
        const path = url.pathname;
        const method = req.method;
        const body = method !== "GET" && method !== "DELETE" ? await readBody(req) : {};

        function requireAuth(): any | null {
          const a = req.headers.authorization;
          if (!a || !a.toLowerCase().startsWith("bearer ")) { res.statusCode = 401; res.end(JSON.stringify({ detail: "Not authenticated" })); return null; }
          const user = getUserByToken(a.split(" ")[1]?.trim());
          if (!user) { res.statusCode = 401; res.end(JSON.stringify({ detail: "Not authenticated" })); return null; }
          return user;
        }

        function respond(status: number, data: any) {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        }

        try {
          const d = loadDB();

          if (path === "/api/auth/register" && method === "POST") {
            const email = (body.email || "").toLowerCase();
            const existing = Object.values(d.users).find((u: any) => u.email === email);
            if (existing) return respond(400, { detail: "E-mail já cadastrado" });
            const userId = genId("user");
            const hash = bcrypt.hashSync(body.password, 10);
            d.users[userId] = { user_id: userId, name: (body.name || "").trim() || "Parceiro", email, password_hash: hash, picture: null, vehicle: null, auth_provider: "email", created_at: nowISO() };
            saveDB();
            const token = createSession(userId);
            return respond(200, { session_token: token, user: publicUser(d.users[userId]) });
          }

          if (path === "/api/auth/login" && method === "POST") {
            const email = (body.email || "").toLowerCase();
            const user = Object.values(d.users).find((u: any) => u.email === email) as any;
            if (!user || !user.password_hash || !bcrypt.compareSync(body.password, user.password_hash))
              return respond(401, { detail: "Credenciais inválidas" });
            const token = createSession(user.user_id);
            return respond(200, { session_token: token, user: publicUser(user) });
          }

          if (path === "/api/auth/me" && method === "GET") {
            const user = requireAuth(); if (!user) return;
            return respond(200, { user: publicUser(user) });
          }

          if (path === "/api/auth/logout" && method === "POST") {
            const a = req.headers.authorization;
            if (a?.toLowerCase().startsWith("bearer ")) {
              delete d.sessions[a.split(" ")[1]?.trim()];
              saveDB();
            }
            return respond(200, { ok: true });
          }

          if (path === "/api/profile" && method === "PUT") {
            const user = requireAuth(); if (!user) return;
            if (body.name !== undefined) user.name = body.name;
            if (body.vehicle !== undefined) user.vehicle = body.vehicle;
            saveDB();
            return respond(200, { user: publicUser(user) });
          }

          if (path === "/api/workday/today" && method === "GET") {
            const user = requireAuth(); if (!user) return;
            const active = findActive(user.user_id);
            if (active) return respond(200, { state: "active", workday: serializeWorkday(active) });
            const closed = findClosedToday(user.user_id);
            if (closed) return respond(200, { state: "closed", workday: serializeWorkday(closed) });
            return respond(200, { state: "none", workday: null });
          }

          if (path === "/api/workday/start" && method === "POST") {
            const user = requireAuth(); if (!user) return;
            const active = findActive(user.user_id);
            if (active) return respond(200, { state: "active", workday: serializeWorkday(active) });
            if (findClosedToday(user.user_id)) return respond(400, { detail: "Você já encerrou o dia de hoje" });
            const wid = genId("wd");
            const wd = { workday_id: wid, user_id: user.user_id, day_key: todayKey(), status: "active", started_at: nowISO(), ended_at: null, created_at: nowISO(), deleted_at: null, hours: 0, km: 0, bruto: 0, liquido: 0, gastos_total: 0, rides_total: 0, apps: [], expenses: {} };
            d.workdays.push(wd);
            saveDB();
            return respond(200, { state: "active", workday: serializeWorkday(wd) });
          }

          if (path === "/api/workday/cancel" && method === "POST") {
            const user = requireAuth(); if (!user) return;
            const active = findActive(user.user_id);
            if (active) { active.deleted_at = nowISO(); saveDB(); }
            return respond(200, { state: "none", workday: null });
          }

          if (path === "/api/workday/close" && method === "POST") {
            const user = requireAuth(); if (!user) return;
            const active = findActive(user.user_id);
            if (!active) return respond(400, { detail: "Nenhum dia de trabalho ativo" });
            const ended = new Date();
            const started = new Date(active.started_at || nowISO());
            const hours = Math.max((ended.getTime() - started.getTime()) / 3600000, 0);
            const apps = (body.apps || []).filter((a: any) => a.amount > 0 || a.rides > 0).map((a: any) => ({ platform: a.platform, amount: Math.round(a.amount * 100) / 100, rides: Math.round(a.rides) }));
            const bruto = Math.round(apps.reduce((s: number, a: any) => s + a.amount, 0) * 100) / 100;
            const ridesTotal = apps.reduce((s: number, a: any) => s + a.rides, 0);
            const exp = body.expenses || {};
            const gastosTotal = Math.round(((exp.abastecimento || 0) + (exp.alimentacao || 0) + (exp.manutencao || 0) + (exp.outros || 0)) * 100) / 100;
            const liquido = Math.round((bruto - gastosTotal) * 100) / 100;
            active.status = "closed";
            active.ended_at = ended.toISOString();
            active.hours = Math.round(hours * 100) / 100;
            active.km = Math.round((body.km || 0) * 10) / 10;
            active.bruto = bruto;
            active.liquido = liquido;
            active.gastos_total = gastosTotal;
            active.rides_total = ridesTotal;
            active.apps = apps;
            active.expenses = exp;
            saveDB();
            return respond(200, { state: "closed", workday: serializeWorkday(active) });
          }

          if (path === "/api/balance/summary" && method === "GET") {
            const user = requireAuth(); if (!user) return;
            const days = closedDays(user.user_id);
            const totalBruto = Math.round(days.reduce((s, r) => s + (r.bruto || 0), 0) * 100) / 100;
            const totalLiquido = Math.round(days.reduce((s, r) => s + (r.liquido || 0), 0) * 100) / 100;
            const totalGastos = Math.round(days.reduce((s, r) => s + (r.gastos_total || 0), 0) * 100) / 100;
            const totalRides = days.reduce((s, r) => s + (r.rides_total || 0), 0);
            const totalKm = Math.round(days.reduce((s, r) => s + (r.km || 0), 0) * 10) / 10;
            const totalHours = Math.round(days.reduce((s, r) => s + (r.hours || 0), 0) * 10) / 10;
            const byDay: Record<string, any> = {};
            days.forEach((r) => byDay[r.day_key] = r);
            const chart = [];
            for (let i = 6; i >= 0; i--) {
              const dt = new Date(Date.now() - i * 86400000);
              const dk = dt.toISOString().slice(0, 10);
              const rec = byDay[dk];
              chart.push({ day_key: dk, label: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), bruto: rec ? Math.round((rec.bruto || 0) * 100) / 100 : 0, liquido: rec ? Math.round((rec.liquido || 0) * 100) / 100 : 0 });
            }
            const weekKeys = new Set<string>();
            for (let i = 0; i < 7; i++) weekKeys.add(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
            const weekBruto = Math.round(days.filter((r) => weekKeys.has(r.day_key)).reduce((s, r) => s + (r.bruto || 0), 0) * 100) / 100;
            const weekLiquido = Math.round(days.filter((r) => weekKeys.has(r.day_key)).reduce((s, r) => s + (r.liquido || 0), 0) * 100) / 100;
            const records = days.slice(0, 60).map(serializeWorkday);
            return respond(200, {
              total_bruto: totalBruto, total_liquido: totalLiquido, total_gastos: totalGastos,
              total_rides: totalRides, total_km: totalKm, total_hours: totalHours,
              week_bruto: weekBruto, week_liquido: weekLiquido,
              today_bruto: byDay[todayKey()]?.bruto || 0,
              days: chart, records,
            });
          }

          if (path === "/api/goals" && method === "GET") {
            const user = requireAuth(); if (!user) return;
            const goal = d.goals[user.user_id] || null;
            return respond(200, computeGoal(goal, daysToDictList(closedDays(user.user_id))));
          }

          if (path === "/api/goals" && method === "POST") {
            const user = requireAuth(); if (!user) return;
            if (body.monthly_target <= 0) return respond(400, { detail: "Meta deve ser maior que zero" });
            if (body.days_per_week < 1 || body.days_per_week > 7) return respond(400, { detail: "Dias por semana inválido" });
            d.goals[user.user_id] = { monthly_target: Math.round(body.monthly_target * 100) / 100, days_per_week: Math.round(body.days_per_week) };
            saveDB();
            return respond(200, computeGoal(d.goals[user.user_id], daysToDictList(closedDays(user.user_id))));
          }

          if (path === "/api/goals" && method === "DELETE") {
            const user = requireAuth(); if (!user) return;
            delete d.goals[user.user_id];
            saveDB();
            return respond(200, { ok: true });
          }

          if (path === "/api" || path === "/api/") {
            return respond(200, { message: "DriverBank API" });
          }

          next();
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ detail: e.message || "Internal error" }));
        }
      });
    },
  };
}

import type { User, GoalData, BalanceSummary, TodayResp, Workday } from "./types";

const TOKEN_KEY = "driverbank_session_token";

let inMemoryToken: string | null = null;

export function setToken(token: string | null) {
  inMemoryToken = token;
}

export async function loadToken(): Promise<string | null> {
  if (inMemoryToken) return inMemoryToken;
  const t = localStorage.getItem(TOKEN_KEY);
  inMemoryToken = t && t.length > 0 ? t : null;
  return inMemoryToken;
}

export async function saveToken(token: string) {
  inMemoryToken = token;
  localStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  inMemoryToken = null;
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Options = {
  method?: string;
  body?: any;
  auth?: boolean;
};

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = await loadToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const detail = (data && data.detail) || "Algo deu errado";
    throw new ApiError(typeof detail === "string" ? detail : "Erro", res.status);
  }
  return data as T;
}

export type { User, GoalData, BalanceSummary, TodayResp, Workday };

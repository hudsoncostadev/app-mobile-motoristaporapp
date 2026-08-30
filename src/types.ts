export type User = {
  user_id: string;
  name: string;
  email: string;
  picture?: string | null;
  vehicle?: string | null;
};

export type Workday = {
  workday_id: string;
  day_key: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  bruto: number;
  liquido: number;
  gastos_total: number;
  km: number;
  hours: number;
  rides_total: number;
  apps: { platform: string; amount: number; rides: number }[];
  expenses: Record<string, number>;
};

export type TodayResp = {
  state: "none" | "active" | "closed";
  workday: Workday | null;
};

export type GoalData = {
  configured: boolean;
  monthly_target?: number;
  daily_target?: number;
  weekly_target?: number;
  month_bruto: number;
  month_liquido: number;
  week_bruto?: number;
  today_bruto?: number;
  progress?: number;
  remaining?: number;
  needed_per_day?: number;
  worked_days_count?: number;
  working_days?: number;
  today_progress?: number;
  week_progress?: number;
  days_per_week?: number;
};

export type BalanceDay = { day_key: string; label: string; bruto: number; liquido: number };
export type BalanceRecord = {
  workday_id: string;
  day_key: string;
  ended_at: string | null;
  bruto: number;
  liquido: number;
  gastos_total: number;
  km: number;
  hours: number;
  rides_total: number;
};
export type BalanceSummary = {
  total_bruto: number;
  total_liquido: number;
  total_gastos: number;
  total_rides: number;
  total_km: number;
  total_hours: number;
  week_bruto: number;
  week_liquido: number;
  today_bruto: number;
  days: BalanceDay[];
  records: BalanceRecord[];
};

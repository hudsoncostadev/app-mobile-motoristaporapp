import os
import sqlite3
import uuid
import bcrypt
import calendar
import asyncio
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import logging

ROOT_DIR = Path(__file__).parent
DB_PATH = str(ROOT_DIR / "driverbank.db")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ----------------------------- DB setup ---------------------------------------
def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            picture TEXT,
            vehicle TEXT,
            auth_provider TEXT DEFAULT 'email',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_sessions (
            session_token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS workdays (
            workday_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            day_key TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at TEXT,
            ended_at TEXT,
            created_at TEXT NOT NULL,
            deleted_at TEXT,
            hours REAL DEFAULT 0,
            km REAL DEFAULT 0,
            bruto REAL DEFAULT 0,
            liquido REAL DEFAULT 0,
            gastos_total REAL DEFAULT 0,
            rides_total INTEGER DEFAULT 0,
            apps TEXT,
            expenses TEXT
        );
        CREATE TABLE IF NOT EXISTS goal_settings (
            user_id TEXT PRIMARY KEY,
            monthly_target REAL NOT NULL,
            days_per_week INTEGER NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_workdays_user_status ON workdays(user_id, status);
        CREATE INDEX IF NOT EXISTS idx_workdays_user_day ON workdays(user_id, day_key);
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
        """
    )
    conn.commit()
    conn.close()


init_db()


# ----------------------------- Helpers ---------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def today_key(dt: Optional[datetime] = None) -> str:
    d = (dt or now_utc()).astimezone(timezone.utc)
    return d.strftime("%Y-%m-%d")


def month_prefix(dt: Optional[datetime] = None) -> str:
    d = (dt or now_utc()).astimezone(timezone.utc)
    return d.strftime("%Y-%m")


def gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def make_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def parse_dt(val) -> Optional[datetime]:
    if not val:
        return None
    try:
        return datetime.fromisoformat(val)
    except Exception:
        return None


async def create_session(user_id: str) -> str:
    token = f"st_{uuid.uuid4().hex}{uuid.uuid4().hex}"
    conn = get_db()
    conn.execute(
        "INSERT INTO user_sessions (session_token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token, user_id, now_iso(), (now_utc() + timedelta(days=7)).isoformat()),
    )
    conn.commit()
    conn.close()
    return token


def row_to_user(row: sqlite3.Row) -> dict:
    return {
        "user_id": row["user_id"],
        "name": row["name"],
        "email": row["email"],
        "password_hash": row["password_hash"],
        "picture": row["picture"],
        "vehicle": row["vehicle"],
        "auth_provider": row["auth_provider"],
        "created_at": row["created_at"],
    }


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM user_sessions WHERE session_token = ?", (token,)
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid session")
    expires = parse_dt(row["expires_at"])
    if not expires or expires < now_utc():
        conn.close()
        raise HTTPException(status_code=401, detail="Session expired")
    urow = conn.execute(
        "SELECT * FROM users WHERE user_id = ?", (row["user_id"],)
    ).fetchone()
    conn.close()
    if not urow:
        raise HTTPException(status_code=401, detail="User not found")
    return row_to_user(urow)


def public_user(user: dict) -> dict:
    return {
        "user_id": user["user_id"],
        "name": user.get("name", "Parceiro"),
        "email": user.get("email"),
        "picture": user.get("picture"),
        "vehicle": user.get("vehicle"),
    }


# ----------------------------- Models -----------------------------------------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str



class AppEarning(BaseModel):
    platform: str
    amount: float = 0
    rides: int = 0


class Expenses(BaseModel):
    abastecimento: float = 0
    alimentacao: float = 0
    manutencao: float = 0
    outros: float = 0


class CloseInput(BaseModel):
    apps: List[AppEarning] = []
    km: float = 0
    expenses: Expenses = Expenses()


class GoalInput(BaseModel):
    monthly_target: float
    days_per_week: int


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    vehicle: Optional[str] = None


# ----------------------------- Auth routes ------------------------------------
@api_router.post("/auth/register")
async def register(data: RegisterInput):
    conn = get_db()
    existing = conn.execute("SELECT 1 FROM users WHERE email = ?", (data.email.lower(),)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    user_id = gen_id("user")
    conn.execute(
        "INSERT INTO users (user_id, name, email, password_hash, picture, vehicle, auth_provider, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (user_id, data.name.strip() or "Parceiro", data.email.lower(),
         hash_password(data.password), None, None, "email", now_iso()),
    )
    conn.commit()
    conn.close()
    token = await create_session(user_id)
    return {"session_token": token, "user": public_user({"user_id": user_id, "name": data.name.strip() or "Parceiro", "email": data.email.lower(), "picture": None, "vehicle": None})}


@api_router.post("/auth/login")
async def login(data: LoginInput):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (data.email.lower(),)).fetchone()
    conn.close()
    if not row or not row["password_hash"]:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not verify_password(data.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = await create_session(row["user_id"])
    return {"session_token": token, "user": public_user(row_to_user(row))}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        conn = get_db()
        conn.execute("DELETE FROM user_sessions WHERE session_token = ?", (token,))
        conn.commit()
        conn.close()
    return {"ok": True}


@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user: dict = Depends(get_current_user)):
    conn = get_db()
    if data.name is not None:
        conn.execute("UPDATE users SET name = ? WHERE user_id = ?", (data.name, user["user_id"]))
    if data.vehicle is not None:
        conn.execute("UPDATE users SET vehicle = ? WHERE user_id = ?", (data.vehicle, user["user_id"]))
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user["user_id"],)).fetchone()
    conn.close()
    return {"user": public_user(row_to_user(row))}


# ----------------------------- Workday ----------------------------------------
import json

def serialize_workday(row: sqlite3.Row) -> dict:
    return {
        "workday_id": row["workday_id"],
        "day_key": row["day_key"],
        "status": row["status"],
        "started_at": row["started_at"],
        "ended_at": row["ended_at"],
        "bruto": round(row["bruto"] or 0, 2),
        "liquido": round(row["liquido"] or 0, 2),
        "gastos_total": round(row["gastos_total"] or 0, 2),
        "km": row["km"] or 0,
        "hours": round(row["hours"] or 0, 2),
        "rides_total": row["rides_total"] or 0,
        "apps": json.loads(row["apps"]) if row["apps"] else [],
        "expenses": json.loads(row["expenses"]) if row["expenses"] else {},
    }


def find_active_row(conn: sqlite3.Connection, user_id: str) -> Optional[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM workdays WHERE user_id = ? AND status = 'active' AND deleted_at IS NULL",
        (user_id,),
    ).fetchone()


def find_closed_today_row(conn: sqlite3.Connection, user_id: str) -> Optional[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM workdays WHERE user_id = ? AND status = 'closed' AND day_key = ? AND deleted_at IS NULL",
        (user_id, today_key()),
    ).fetchone()


@api_router.get("/workday/today")
async def workday_today(user: dict = Depends(get_current_user)):
    conn = get_db()
    active = find_active_row(conn, user["user_id"])
    if active:
        conn.close()
        return {"state": "active", "workday": serialize_workday(active)}
    closed = find_closed_today_row(conn, user["user_id"])
    if closed:
        conn.close()
        return {"state": "closed", "workday": serialize_workday(closed)}
    conn.close()
    return {"state": "none", "workday": None}


@api_router.post("/workday/start")
async def workday_start(user: dict = Depends(get_current_user)):
    conn = get_db()
    active = find_active_row(conn, user["user_id"])
    if active:
        result = {"state": "active", "workday": serialize_workday(active)}
        conn.close()
        return result
    if find_closed_today_row(conn, user["user_id"]):
        conn.close()
        raise HTTPException(status_code=400, detail="Você já encerrou o dia de hoje")
    workday_id = gen_id("wd")
    conn.execute(
        "INSERT INTO workdays (workday_id, user_id, day_key, status, started_at, created_at, deleted_at) VALUES (?, ?, ?, 'active', ?, ?, NULL)",
        (workday_id, user["user_id"], today_key(), now_iso(), now_iso()),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM workdays WHERE workday_id = ?", (workday_id,)).fetchone()
    conn.close()
    return {"state": "active", "workday": serialize_workday(row)}


@api_router.post("/workday/cancel")
async def workday_cancel(user: dict = Depends(get_current_user)):
    conn = get_db()
    active = find_active_row(conn, user["user_id"])
    if active:
        conn.execute(
            "UPDATE workdays SET deleted_at = ? WHERE workday_id = ?",
            (now_iso(), active["workday_id"]),
        )
        conn.commit()
    conn.close()
    return {"state": "none", "workday": None}


@api_router.post("/workday/close")
async def workday_close(data: CloseInput, user: dict = Depends(get_current_user)):
    conn = get_db()
    active = find_active_row(conn, user["user_id"])
    if not active:
        conn.close()
        raise HTTPException(status_code=400, detail="Nenhum dia de trabalho ativo")

    ended = now_utc()
    started = make_aware(parse_dt(active["started_at"]) or now_utc())
    hours = max((ended - started).total_seconds() / 3600.0, 0)

    apps = [
        {"platform": a.platform, "amount": round(a.amount, 2), "rides": int(a.rides)}
        for a in data.apps
        if (a.amount > 0 or a.rides > 0)
    ]
    bruto = round(sum(a["amount"] for a in apps), 2)
    rides_total = sum(a["rides"] for a in apps)
    exp = data.expenses
    gastos_total = round(exp.abastecimento + exp.alimentacao + exp.manutencao + exp.outros, 2)
    liquido = round(bruto - gastos_total, 2)

    conn.execute(
        """UPDATE workdays SET status='closed', ended_at=?, hours=?, km=?, bruto=?, liquido=?,
           gastos_total=?, rides_total=?, apps=?, expenses=? WHERE workday_id=?""",
        (ended.isoformat(), round(hours, 2), round(data.km, 1), bruto, liquido,
         gastos_total, rides_total, json.dumps(apps), json.dumps(exp.dict()), active["workday_id"]),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM workdays WHERE workday_id = ?", (active["workday_id"],)).fetchone()
    conn.close()
    return {"state": "closed", "workday": serialize_workday(row)}


# ----------------------------- Aggregations -----------------------------------
def closed_days_rows(conn: sqlite3.Connection, user_id: str) -> List[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM workdays WHERE user_id = ? AND status = 'closed' AND deleted_at IS NULL ORDER BY ended_at DESC",
        (user_id,),
    ).fetchall()


@api_router.get("/balance/summary")
async def balance_summary(user: dict = Depends(get_current_user)):
    conn = get_db()
    days = closed_days_rows(conn, user["user_id"])
    total_bruto = round(sum(d["bruto"] or 0 for d in days), 2)
    total_liquido = round(sum(d["liquido"] or 0 for d in days), 2)
    total_gastos = round(sum(d["gastos_total"] or 0 for d in days), 2)
    total_rides = sum(d["rides_total"] or 0 for d in days)
    total_km = round(sum(d["km"] or 0 for d in days), 1)
    total_hours = round(sum(d["hours"] or 0 for d in days), 1)

    by_day = {d["day_key"]: d for d in days}
    chart = []
    for i in range(6, -1, -1):
        dt = now_utc() - timedelta(days=i)
        dk = dt.strftime("%Y-%m-%d")
        rec = by_day.get(dk)
        chart.append({
            "day_key": dk,
            "label": dt.strftime("%d/%m"),
            "bruto": round(rec["bruto"] or 0, 2) if rec else 0,
            "liquido": round(rec["liquido"] or 0, 2) if rec else 0,
        })

    week_keys = {(now_utc() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)}
    week_bruto = round(sum(d["bruto"] or 0 for d in days if d["day_key"] in week_keys), 2)
    week_liquido = round(sum(d["liquido"] or 0 for d in days if d["day_key"] in week_keys), 2)

    records = [serialize_workday(d) for d in days[:60]]
    conn.close()

    return {
        "total_bruto": total_bruto,
        "total_liquido": total_liquido,
        "total_gastos": total_gastos,
        "total_rides": total_rides,
        "total_km": total_km,
        "total_hours": total_hours,
        "week_bruto": week_bruto,
        "week_liquido": week_liquido,
        "today_bruto": round(by_day.get(today_key(), {}).get("bruto", 0) if by_day.get(today_key()) else 0, 2),
        "days": chart,
        "records": records,
    }


# ----------------------------- Goals ------------------------------------------
def compute_goal(goal: Optional[dict], days: List[dict]) -> dict:
    now = now_utc()
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    mprefix = month_prefix()
    month_days = [d for d in days if d["day_key"].startswith(mprefix)]
    month_bruto = round(sum(d.get("bruto", 0) for d in month_days), 2)
    month_liquido = round(sum(d.get("liquido", 0) for d in month_days), 2)
    worked_days_count = len(month_days)

    if not goal:
        return {
            "configured": False,
            "month_bruto": month_bruto,
            "month_liquido": month_liquido,
            "worked_days_count": worked_days_count,
            "days_in_month": days_in_month,
        }

    monthly_target = round(goal["monthly_target"], 2)
    days_per_week = int(goal["days_per_week"])
    weeks_in_month = days_in_month / 7.0
    working_days = max(round(days_per_week * weeks_in_month), 1)
    daily_target = round(monthly_target / working_days, 2)
    weekly_target = round(daily_target * days_per_week, 2)

    week_keys = {(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)}
    week_bruto = round(sum(d.get("bruto", 0) for d in days if d["day_key"] in week_keys), 2)
    today_bruto = round(next((d.get("bruto", 0) for d in days if d["day_key"] == today_key()), 0), 2)

    remaining = max(round(monthly_target - month_bruto, 2), 0)
    days_left = max(working_days - worked_days_count, 0)
    needed_per_day = round(remaining / days_left, 2) if days_left > 0 else 0

    return {
        "configured": True,
        "monthly_target": monthly_target,
        "days_per_week": days_per_week,
        "working_days": working_days,
        "daily_target": daily_target,
        "weekly_target": weekly_target,
        "month_bruto": month_bruto,
        "month_liquido": month_liquido,
        "week_bruto": week_bruto,
        "today_bruto": today_bruto,
        "worked_days_count": worked_days_count,
        "days_in_month": days_in_month,
        "progress": min(month_bruto / monthly_target, 1.0) if monthly_target > 0 else 0,
        "week_progress": min(week_bruto / weekly_target, 1.0) if weekly_target > 0 else 0,
        "today_progress": min(today_bruto / daily_target, 1.0) if daily_target > 0 else 0,
        "remaining": remaining,
        "needed_per_day": needed_per_day,
    }


def row_to_dict_list(rows: List[sqlite3.Row]) -> List[dict]:
    result = []
    for r in rows:
        result.append({
            "workday_id": r["workday_id"],
            "day_key": r["day_key"],
            "status": r["status"],
            "started_at": r["started_at"],
            "ended_at": r["ended_at"],
            "bruto": r["bruto"] or 0,
            "liquido": r["liquido"] or 0,
            "gastos_total": r["gastos_total"] or 0,
            "km": r["km"] or 0,
            "hours": r["hours"] or 0,
            "rides_total": r["rides_total"] or 0,
        })
    return result


@api_router.get("/goals")
async def get_goal(user: dict = Depends(get_current_user)):
    conn = get_db()
    grow = conn.execute("SELECT * FROM goal_settings WHERE user_id = ?", (user["user_id"],)).fetchone()
    goal = {"monthly_target": grow["monthly_target"], "days_per_week": grow["days_per_week"]} if grow else None
    days = row_to_dict_list(closed_days_rows(conn, user["user_id"]))
    conn.close()
    return compute_goal(goal, days)


@api_router.post("/goals")
async def set_goal(data: GoalInput, user: dict = Depends(get_current_user)):
    if data.monthly_target <= 0:
        raise HTTPException(status_code=400, detail="Meta deve ser maior que zero")
    if data.days_per_week < 1 or data.days_per_week > 7:
        raise HTTPException(status_code=400, detail="Dias por semana inválido")
    conn = get_db()
    conn.execute(
        "INSERT INTO goal_settings (user_id, monthly_target, days_per_week, updated_at) VALUES (?, ?, ?, ?) "
        "ON CONFLICT(user_id) DO UPDATE SET monthly_target=excluded.monthly_target, days_per_week=excluded.days_per_week, updated_at=excluded.updated_at",
        (user["user_id"], round(data.monthly_target, 2), int(data.days_per_week), now_iso()),
    )
    conn.commit()
    grow = conn.execute("SELECT * FROM goal_settings WHERE user_id = ?", (user["user_id"],)).fetchone()
    goal = {"monthly_target": grow["monthly_target"], "days_per_week": grow["days_per_week"]}
    days = row_to_dict_list(closed_days_rows(conn, user["user_id"]))
    conn.close()
    return compute_goal(goal, days)


@api_router.delete("/goals")
async def delete_goal(user: dict = Depends(get_current_user)):
    conn = get_db()
    conn.execute("DELETE FROM goal_settings WHERE user_id = ?", (user["user_id"],))
    conn.commit()
    conn.close()
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"message": "DriverBank API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import httpx
import calendar
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ----------------------------- Helpers ---------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


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


async def create_session(user_id: str) -> str:
    token = f"st_{uuid.uuid4().hex}{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "created_at": now_utc(),
        "expires_at": now_utc() + timedelta(days=7),
    })
    return token


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    if make_aware(session["expires_at"]) < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


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


class SessionInput(BaseModel):
    session_id: str


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
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    user = {
        "user_id": gen_id("user"),
        "name": data.name.strip() or "Parceiro",
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "picture": None,
        "vehicle": None,
        "auth_provider": "email",
        "created_at": now_utc(),
    }
    await db.users.insert_one(user)
    token = await create_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api_router.post("/auth/login")
async def login(data: LoginInput):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = await create_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api_router.post("/auth/session")
async def auth_session(data: SessionInput):
    async with httpx.AsyncClient(timeout=15) as http:
        resp = await http.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": data.session_id})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    info = resp.json()
    email = (info.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    existing = await db.users.find_one({"email": email})
    if existing:
        user = existing
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"name": info.get("name") or user.get("name"),
                      "picture": info.get("picture") or user.get("picture")}},
        )
        user = await db.users.find_one({"user_id": user["user_id"]})
    else:
        user = {
            "user_id": gen_id("user"),
            "name": info.get("name") or "Parceiro",
            "email": email,
            "password_hash": None,
            "picture": info.get("picture"),
            "vehicle": None,
            "auth_provider": "google",
            "created_at": now_utc(),
        }
        await db.users.insert_one(user)
    token = await create_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"user": public_user(fresh)}


# ----------------------------- Workday ----------------------------------------
def serialize_workday(wd: dict) -> dict:
    return {
        "workday_id": wd["workday_id"],
        "day_key": wd["day_key"],
        "status": wd["status"],
        "started_at": make_aware(wd["started_at"]).isoformat() if wd.get("started_at") else None,
        "ended_at": make_aware(wd["ended_at"]).isoformat() if wd.get("ended_at") else None,
        "bruto": round(wd.get("bruto", 0), 2),
        "liquido": round(wd.get("liquido", 0), 2),
        "gastos_total": round(wd.get("gastos_total", 0), 2),
        "km": wd.get("km", 0),
        "hours": round(wd.get("hours", 0), 2),
        "rides_total": wd.get("rides_total", 0),
        "apps": wd.get("apps", []),
        "expenses": wd.get("expenses", {}),
    }


async def find_active(user_id: str) -> Optional[dict]:
    return await db.workdays.find_one(
        {"user_id": user_id, "status": "active", "deleted_at": None}, {"_id": 0}
    )


async def find_closed_today(user_id: str) -> Optional[dict]:
    return await db.workdays.find_one(
        {"user_id": user_id, "status": "closed", "day_key": today_key(), "deleted_at": None},
        {"_id": 0},
    )


@api_router.get("/workday/today")
async def workday_today(user: dict = Depends(get_current_user)):
    active = await find_active(user["user_id"])
    if active:
        return {"state": "active", "workday": serialize_workday(active)}
    closed = await find_closed_today(user["user_id"])
    if closed:
        return {"state": "closed", "workday": serialize_workday(closed)}
    return {"state": "none", "workday": None}


@api_router.post("/workday/start")
async def workday_start(user: dict = Depends(get_current_user)):
    active = await find_active(user["user_id"])
    if active:
        return {"state": "active", "workday": serialize_workday(active)}
    if await find_closed_today(user["user_id"]):
        raise HTTPException(status_code=400, detail="Você já encerrou o dia de hoje")
    wd = {
        "workday_id": gen_id("wd"),
        "user_id": user["user_id"],
        "day_key": today_key(),
        "status": "active",
        "started_at": now_utc(),
        "ended_at": None,
        "created_at": now_utc(),
        "deleted_at": None,
    }
    await db.workdays.insert_one(wd)
    return {"state": "active", "workday": serialize_workday(wd)}


@api_router.post("/workday/cancel")
async def workday_cancel(user: dict = Depends(get_current_user)):
    active = await find_active(user["user_id"])
    if active:
        await db.workdays.update_one(
            {"workday_id": active["workday_id"]}, {"$set": {"deleted_at": now_utc()}}
        )
    return {"state": "none", "workday": None}


@api_router.post("/workday/close")
async def workday_close(data: CloseInput, user: dict = Depends(get_current_user)):
    active = await find_active(user["user_id"])
    if not active:
        raise HTTPException(status_code=400, detail="Nenhum dia de trabalho ativo")

    ended = now_utc()
    started = make_aware(active["started_at"])
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

    await db.workdays.update_one(
        {"workday_id": active["workday_id"]},
        {"$set": {
            "status": "closed",
            "ended_at": ended,
            "hours": round(hours, 2),
            "km": round(data.km, 1),
            "apps": apps,
            "expenses": exp.dict(),
            "bruto": bruto,
            "liquido": liquido,
            "gastos_total": gastos_total,
            "rides_total": rides_total,
        }},
    )
    wd = await db.workdays.find_one({"workday_id": active["workday_id"]}, {"_id": 0})
    return {"state": "closed", "workday": serialize_workday(wd)}


# ----------------------------- Aggregations -----------------------------------
async def closed_days(user_id: str) -> List[dict]:
    return await db.workdays.find(
        {"user_id": user_id, "status": "closed", "deleted_at": None}, {"_id": 0}
    ).sort("ended_at", -1).to_list(5000)


@api_router.get("/balance/summary")
async def balance_summary(user: dict = Depends(get_current_user)):
    days = await closed_days(user["user_id"])
    total_bruto = round(sum(d.get("bruto", 0) for d in days), 2)
    total_liquido = round(sum(d.get("liquido", 0) for d in days), 2)
    total_gastos = round(sum(d.get("gastos_total", 0) for d in days), 2)
    total_rides = sum(d.get("rides_total", 0) for d in days)
    total_km = round(sum(d.get("km", 0) for d in days), 1)
    total_hours = round(sum(d.get("hours", 0) for d in days), 1)

    by_day = {d["day_key"]: d for d in days}
    chart = []
    for i in range(6, -1, -1):
        dt = now_utc() - timedelta(days=i)
        dk = dt.strftime("%Y-%m-%d")
        rec = by_day.get(dk)
        chart.append({
            "day_key": dk,
            "label": dt.strftime("%d/%m"),
            "bruto": round(rec.get("bruto", 0), 2) if rec else 0,
            "liquido": round(rec.get("liquido", 0), 2) if rec else 0,
        })

    week_keys = {(now_utc() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)}
    week_bruto = round(sum(d.get("bruto", 0) for d in days if d["day_key"] in week_keys), 2)
    week_liquido = round(sum(d.get("liquido", 0) for d in days if d["day_key"] in week_keys), 2)

    records = [serialize_workday(d) for d in days[:60]]

    return {
        "total_bruto": total_bruto,
        "total_liquido": total_liquido,
        "total_gastos": total_gastos,
        "total_rides": total_rides,
        "total_km": total_km,
        "total_hours": total_hours,
        "week_bruto": week_bruto,
        "week_liquido": week_liquido,
        "today_bruto": round(by_day.get(today_key(), {}).get("bruto", 0), 2),
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


@api_router.get("/goals")
async def get_goal(user: dict = Depends(get_current_user)):
    goal = await db.goal_settings.find_one({"user_id": user["user_id"]}, {"_id": 0})
    days = await closed_days(user["user_id"])
    return compute_goal(goal, days)


@api_router.post("/goals")
async def set_goal(data: GoalInput, user: dict = Depends(get_current_user)):
    if data.monthly_target <= 0:
        raise HTTPException(status_code=400, detail="Meta deve ser maior que zero")
    if data.days_per_week < 1 or data.days_per_week > 7:
        raise HTTPException(status_code=400, detail="Dias por semana inválido")
    await db.goal_settings.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "user_id": user["user_id"],
            "monthly_target": round(data.monthly_target, 2),
            "days_per_week": int(data.days_per_week),
            "updated_at": now_utc(),
        }},
        upsert=True,
    )
    goal = await db.goal_settings.find_one({"user_id": user["user_id"]}, {"_id": 0})
    days = await closed_days(user["user_id"])
    return compute_goal(goal, days)


@api_router.delete("/goals")
async def delete_goal(user: dict = Depends(get_current_user)):
    await db.goal_settings.delete_one({"user_id": user["user_id"]})
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


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.workdays.create_index([("user_id", 1), ("status", 1)])
    await db.workdays.create_index([("user_id", 1), ("day_key", 1)])
    await db.goal_settings.create_index("user_id", unique=True)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

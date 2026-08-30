"""DriverBank backend API tests - REFORMULATED FLOW.

Covers: auth, workday(start/close/cancel/today), balance summary, goals config, profile.
Rides endpoints REMOVED (old model). New model: workday close accepts apps[]+km+expenses.
"""
import os
import uuid
import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://driver-earnings-92.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _register(s):
    email = f"test_{uuid.uuid4().hex[:10]}@driver.com"
    r = s.post(f"{API}/auth/register", json={"name": "TEST Motorista", "email": email, "password": "senha123"})
    assert r.status_code == 200, r.text
    return r.json(), email


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def user_a(s):
    """Fresh user for workday active/close lifecycle tests."""
    data, email = _register(s)
    return {"email": email, "token": data["session_token"], "user": data["user"]}


@pytest.fixture(scope="module")
def hdr_a(user_a):
    return _hdr(user_a["token"])


# ---------- Auth ----------
class TestAuth:
    def test_register_returns_token_and_user(self, s):
        data, email = _register(s)
        assert data["session_token"].startswith("st_")
        assert data["user"]["email"] == email
        assert "user_id" in data["user"]

    def test_register_duplicate_email(self, s, user_a):
        r = s.post(f"{API}/auth/register", json={"name": "x", "email": user_a["email"], "password": "senha123"})
        assert r.status_code == 400

    def test_login_success(self, s, user_a):
        r = s.post(f"{API}/auth/login", json={"email": user_a["email"], "password": "senha123"})
        assert r.status_code == 200
        assert r.json()["user"]["email"] == user_a["email"]

    def test_login_bad_password(self, s, user_a):
        r = s.post(f"{API}/auth/login", json={"email": user_a["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_auth(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, s, hdr_a, user_a):
        r = s.get(f"{API}/auth/me", headers=hdr_a)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == user_a["email"]

    def test_teste_driver_login(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "teste@driver.com", "password": "senha123"})
        assert r.status_code == 200, r.text


# ---------- Workday lifecycle ----------
class TestWorkday:
    def test_today_initial_none(self, s, hdr_a):
        r = s.get(f"{API}/workday/today", headers=hdr_a)
        assert r.status_code == 200
        d = r.json()
        assert d["state"] == "none"
        assert d["workday"] is None

    def test_start_workday(self, s, hdr_a):
        r = s.post(f"{API}/workday/start", headers=hdr_a)
        assert r.status_code == 200
        d = r.json()
        assert d["state"] == "active"
        assert d["workday"]["started_at"] is not None
        assert d["workday"]["status"] == "active"

    def test_start_idempotent_returns_active(self, s, hdr_a):
        r = s.post(f"{API}/workday/start", headers=hdr_a)
        assert r.status_code == 200
        assert r.json()["state"] == "active"

    def test_today_reflects_active(self, s, hdr_a):
        r = s.get(f"{API}/workday/today", headers=hdr_a)
        assert r.status_code == 200
        assert r.json()["state"] == "active"

    def test_cancel_workday(self, s, hdr_a):
        r = s.post(f"{API}/workday/cancel", headers=hdr_a)
        assert r.status_code == 200
        assert r.json()["state"] == "none"
        # verify via today
        t = s.get(f"{API}/workday/today", headers=hdr_a).json()
        assert t["state"] == "none"

    def test_close_without_active_400(self, s, hdr_a):
        r = s.post(f"{API}/workday/close", headers=hdr_a, json={"apps": [], "km": 0, "expenses": {}})
        assert r.status_code == 400

    def test_start_close_full_flow(self, s, hdr_a):
        # start
        r1 = s.post(f"{API}/workday/start", headers=hdr_a)
        assert r1.status_code == 200
        # close with apps + expenses
        payload = {
            "apps": [
                {"platform": "Uber", "amount": 150.50, "rides": 12},
                {"platform": "99", "amount": 80.00, "rides": 6},
            ],
            "km": 210.5,
            "expenses": {"abastecimento": 60, "alimentacao": 25, "manutencao": 0, "outros": 5},
        }
        r2 = s.post(f"{API}/workday/close", headers=hdr_a, json=payload)
        assert r2.status_code == 200, r2.text
        d = r2.json()
        assert d["state"] == "closed"
        wd = d["workday"]
        assert wd["bruto"] == 230.5
        assert wd["gastos_total"] == 90.0
        assert wd["liquido"] == 140.5
        assert wd["rides_total"] == 18
        assert wd["km"] == 210.5
        assert wd["hours"] >= 0
        assert len(wd["apps"]) == 2

    def test_today_after_close_is_closed(self, s, hdr_a):
        r = s.get(f"{API}/workday/today", headers=hdr_a)
        d = r.json()
        assert d["state"] == "closed"
        assert d["workday"]["bruto"] == 230.5

    def test_start_after_closed_today_400(self, s, hdr_a):
        r = s.post(f"{API}/workday/start", headers=hdr_a)
        assert r.status_code == 400


# ---------- Balance ----------
class TestBalance:
    def test_summary_after_close(self, s, hdr_a):
        r = s.get(f"{API}/balance/summary", headers=hdr_a)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_bruto", "total_liquido", "total_gastos", "days", "records", "week_bruto", "today_bruto"):
            assert k in d
        assert len(d["days"]) == 7
        assert d["total_bruto"] >= 230.5
        assert d["total_liquido"] >= 140.5
        assert d["total_gastos"] >= 90.0
        assert d["today_bruto"] == 230.5
        # records serialized
        assert len(d["records"]) >= 1
        assert d["records"][0]["bruto"] == 230.5


# ---------- Goals ----------
class TestGoals:
    @pytest.fixture(scope="class")
    def gauth(self, s):
        data, _ = _register(s)
        return _hdr(data["session_token"])

    def test_goal_initial_not_configured(self, s, gauth):
        r = s.get(f"{API}/goals", headers=gauth)
        assert r.status_code == 200
        d = r.json()
        assert d["configured"] is False
        assert "month_bruto" in d
        assert "days_in_month" in d

    def test_set_goal_success(self, s, gauth):
        r = s.post(f"{API}/goals", headers=gauth, json={"monthly_target": 6000, "days_per_week": 5})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["configured"] is True
        assert d["monthly_target"] == 6000
        assert d["days_per_week"] == 5
        assert d["daily_target"] > 0
        assert d["weekly_target"] > 0
        assert 0 <= d["progress"] <= 1

    def test_get_goal_after_set(self, s, gauth):
        r = s.get(f"{API}/goals", headers=gauth)
        assert r.status_code == 200
        d = r.json()
        assert d["configured"] is True
        assert d["monthly_target"] == 6000

    def test_invalid_monthly_target(self, s, gauth):
        r = s.post(f"{API}/goals", headers=gauth, json={"monthly_target": 0, "days_per_week": 5})
        assert r.status_code == 400

    def test_invalid_days_per_week_zero(self, s, gauth):
        r = s.post(f"{API}/goals", headers=gauth, json={"monthly_target": 5000, "days_per_week": 0})
        assert r.status_code == 400

    def test_invalid_days_per_week_over(self, s, gauth):
        r = s.post(f"{API}/goals", headers=gauth, json={"monthly_target": 5000, "days_per_week": 8})
        assert r.status_code == 400

    def test_delete_goal(self, s, gauth):
        r = s.delete(f"{API}/goals", headers=gauth)
        assert r.status_code == 200
        # after delete should be not configured
        r2 = s.get(f"{API}/goals", headers=gauth)
        assert r2.json()["configured"] is False


# ---------- Profile ----------
class TestProfile:
    def test_update_profile(self, s, hdr_a):
        r = s.put(f"{API}/profile", headers=hdr_a, json={"name": "TEST Novo Nome", "vehicle": "Onix 2022"})
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["name"] == "TEST Novo Nome"
        assert u["vehicle"] == "Onix 2022"

    def test_profile_persisted_via_me(self, s, hdr_a):
        r = s.get(f"{API}/auth/me", headers=hdr_a)
        u = r.json()["user"]
        assert u["name"] == "TEST Novo Nome"
        assert u["vehicle"] == "Onix 2022"


# ---------- Logout ----------
class TestLogout:
    def test_logout_invalidates_token(self, s):
        data, _ = _register(s)
        h = _hdr(data["session_token"])
        r = s.post(f"{API}/auth/logout", headers=h)
        assert r.status_code == 200
        r2 = s.get(f"{API}/auth/me", headers=h)
        assert r2.status_code == 401

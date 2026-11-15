import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.database import JWT_ALGORITHM, JWT_SECRET, get_db, require_astronaut

router = APIRouter(tags=["Auth, Profile & Resources"])

DEMO_PASSCODE = os.getenv("DEMO_PASSCODE", "APOLLO2026")

class LoginRequest(BaseModel):
    astronaut_id: int
    passcode: str            # required: no default

def create_access_token(astronaut_id: int, name: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    return jwt.encode(
        {"sub": str(astronaut_id), "name": name, "exp": expire},
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )

def _client(request: Request):
    ip = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "hackathon-client")[:500]
    return ip, ua

@router.post("/auth/login")
async def login(payload: LoginRequest, request: Request, db=Depends(get_db)):
    ip, ua = _client(request)
    identifier = f"astronaut:{payload.astronaut_id}"

    # Temporary RLS context so the astronaut row is visible
    await db.execute("SELECT set_config('app.astronaut_id', %s, true)", (str(payload.astronaut_id),))
    cur = await db.execute("SELECT id, name FROM astronauts WHERE id = %s", (payload.astronaut_id,))
    astro = await cur.fetchone()

    if not astro or not hmac.compare_digest(payload.passcode, DEMO_PASSCODE):
        await db.execute(
            "SELECT astro.log_app_event('LOGIN_FAILURE', false, NULL, %s, %s, %s, %s::jsonb)",
            (identifier, ip, ua, '{"reason":"invalid_credentials"}'),
        )
        # RETURN (not raise) so the transaction commits and the audit row is kept
        return JSONResponse(status_code=401, content={"detail": "Identifiants invalides"})

    token = create_access_token(astro["id"], astro["name"])
    await db.execute(
        "SELECT astro.log_app_event('LOGIN_SUCCESS', true, %s, %s, %s, %s, '{}'::jsonb)",
        (astro["id"], identifier, ip, ua),
    )
    return {"access_token": token, "token_type": "bearer", "astronaut": astro}

@router.post("/auth/logout")
async def logout(request: Request, astronaut_id: int = Depends(require_astronaut), db=Depends(get_db)):
    ip, ua = _client(request)
    await db.execute(
        "SELECT astro.log_app_event('LOGOUT', true, %s, %s, %s, %s, '{}'::jsonb)",
        (astronaut_id, f"astronaut:{astronaut_id}", ip, ua),
    )
    return {"message": "Déconnexion enregistrée dans le journal d'audit"}

@router.get("/me")
async def get_me(astronaut_id: int = Depends(require_astronaut), db=Depends(get_db)):
    cur = await db.execute(
        """
        SELECT a.id, a.name, a.age, a.sex, a.height_cm, a.baseline_weight_kg,
               a.xp, a.streak_days,
               m.id AS mission_id, m.name AS mission_name, m.start_date,
               m.planned_days, m.comm_delay_sec,
               e.id AS environment_id, e.name AS environment_name,
               e.gravity_g, e.notes AS environment_notes
        FROM astronauts a
        LEFT JOIN missions m ON m.id = a.mission_id
        LEFT JOIN environments e ON e.id = m.environment_id
        WHERE a.id = %s
        """,
        (astronaut_id,),
    )
    profile = await cur.fetchone()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil astronaute introuvable")
    return profile

@router.get("/resources")
async def get_resources(db=Depends(get_db)):
    cur = await db.execute(
        "SELECT id, agency, category, title, summary, disclaimer FROM resources ORDER BY id"
    )
    return await cur.fetchall()
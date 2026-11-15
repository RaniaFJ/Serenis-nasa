import os
import jwt
from dotenv import load_dotenv
from fastapi import Header, HTTPException, Request
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]   # must use the astro_login role
JWT_SECRET = os.environ["JWT_SECRET"]       # no insecure fallback
JWT_ALGORITHM = "HS256"

pool = AsyncConnectionPool(
    conninfo=DATABASE_URL,
    open=False,
    kwargs={"row_factory": dict_row},
)

def extract_astronaut_id(authorization: str | None) -> int | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Token JWT invalide ou expiré")

async def get_db(request: Request, authorization: str | None = Header(default=None)):
    astronaut_id = extract_astronaut_id(authorization)
    async with pool.connection() as conn:
        async with conn.transaction():
            await conn.execute(
                "SELECT set_config('app.astronaut_id', %s, true), "
                "set_config('app.client_ip', %s, true), "
                "set_config('app.user_agent', %s, true)",
                (
                    str(astronaut_id) if astronaut_id is not None else "",
                    request.client.host if request.client else "127.0.0.1",
                    request.headers.get("user-agent", "hackathon-client")[:500],
                ),
            )
            yield conn

def require_astronaut(authorization: str | None = Header(default=None)) -> int:
    astro_id = extract_astronaut_id(authorization)
    if astro_id is None:
        raise HTTPException(status_code=401, detail="Header Authorization: Bearer <token> requis")
    return astro_id
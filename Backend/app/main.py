
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg import errors as pg, Error as PgError

from app.database import pool

from app.routers import auth ,vitals, gamification

@asynccontextmanager
async def lifespan(app: FastAPI):
    await pool.open()
    yield
    await pool.close()

app = FastAPI(title="Astro API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(vitals.router)

app.include_router(gamification.router)


def _pg_response(status: int, code: str, message: str, exc: PgError) -> JSONResponse:
    d = exc.diag
    return JSONResponse(
        status_code=status,
        content={
            "error": code,
            "message": message,
            "detail": d.message_primary,
            "table": d.table_name,
            "constraint": d.constraint_name,
        },
    )

@app.exception_handler(pg.CheckViolation)
async def check_violation(_: Request, exc: pg.CheckViolation):
    return _pg_response(422, "check_violation", "Valeur invalide (contrainte CHECK).", exc)

@app.exception_handler(pg.NotNullViolation)
async def not_null_violation(_: Request, exc: pg.NotNullViolation):
    return _pg_response(422, "not_null_violation", "Champ obligatoire manquant.", exc)

@app.exception_handler(pg.UniqueViolation)
async def unique_violation(_: Request, exc: pg.UniqueViolation):
    return _pg_response(409, "unique_violation", "Cette entrée existe déjà.", exc)

@app.exception_handler(pg.ForeignKeyViolation)
async def fk_violation(_: Request, exc: pg.ForeignKeyViolation):
    return _pg_response(409, "foreign_key_violation", "Référence invalide.", exc)

@app.exception_handler(pg.InsufficientPrivilege)
async def insufficient_privilege(_: Request, exc: pg.InsufficientPrivilege):
    # Also raised by RLS "violates row-level security policy"
    return _pg_response(403, "insufficient_privilege", "Accès refusé par la politique de sécurité.", exc)

@app.exception_handler(pg.RaiseException)
async def raise_exception(_: Request, exc: pg.RaiseException):
    # RAISE EXCEPTION coming from triggers / SQL functions
    return _pg_response(400, "database_rule", "Règle métier refusée par la base.", exc)

@app.exception_handler(PgError)
async def generic_db_error(_: Request, exc: PgError):
    return _pg_response(500, "database_error", "Erreur base de données.", exc)

@app.get("/health")
async def health():
    return {"status": "ok"}
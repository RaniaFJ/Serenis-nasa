from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database import get_db, require_astronaut

router = APIRouter(
    prefix="/vitals",
    tags=["Monitoring Médical"]
)

# ---------------------------------------------------------
# SCHÉMAS PYDANTIC
# ---------------------------------------------------------
class MeasurementCreate(BaseModel):
    indicator_id: int
    value: float
    source: str = "manual"  # 'manual', 'wearable', ou 'camera'
    note: Optional[str] = None
    measured_at: Optional[datetime] = None

# ---------------------------------------------------------
# ROUTES API
# ---------------------------------------------------------

@router.get("/status/latest")
async def get_latest_status(
    astronaut_id: int = Depends(require_astronaut),
    db=Depends(get_db)
):
    """
    Récupère le statut médical le plus récent de l'astronaute connecté.
    """
    cur = await db.execute(
        "SELECT * FROM v_latest_status WHERE astronaut_id = %s;",
        (astronaut_id,)
    )
    return await cur.fetchall()

@router.post("/measurements")
async def add_measurement(
    measurement: MeasurementCreate,
    astronaut_id: int = Depends(require_astronaut),
    db=Depends(get_db)
):
    """
    Insère une nouvelle mesure pour l'astronaute connecté.
    Si la valeur est anormale, le trigger SQL crée une alerte automatiquement.
    """
    cur = await db.execute(
        """
        INSERT INTO measurements (astronaut_id, indicator_id, value, source, note, measured_at)
        VALUES (%s, %s, %s, %s, %s, COALESCE(%s, now()))
        RETURNING id;
        """,
        (
            astronaut_id,
            measurement.indicator_id,
            measurement.value,
            measurement.source,
            measurement.note,
            measurement.measured_at,
        ),
    )
    row = await cur.fetchone()
    new_measurement_id = row["id"]

    # Vérifier si le trigger SQL a généré une alerte pour cette mesure
    alert_cur = await db.execute(
        "SELECT * FROM alerts WHERE measurement_id = %s;",
        (new_measurement_id,)
    )
    new_alert = await alert_cur.fetchone()

    return {
        "message": "Mesure enregistrée avec succès.",
        "measurement_id": new_measurement_id,
        "alert": new_alert,
    }

@router.get("/indicators")
async def get_indicators(db=Depends(get_db)):
    """
    Récupère la liste des indicateurs médicaux et leurs seuils normaux.
    """
    cur = await db.execute("SELECT * FROM indicators ORDER BY id;")
    return await cur.fetchall()

@router.get("/measurements")
async def get_measurements(
    indicator_id: Optional[int] = None,
    limit: int = 1000,
    astronaut_id: int = Depends(require_astronaut),
    db=Depends(get_db)
):
    """
    Historique des mesures de l'astronaute connecté (utilisé par les graphiques du front).
    Renvoie les `limit` mesures les plus récentes, classées de la plus ancienne à la plus récente.
    """
    limit = max(1, min(limit, 5000))
    cur = await db.execute(
        """
        SELECT * FROM (
            SELECT id, indicator_id, code, value, unit, measured_at, status, direction
            FROM v_measurement_status
            WHERE astronaut_id = %s AND (%s::int IS NULL OR indicator_id = %s::int)
            ORDER BY measured_at DESC, id DESC
            LIMIT %s
        ) recent
        ORDER BY measured_at ASC, id ASC;
        """,
        (astronaut_id, indicator_id, indicator_id, limit),
    )
    return await cur.fetchall()

@router.get("/recommendations")
async def get_recommendations(db=Depends(get_db)):
    """
    Actions recommandées par indicateur, sens (low/high) et gravité (yellow/red).
    """
    cur = await db.execute(
        "SELECT id, indicator_id, direction, severity, action_text, contact_surgeon "
        "FROM recommendations ORDER BY indicator_id, severity, direction;"
    )
    return await cur.fetchall()

@router.get("/alerts")
async def get_alerts(
    resolved: Optional[bool] = None,
    astronaut_id: int = Depends(require_astronaut),
    db=Depends(get_db)
):
    """
    Récupère les alertes médicales de l'astronaute connecté.
    """
    if resolved is not None:
        cur = await db.execute(
            """
            SELECT * FROM alerts 
            WHERE astronaut_id = %s AND resolved = %s 
            ORDER BY created_at DESC;
            """,
            (astronaut_id, resolved),
        )
    else:
        cur = await db.execute(
            """
            SELECT * FROM alerts 
            WHERE astronaut_id = %s 
            ORDER BY created_at DESC;
            """,
            (astronaut_id,),
        )
    return await cur.fetchall()

@router.patch("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    astronaut_id: int = Depends(require_astronaut),
    db=Depends(get_db)
):
    """
    Marque une alerte spécifique comme résolue.
    """
    cur = await db.execute(
        """
        UPDATE alerts 
        SET resolved = true 
        WHERE id = %s AND astronaut_id = %s 
        RETURNING *;
        """,
        (alert_id, astronaut_id),
    )
    updated_alert = await cur.fetchone()

    if not updated_alert:
        raise HTTPException(status_code=404, detail="Alerte introuvable.")

    return {
        "message": "Alerte marquée comme résolue.",
        "alert": updated_alert,
    }
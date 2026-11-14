from app.schemas import vitals as schemas
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
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
@router.get("/charts/{indicator_code}", response_model=schemas.ChartHistoryResponse)
async def get_chart_history(
    indicator_code: str, 
    days: int = Query(default=7, ge=1, le=30),
    db = Depends(get_db)
):
    # 1. Calculate the start date (e.g., 7 days ago)
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # 2. Query the view from the PostgreSQL SQL script
    # The view automatically calculates the green/yellow/red status for us!
    query = """
        SELECT i.code AS indicator_code, i.name AS indicator_name, i.unit,
               v.value, v.measured_at, v.status, v.direction
        FROM v_measurement_status v
        JOIN indicators i ON i.id = v.indicator_id
        WHERE i.code = %s AND v.measured_at >= %s
        ORDER BY v.measured_at ASC
    """
    
    # 3. Execute the query using psycopg (Async)
    async with db.cursor() as cur:
        await cur.execute(query, (indicator_code.upper(), start_date))
        rows = await cur.fetchall()

    # 4. If no data is found, return a 404 error
    if not rows:
        raise HTTPException(
            status_code=404, 
            detail=f"No measurements found for {indicator_code} in the last {days} days."
        )

    # 5. Format the response so Recharts (frontend) can easily read it
    return {
        "indicator_code": rows[0]["indicator_code"],
        "indicator_name": rows[0]["indicator_name"],
        "unit": rows[0]["unit"],
        "history": [
            {
                "value": float(row["value"]),
                "measured_at": row["measured_at"],
                "status": row["status"],
                "direction": row["direction"]
            } for row in rows
        ]
    }
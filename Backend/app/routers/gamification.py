from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone

from app.database import get_db, require_astronaut
from app.schemas import gamification as schemas

router = APIRouter(prefix="/api/gamification", tags=["Gamification"])

@router.get("/tasks/today", response_model=List[schemas.TaskTodayResponse])
async def get_todays_tasks(db = Depends(get_db)):
    # PostgreSQL uses $1, $2 for parameters instead of ? (SQLite)
    query = """
        SELECT t.id, t.title, t.description, t.xp_reward,
               CASE WHEN tc.id IS NOT NULL THEN TRUE ELSE FALSE END as completed_today
        FROM tasks t
        LEFT JOIN task_completions tc 
          ON t.id = tc.task_id 
          AND (tc.completed_at AT TIME ZONE 'UTC')::date = CURRENT_DATE
    """
    # Because of RLS, PostgreSQL automatically filters tc.astronaut_id 
    # to match the current user!
    async with db.cursor() as cur:
        await cur.execute(query)
        rows = await cur.fetchall()
        
    return [
        {
            "id": row["id"],
            "title": row["title"],
            "description": row["description"],
            "xp_reward": row["xp_reward"],
            "completed_today": row["completed_today"]
        } for row in rows
    ]

@router.post("/tasks/{task_id}/complete", response_model=schemas.TaskCompletionResponse)
async def complete_task(task_id: int, astronaut_id: int = Depends(require_astronaut), db = Depends(get_db)):
    async with db.cursor() as cur:
        # 1. Insert the completion. 
        # The DB trigger 'trg_award_xp' will automatically add XP!
        try:
            await cur.execute(
                "INSERT INTO task_completions (astronaut_id, task_id) VALUES (%s, %s)",
                (astronaut_id, task_id)
            )
        except Exception as e:
            # If the unique index (one task per day) is violated, PostgreSQL throws an error
            if "unique_violation" in str(e).lower() or "already exists" in str(e).lower():
                raise HTTPException(status_code=409, detail="Task already completed today")
            raise e

        # 2. Fetch the astronaut's NEW total XP
        await cur.execute("SELECT xp FROM astronauts WHERE id = %s", (astronaut_id,))
        row = await cur.fetchone()
        new_xp = row["xp"]

        # 3. Check for newly unlocked achievements
        # Find achievements where xp_required <= new_xp AND the user doesn't have them yet
        unlock_query = """
            INSERT INTO astronaut_achievements (astronaut_id, achievement_id)
            SELECT %s, id FROM achievements 
            WHERE xp_required <= %s 
              AND id NOT IN (SELECT achievement_id FROM astronaut_achievements WHERE astronaut_id = %s)
            RETURNING name
        """
        await cur.execute(unlock_query, (astronaut_id, new_xp, astronaut_id))
        unlocked_rows = await cur.fetchall()
        unlocked_names = [r["name"] for r in unlocked_rows]

    return {"new_xp": new_xp, "unlocked_achievements": unlocked_names}

@router.get("/achievements", response_model=List[schemas.AchievementResponse])
async def get_achievements(db = Depends(get_db)):
    query = """
        SELECT a.id, a.name, a.description, a.xp_required, aa.earned_at
        FROM achievements a
        LEFT JOIN astronaut_achievements aa 
          ON a.id = aa.achievement_id 
          AND aa.astronaut_id = NULLIF(current_setting('app.astronaut_id', true), '')::int
        ORDER BY a.xp_required ASC
    """
    async with db.cursor() as cur:
        await cur.execute(query)
        rows = await cur.fetchall()
        
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "xp_required": row["xp_required"],
            "earned_at": row["earned_at"]
        } for row in rows
    ]
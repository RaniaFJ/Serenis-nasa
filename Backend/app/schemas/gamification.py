from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TaskTodayResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    xp_reward: int
    completed_today: bool

class TaskCompletionResponse(BaseModel):
    new_xp: int
    unlocked_achievements: List[str]

class AchievementResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    xp_required: int
    earned_at: Optional[datetime] = None
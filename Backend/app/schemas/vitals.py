from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MeasurementHistoryItem(BaseModel):
    value: float
    measured_at: datetime
    status: str  # This will be 'green', 'yellow', or 'red'
    direction: Optional[str] = None  # 'low' or 'high'

class ChartHistoryResponse(BaseModel):
    indicator_code: str
    indicator_name: str
    unit: str
    history: List[MeasurementHistoryItem]
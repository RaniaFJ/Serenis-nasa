from pathlib import Path
import logging
import math

import joblib
import pandas as pd

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, model_validator

from app.database import require_astronaut
from ml.risk_engine.health_risk_engine import assess_health
from ml.risk_engine.sleep_monitor import analyze_sleep

router = APIRouter(prefix="/ai", tags=["AI"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = PROJECT_ROOT / "ml" / "saved_models" / "stress_classifier_personal_zscore.joblib"

MODEL_ARTIFACT = None

FEATURES = [
    "heart_rate_mean",
    "heart_rate_std",
    "hrv_rmssd",
    "hrv_sdnn",
    "eda_mean",
    "eda_std",
    "eda_min",
    "eda_max",
    "acc_magnitude_mean",
    "acc_magnitude_std",
]


def load_model():
    global MODEL_ARTIFACT

    if not MODEL_PATH.exists():
        # Le modèle entraîné n'est pas dans Git (licence WESAD). L'API démarre quand même :
        # seule la route /ai/stress/predict répond 503 tant que le fichier n'est pas généré.
        logging.getLogger("uvicorn.error").warning("Stress model not found (%s): /ai/stress/predict disabled.", MODEL_PATH)
        return

    artifact = joblib.load(MODEL_PATH)

    if artifact["features"] != FEATURES:
        raise RuntimeError("Model feature configuration does not match API.")

    MODEL_ARTIFACT = artifact


class FeatureWindow(BaseModel):
    heart_rate_mean: float
    heart_rate_std: float
    hrv_rmssd: float
    hrv_sdnn: float
    eda_mean: float
    eda_std: float
    eda_min: float
    eda_max: float
    acc_magnitude_mean: float
    acc_magnitude_std: float

    @model_validator(mode="after")
    def validate_finite_values(self):
        if not all(math.isfinite(v) for v in self.model_dump().values()):
            raise ValueError("All feature values must be finite numbers.")
        return self


class StressPredictionRequest(BaseModel):
    baseline_windows: list[FeatureWindow]
    current_window: FeatureWindow

    @model_validator(mode="after")
    def validate_calibration(self):
        if len(self.baseline_windows) != 15:
            raise ValueError(
                "Exactly 15 baseline windows are required for calibration."
            )
        return self


@router.post("/stress/predict")
async def predict_stress(
    request: StressPredictionRequest,
    astronaut_id: int = Depends(require_astronaut),
):
    if MODEL_ARTIFACT is None:
        raise HTTPException(
            status_code=503,
            detail="Stress model is not loaded."
        )

    features = MODEL_ARTIFACT["features"]
    std_floor = MODEL_ARTIFACT["std_floor"]

    baseline = pd.DataFrame(
        [window.model_dump() for window in request.baseline_windows],
        columns=features,
    )

    current = pd.DataFrame(
        [request.current_window.model_dump()],
        columns=features,
    )

    # Match the training preprocessing exactly:
    # participant-specific mean and sample standard deviation (ddof=1).
    personal_means = baseline.mean(axis=0)
    personal_stds = baseline.std(axis=0).clip(lower=std_floor)

    normalized = (current - personal_means) / personal_stds

    model = MODEL_ARTIFACT["model"]
    prediction = int(model.predict(normalized)[0])

    probabilities = model.predict_proba(normalized)[0]
    classes = list(model.classes_)
    stress_probability = float(probabilities[classes.index(2)])

    return {
        "prediction": MODEL_ARTIFACT["label_mapping"][prediction],
        "stress_probability": round(stress_probability, 4),
        "baseline_probability": round(1.0 - stress_probability, 4),
        "calibration_windows": 15,
        "calibration_duration_minutes": 15,
        "model": "Random Forest",
        "dataset": "WESAD",
        "disclaimer": MODEL_ARTIFACT["disclaimer"],
    }


# ============================================================
# CARDIOVASCULAR MONITORING
# ============================================================

class CardiovascularWindow(BaseModel):
    heart_rate_mean: float
    hrv_rmssd: float
    hrv_sdnn: float

    @model_validator(mode="after")
    def validate_values(self):
        values = self.model_dump()

        if not all(math.isfinite(v) for v in values.values()):
            raise ValueError("Cardiovascular values must be finite.")

        if self.heart_rate_mean <= 0:
            raise ValueError("Heart rate must be positive.")

        if self.hrv_rmssd < 0 or self.hrv_sdnn < 0:
            raise ValueError("HRV values cannot be negative.")

        return self


class CardiovascularRequest(BaseModel):
    baseline_windows: list[CardiovascularWindow]
    current_window: CardiovascularWindow

    @model_validator(mode="after")
    def validate_baseline(self):
        if len(self.baseline_windows) != 15:
            raise ValueError(
                "Exactly 15 baseline windows are required."
            )
        return self


@router.post("/cardiovascular/analyze")
async def analyze_cardiovascular(
    request: CardiovascularRequest,
    astronaut_id: int = Depends(require_astronaut),
):
    baseline = pd.DataFrame(
        [window.model_dump() for window in request.baseline_windows]
    )

    current = request.current_window.model_dump()

    # Minimum scale values prevent division by nearly zero.
    # These are computational safeguards, not medical thresholds.
    scale_floors = {
        "heart_rate_mean": 3.0,
        "hrv_rmssd": 5.0,
        "hrv_sdnn": 5.0,
    }

    results = {}
    anomalies = []

    for metric, floor in scale_floors.items():
        baseline_mean = float(baseline[metric].mean())
        baseline_std = float(baseline[metric].std(ddof=1))
        scale = max(baseline_std, floor)

        current_value = float(current[metric])
        deviation = (current_value - baseline_mean) / scale

        unusual = abs(deviation) >= 2.5

        results[metric] = {
            "current": round(current_value, 2),
            "baseline_mean": round(baseline_mean, 2),
            "deviation_score": round(deviation, 2),
            "status": (
                "unusual_deviation"
                if unusual
                else "within_personal_baseline"
            ),
        }

        if unusual:
            anomalies.append({
                "metric": metric,
                "direction": (
                    "above_baseline"
                    if deviation > 0
                    else "below_baseline"
                ),
                "deviation_score": round(deviation, 2),
            })

    return {
        "cardiovascular_status": (
            "unusual_deviation_detected"
            if anomalies
            else "within_personal_baseline"
        ),
        "measurements": results,
        "anomalies": anomalies,
        "calibration_windows": 15,
        "dataset": "WESAD-compatible physiological features",
        "method": "Personal baseline statistical deviation analysis",
        "disclaimer": (
            "Experimental monitoring only. Statistical deviations "
            "are not clinical diagnoses or validated medical risk thresholds."
        ),
    }


# ============================================================
# SENTRA OVERALL HEALTH ASSESSMENT
# ============================================================

class HealthAssessmentRequest(BaseModel):
    cardiovascular: dict | None = None
    stress: dict | None = None
    sleep: dict | None = None
    physical: dict | None = None
    radiation: dict | None = None


@router.post("/health/assess")
async def overall_health_assessment(
    request: HealthAssessmentRequest,
    astronaut_id: int = Depends(require_astronaut),
):
    components = request.model_dump(exclude_none=True)

    return assess_health(components)

# ============================================================
# SENTRA SLEEP MONITORING
# ============================================================

class SleepRequest(BaseModel):
    sleep_duration_hours: float
    sleep_efficiency_percent: float | None = None
    sleep_debt_hours: float | None = None

    @model_validator(mode="after")
    def validate_sleep_data(self):
        if not math.isfinite(self.sleep_duration_hours):
            raise ValueError("Sleep duration must be finite.")

        if not 0 <= self.sleep_duration_hours <= 24:
            raise ValueError("Sleep duration must be between 0 and 24 hours.")

        if self.sleep_efficiency_percent is not None:
            if not math.isfinite(self.sleep_efficiency_percent):
                raise ValueError("Sleep efficiency must be finite.")
            if not 0 <= self.sleep_efficiency_percent <= 100:
                raise ValueError("Sleep efficiency must be between 0 and 100.")

        if self.sleep_debt_hours is not None:
            if not math.isfinite(self.sleep_debt_hours):
                raise ValueError("Sleep debt must be finite.")
            if not 0 <= self.sleep_debt_hours <= 72:
                raise ValueError("Sleep debt must be between 0 and 72 hours.")

        return self


@router.post("/sleep/analyze")
async def analyze_sleep_endpoint(
    request: SleepRequest,
    astronaut_id: int = Depends(require_astronaut),
):
    return analyze_sleep(
        sleep_duration_hours=request.sleep_duration_hours,
        sleep_efficiency_percent=request.sleep_efficiency_percent,
        sleep_debt_hours=request.sleep_debt_hours,
    )

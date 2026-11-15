
from pathlib import Path
import joblib
import pandas as pd
import numpy as np
import sklearn

from sklearn.ensemble import RandomForestClassifier

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_FILE = PROJECT_ROOT / "ml/data/processed/stress_features.csv"
MODEL_DIR = PROJECT_ROOT / "ml/saved_models"
MODEL_FILE = MODEL_DIR / "stress_classifier_personal_zscore.joblib"

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

CALIBRATION_WINDOWS = 15
STD_FLOOR = 0.01

MODEL_PARAMS = {
    "n_estimators": 300,
    "class_weight": "balanced",
    "random_state": 42,
    "min_samples_leaf": 2,
    "n_jobs": -1,
}


def main():
    print("=" * 70)
    print("SENTRA - FINAL STRESS CLASSIFIER TRAINING")
    print("=" * 70)

    df = pd.read_csv(DATA_FILE)

    df = df.sort_values(
        ["subject", "window_start_seconds"]
    ).reset_index(drop=True)

    print(f"Participants: {df['subject'].nunique()}")
    print(f"Original windows: {len(df)}")

    # 1. Extract the first 15 baseline windows per participant.
    calibration = (
        df.groupby("subject", sort=False)
        .head(CALIBRATION_WINDOWS)
        .copy()
    )

    if not (calibration["label"] == 1).all():
        raise ValueError(
            "Calibration contains non-baseline windows."
        )

    if calibration.groupby("subject").size().min() < CALIBRATION_WINDOWS:
        raise ValueError("A participant has insufficient calibration data.")

    # 2. Calculate participant-specific calibration statistics.
    personal_means = calibration.groupby("subject")[FEATURES].mean()

    personal_stds = (
        calibration.groupby("subject")[FEATURES]
        .std()
        .clip(lower=STD_FLOOR)
    )

    # 3. Remove calibration windows from training.
    training = df.drop(index=calibration.index).copy()

    # 4. Apply personal Z-score normalization.
    for feature in FEATURES:
        means = training["subject"].map(personal_means[feature])
        stds = training["subject"].map(personal_stds[feature])

        training[feature] = (training[feature] - means) / stds

    X = training[FEATURES]
    y = training["label"].astype(int)

    if not np.isfinite(X.to_numpy()).all():
        raise ValueError("Non-finite values found in training features.")

    print(f"Calibration windows: {len(calibration)}")
    print(f"Training windows: {len(training)}")
    print(f"Baseline windows: {(y == 1).sum()}")
    print(f"Stress windows: {(y == 2).sum()}")

    # 5. Train the final Random Forest.
    model = RandomForestClassifier(**MODEL_PARAMS)
    model.fit(X, y)

    # 6. Save model and preprocessing configuration together.
    artifact = {
        "model": model,
        "features": FEATURES,
        "calibration_windows": CALIBRATION_WINDOWS,
        "calibration_duration_minutes": CALIBRATION_WINDOWS,
        "std_floor": STD_FLOOR,
        "positive_label": 2,
        "label_mapping": {
            1: "baseline",
            2: "stress",
        },
        "model_params": MODEL_PARAMS,
        "training_participants": sorted(df["subject"].unique().tolist()),
        "training_windows": len(training),
        "dataset": "WESAD",
        "sklearn_version": sklearn.__version__,
        "disclaimer": (
            "Experimental WESAD baseline/stress classifier. "
            "Not validated for astronaut health assessment."
        ),
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, MODEL_FILE)

    print("\nFINAL MODEL TRAINED SUCCESSFULLY")
    print(f"Model saved to: {MODEL_FILE}")
    print(f"Features: {len(FEATURES)}")
    print(f"Calibration: {CALIBRATION_WINDOWS} baseline windows")
    print("Classes:", model.classes_)
    print("\nTRAINING COMPLETED.")


if __name__ == "__main__":
    main()

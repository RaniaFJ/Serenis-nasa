
from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupKFold
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_FILE = PROJECT_ROOT / "ml/data/processed/stress_features.csv"

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

CALIBRATION_WINDOWS = 5
STD_FLOOR = 0.01
N_SPLITS = 5

# --------------------------------------------------
# 1. Load dataset
# --------------------------------------------------

df = pd.read_csv(DATA_FILE)

df = df.sort_values(
    ["subject", "window_start_seconds"]
).reset_index(drop=True)

subjects = sorted(df["subject"].unique())

print("=" * 75)
print("SENTRA - PARTICIPANT-LEVEL MODEL COMPARISON")
print("=" * 75)

print("Participants:", len(subjects))
print("Total windows:", len(df))

# --------------------------------------------------
# 2. Personal calibration
# --------------------------------------------------

calibration = (
    df.groupby("subject", group_keys=False)
    .head(CALIBRATION_WINDOWS)
)

if not (calibration["label"] == 1).all():
    raise ValueError("Calibration contains non-baseline windows.")

personal_means = calibration.groupby("subject")[FEATURES].mean()

personal_stds = (
    calibration.groupby("subject")[FEATURES]
    .std()
    .clip(lower=STD_FLOOR)
)

# Remove calibration windows
evaluation = df.drop(index=calibration.index).copy()
evaluation = evaluation.reset_index(drop=True)

# Prepare Z-score features
zscore_df = evaluation.copy()

for subject in subjects:
    mask = zscore_df["subject"] == subject

    zscore_df.loc[mask, FEATURES] = (
        zscore_df.loc[mask, FEATURES]
        - personal_means.loc[subject]
    ) / personal_stds.loc[subject]

if not np.isfinite(zscore_df[FEATURES].values).all():
    raise ValueError("Non-finite Z-score values found.")

# --------------------------------------------------
# 3. Out-of-fold predictions
# --------------------------------------------------

raw_predictions = []
zscore_predictions = []

cv = GroupKFold(n_splits=N_SPLITS)

for fold, (train_idx, test_idx) in enumerate(
    cv.split(evaluation[FEATURES],
             evaluation["label"],
             evaluation["subject"]),
    start=1,
):

    train_raw = evaluation.iloc[train_idx]
    test_raw = evaluation.iloc[test_idx]

    train_z = zscore_df.iloc[train_idx]
    test_z = zscore_df.iloc[test_idx]

    print(f"\nFold {fold}")
    print("Test participants:",
          sorted(test_raw["subject"].unique()))

    # RAW MODEL
    raw_model = RandomForestClassifier(
        n_estimators=300,
        class_weight="balanced",
        random_state=42,
        min_samples_leaf=2,
        n_jobs=-1,
    )

    raw_model.fit(
        train_raw[FEATURES],
        train_raw["label"],
    )

    raw_pred = raw_model.predict(test_raw[FEATURES])

    raw_result = test_raw[
        ["subject", "window_start_seconds", "label"]
    ].copy()

    raw_result["prediction"] = raw_pred
    raw_predictions.append(raw_result)

    # PERSONAL Z-SCORE MODEL
    z_model = RandomForestClassifier(
        n_estimators=300,
        class_weight="balanced",
        random_state=42,
        min_samples_leaf=2,
        n_jobs=-1,
    )

    z_model.fit(
        train_z[FEATURES],
        train_z["label"],
    )

    z_pred = z_model.predict(test_z[FEATURES])

    z_result = test_z[
        ["subject", "window_start_seconds", "label"]
    ].copy()

    z_result["prediction"] = z_pred
    zscore_predictions.append(z_result)

# Combine out-of-fold predictions
raw_all = pd.concat(raw_predictions, ignore_index=True)
zscore_all = pd.concat(zscore_predictions, ignore_index=True)

# --------------------------------------------------
# 4. Calculate participant-level metrics
# --------------------------------------------------

def calculate_metrics(data):

    y_true = data["label"]
    y_pred = data["prediction"]

    matrix = confusion_matrix(
        y_true,
        y_pred,
        labels=[1, 2],
    )

    tn, fp, fn, tp = matrix.ravel()

    return {
        "windows": len(data),
        "accuracy": accuracy_score(y_true, y_pred),
        "stress_precision": precision_score(
            y_true, y_pred, pos_label=2, zero_division=0
        ),
        "stress_recall": recall_score(
            y_true, y_pred, pos_label=2, zero_division=0
        ),
        "stress_f1": f1_score(
            y_true, y_pred, pos_label=2, zero_division=0
        ),
        "false_alarms": fp,
        "missed_stress": fn,
        "true_stress": tp,
        "true_baseline": tn,
    }


rows = []

for subject in subjects:

    raw_subject = raw_all[
        raw_all["subject"] == subject
    ]

    z_subject = zscore_all[
        zscore_all["subject"] == subject
    ]

    raw_metrics = calculate_metrics(raw_subject)
    z_metrics = calculate_metrics(z_subject)

    row = {"subject": subject}

    for metric, value in raw_metrics.items():
        row[f"raw_{metric}"] = value

    for metric, value in z_metrics.items():
        row[f"zscore_{metric}"] = value

    row["recall_difference"] = (
        z_metrics["stress_recall"]
        - raw_metrics["stress_recall"]
    )

    row["f1_difference"] = (
        z_metrics["stress_f1"]
        - raw_metrics["stress_f1"]
    )

    rows.append(row)

comparison = pd.DataFrame(rows)

# --------------------------------------------------
# 5. Display participant-level comparison
# --------------------------------------------------

print("\n" + "=" * 75)
print("PARTICIPANT-LEVEL RESULTS")
print("=" * 75)

display_columns = [
    "subject",
    "raw_accuracy",
    "zscore_accuracy",
    "raw_stress_recall",
    "zscore_stress_recall",
    "raw_stress_f1",
    "zscore_stress_f1",
    "raw_missed_stress",
    "zscore_missed_stress",
    "raw_false_alarms",
    "zscore_false_alarms",
]

print(
    comparison[display_columns]
    .round(3)
    .to_string(index=False)
)

# --------------------------------------------------
# 6. Determine which model wins per participant
# --------------------------------------------------

print("\n" + "=" * 75)
print("PARTICIPANT-LEVEL MODEL WINS")
print("=" * 75)

f1_wins = (
    comparison["f1_difference"] > 0
).sum()

f1_losses = (
    comparison["f1_difference"] < 0
).sum()

f1_ties = (
    comparison["f1_difference"] == 0
).sum()

recall_wins = (
    comparison["recall_difference"] > 0
).sum()

recall_losses = (
    comparison["recall_difference"] < 0
).sum()

recall_ties = (
    comparison["recall_difference"] == 0
).sum()

print(f"Z-score F1 wins: {f1_wins}")
print(f"Raw F1 wins: {f1_losses}")
print(f"Ties: {f1_ties}")

print(f"\nZ-score recall wins: {recall_wins}")
print(f"Raw recall wins: {recall_losses}")
print(f"Ties: {recall_ties}")

# --------------------------------------------------
# 7. Overall participant-level averages
# --------------------------------------------------

print("\n" + "=" * 75)
print("AVERAGE PARTICIPANT PERFORMANCE")
print("=" * 75)

summary_columns = [
    "raw_accuracy",
    "zscore_accuracy",
    "raw_stress_precision",
    "zscore_stress_precision",
    "raw_stress_recall",
    "zscore_stress_recall",
    "raw_stress_f1",
    "zscore_stress_f1",
]

print(
    comparison[summary_columns]
    .mean()
    .round(3)
    .to_string()
)

# --------------------------------------------------
# 8. Save results
# --------------------------------------------------

output_file = (
    PROJECT_ROOT
    / "ml/data/processed/participant_model_comparison.csv"
)

comparison.to_csv(output_file, index=False)

print("\nResults saved to:")
print(output_file)

print("\nCOMPARISON COMPLETED.")

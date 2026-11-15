
from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupKFold
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)


# ============================================================
# CONFIGURATION
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_FILE = (
    PROJECT_ROOT
    / "ml"
    / "data"
    / "processed"
    / "stress_features.csv"
)

CALIBRATION_WINDOWS = 5
N_SPLITS = 5

# Minimum standard deviation to avoid unstable division.
STD_FLOOR = 0.01

FEATURE_COLUMNS = [
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

MODEL_PARAMS = {
    "n_estimators": 300,
    "class_weight": "balanced",
    "random_state": 42,
    "min_samples_leaf": 2,
    "n_jobs": -1,
}


# ============================================================
# FUNCTIONS
# ============================================================

def calculate_metrics(y_true, y_pred):

    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "balanced_accuracy": balanced_accuracy_score(
            y_true, y_pred
        ),
        "stress_precision": precision_score(
            y_true, y_pred, pos_label=2, zero_division=0
        ),
        "stress_recall": recall_score(
            y_true, y_pred, pos_label=2, zero_division=0
        ),
        "stress_f1": f1_score(
            y_true, y_pred, pos_label=2, zero_division=0
        ),
    }


def create_model():

    return RandomForestClassifier(**MODEL_PARAMS)


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 65)
print("SENTRA - PERSONAL Z-SCORE NORMALIZATION")
print("=" * 65)

df = pd.read_csv(DATA_FILE)

df = df.sort_values(
    ["subject", "window_start_seconds"]
).reset_index(drop=True)

print(f"\nDataset shape: {df.shape}")
print(f"Participants: {df['subject'].nunique()}")
print(f"Total windows: {len(df)}")


# ============================================================
# CALIBRATION
# ============================================================

calibration = (
    df.groupby("subject", sort=False)
    .head(CALIBRATION_WINDOWS)
    .copy()
)

if not (calibration["label_name"] == "baseline").all():
    raise ValueError(
        "Calibration contains non-baseline windows."
    )

personal_means = (
    calibration.groupby("subject")[FEATURE_COLUMNS].mean()
)

personal_stds = (
    calibration.groupby("subject")[FEATURE_COLUMNS].std()
)

# Apply a minimum standard deviation.
safe_stds = personal_stds.clip(lower=STD_FLOOR)

print("\nCalibration completed.")
print(f"Calibration windows per participant: {CALIBRATION_WINDOWS}")
print(f"Standard deviation floor: {STD_FLOOR}")


# ============================================================
# CREATE THREE DATASETS
# ============================================================

raw_df = df.copy()
baseline_df = df.copy()
zscore_df = df.copy()

for subject in personal_means.index:

    mask = zscore_df["subject"] == subject

    # Baseline subtraction.
    baseline_df.loc[
        baseline_df["subject"] == subject,
        FEATURE_COLUMNS
    ] = (
        baseline_df.loc[
            baseline_df["subject"] == subject,
            FEATURE_COLUMNS
        ] - personal_means.loc[subject]
    )

    # Personal Z-score.
    zscore_df.loc[mask, FEATURE_COLUMNS] = (
        zscore_df.loc[mask, FEATURE_COLUMNS]
        - personal_means.loc[subject]
    ) / safe_stds.loc[subject]


# ============================================================
# REMOVE CALIBRATION WINDOWS
# ============================================================

raw_df = raw_df.iloc[0:].copy()
baseline_df = baseline_df.iloc[0:].copy()
zscore_df = zscore_df.iloc[0:].copy()

calibration_indices = calibration.index

raw_df = raw_df.drop(index=calibration_indices).reset_index(drop=True)
baseline_df = baseline_df.drop(
    index=calibration_indices
).reset_index(drop=True)
zscore_df = zscore_df.drop(
    index=calibration_indices
).reset_index(drop=True)

print(f"\nRemaining evaluation windows: {len(raw_df)}")


# ============================================================
# PREPARE DATA
# ============================================================

datasets = {
    "RAW": raw_df,
    "BASELINE_SUBTRACTION": baseline_df,
    "PERSONAL_ZSCORE": zscore_df,
}

y = raw_df["label"].astype(int)
groups = raw_df["subject"]

for name, data in datasets.items():

    if not np.isfinite(data[FEATURE_COLUMNS].to_numpy()).all():
        raise ValueError(f"Invalid feature values in {name}.")


# ============================================================
# CROSS-VALIDATION
# ============================================================

group_kfold = GroupKFold(n_splits=N_SPLITS)

results = {name: [] for name in datasets}

confusion_matrices = {
    name: np.zeros((2, 2), dtype=int)
    for name in datasets
}

for fold, (train_idx, test_idx) in enumerate(
    group_kfold.split(raw_df[FEATURE_COLUMNS], y, groups),
    start=1
):

    print("\n" + "=" * 65)
    print(f"FOLD {fold}")
    print("=" * 65)

    print(
        "Testing participants:",
        sorted(groups.iloc[test_idx].unique())
    )

    y_train = y.iloc[train_idx]
    y_test = y.iloc[test_idx]

    for experiment, data in datasets.items():

        X = data[FEATURE_COLUMNS]

        model = create_model()

        model.fit(
            X.iloc[train_idx],
            y_train
        )

        predictions = model.predict(
            X.iloc[test_idx]
        )

        metrics = calculate_metrics(y_test, predictions)

        results[experiment].append(metrics)

        matrix = confusion_matrix(
            y_test,
            predictions,
            labels=[1, 2]
        )

        confusion_matrices[experiment] += matrix

        print(f"\n{experiment}")

        for metric, value in metrics.items():
            print(f"{metric}: {value:.3f}")

        print("Confusion matrix:")
        print(matrix)

        # Participant-level stress recall.
        test_groups = groups.iloc[test_idx].reset_index(drop=True)
        actual = y_test.reset_index(drop=True)
        predicted = pd.Series(predictions)

        for subject in sorted(test_groups.unique()):

            mask = test_groups == subject

            subject_recall = recall_score(
                actual[mask],
                predicted[mask],
                pos_label=2,
                zero_division=0
            )

            print(
                f"{subject}: stress recall="
                f"{subject_recall:.3f}"
            )


# ============================================================
# SUMMARY
# ============================================================

print("\n" + "=" * 65)
print("FINAL CROSS-VALIDATION COMPARISON")
print("=" * 65)

summary = {}

for experiment, fold_results in results.items():

    scores = pd.DataFrame(fold_results)

    summary[experiment] = scores.mean()

    print(f"\n{experiment}")

    print("\nMean scores:")
    print(scores.mean().round(3).to_string())

    print("\nStandard deviations:")
    print(scores.std().round(3).to_string())

    print("\nCombined confusion matrix:")
    print(confusion_matrices[experiment])

comparison = pd.DataFrame(summary).T

print("\n" + "=" * 65)
print("MODEL COMPARISON")
print("=" * 65)

print(comparison.round(3).to_string())

print("\nEXPERIMENT COMPLETED.")

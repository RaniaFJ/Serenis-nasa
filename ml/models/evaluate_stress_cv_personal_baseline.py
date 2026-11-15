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
# METRICS
# ============================================================

def calculate_metrics(y_true, y_pred):

    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "balanced_accuracy": balanced_accuracy_score(y_true, y_pred),
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
print("SENTRA - PERSONAL BASELINE NORMALIZATION")
print("=" * 65)

df = pd.read_csv(DATA_FILE)

df = df.sort_values(
    ["subject", "window_start_seconds"]
).reset_index(drop=True)

print(f"\nDataset shape: {df.shape}")
print(f"Participants: {df['subject'].nunique()}")
print(f"Total windows: {len(df)}")


# ============================================================
# STEP 1: SELECT PERSONAL CALIBRATION WINDOWS
# ============================================================

print("\n" + "=" * 65)
print("PERSONAL BASELINE CALIBRATION")
print("=" * 65)

calibration = (
    df.groupby("subject", sort=False)
    .head(CALIBRATION_WINDOWS)
    .copy()
)

# Ensure every calibration window is labeled baseline.
if not (calibration["label_name"] == "baseline").all():

    raise ValueError(
        "Some participants do not have five initial baseline windows. "
        "Inspect the dataset before continuing."
    )

# Calculate each participant's personal feature averages.
personal_baselines = (
    calibration.groupby("subject")[FEATURE_COLUMNS]
    .mean()
)

for subject, baseline in personal_baselines.iterrows():

    print(
        f"{subject}: "
        f"{len(calibration[calibration['subject'] == subject])} "
        f"calibration windows"
    )

print("\nPersonal baselines calculated successfully.")


# ============================================================
# STEP 2: CREATE TWO EXPERIMENTAL DATASETS
# ============================================================

# Keep the original values for the comparison experiment.
raw_df = df.copy()

# Create a separate copy for personal normalization.
normalized_df = df.copy()

for subject, baseline in personal_baselines.iterrows():

    subject_mask = normalized_df["subject"] == subject

    normalized_df.loc[
        subject_mask, FEATURE_COLUMNS
    ] = (
        normalized_df.loc[subject_mask, FEATURE_COLUMNS]
        - baseline
    )

# Remove calibration windows from BOTH experiments.
calibration_indices = calibration.index

raw_df = raw_df.drop(index=calibration_indices).reset_index(drop=True)

normalized_df = (
    normalized_df.drop(index=calibration_indices)
    .reset_index(drop=True)
)

print("\nCalibration windows excluded from model evaluation.")
print(f"Remaining windows: {len(raw_df)}")


# ============================================================
# STEP 3: PREPARE CROSS-VALIDATION
# ============================================================

X_raw = raw_df[FEATURE_COLUMNS]
X_normalized = normalized_df[FEATURE_COLUMNS]

y = raw_df["label"].astype(int)
groups = raw_df["subject"]

if not set(y.unique()).issubset({1, 2}):

    raise ValueError("Unexpected labels. Expected 1=baseline and 2=stress.")

group_kfold = GroupKFold(n_splits=N_SPLITS)

results = {
    "raw": [],
    "personal_baseline": [],
}

confusion_matrices = {
    "raw": np.zeros((2, 2), dtype=int),
    "personal_baseline": np.zeros((2, 2), dtype=int),
}


# ============================================================
# STEP 4: FIVE-FOLD GROUP CROSS-VALIDATION
# ============================================================

for fold, (train_idx, test_idx) in enumerate(
    group_kfold.split(X_raw, y, groups),
    start=1
):

    print("\n" + "=" * 65)
    print(f"FOLD {fold}")
    print("=" * 65)

    train_subjects = sorted(groups.iloc[train_idx].unique())
    test_subjects = sorted(groups.iloc[test_idx].unique())

    print("Training participants:", train_subjects)
    print("Testing participants:", test_subjects)

    y_train = y.iloc[train_idx]
    y_test = y.iloc[test_idx]

    fold_predictions = {}

    # --------------------------------------------------------
    # MODEL A: ORIGINAL 10 FEATURES
    # --------------------------------------------------------

    model_raw = create_model()

    model_raw.fit(
        X_raw.iloc[train_idx],
        y_train
    )

    predictions_raw = model_raw.predict(
        X_raw.iloc[test_idx]
    )

    fold_predictions["raw"] = predictions_raw

    # --------------------------------------------------------
    # MODEL B: PERSONAL BASELINE NORMALIZATION
    # --------------------------------------------------------

    model_personal = create_model()

    model_personal.fit(
        X_normalized.iloc[train_idx],
        y_train
    )

    predictions_personal = model_personal.predict(
        X_normalized.iloc[test_idx]
    )

    fold_predictions["personal_baseline"] = predictions_personal

    # --------------------------------------------------------
    # EVALUATION
    # --------------------------------------------------------

    for experiment, predictions in fold_predictions.items():

        metrics = calculate_metrics(y_test, predictions)

        results[experiment].append(metrics)

        matrix = confusion_matrix(
            y_test,
            predictions,
            labels=[1, 2]
        )

        confusion_matrices[experiment] += matrix

        print(f"\n{experiment.upper()}")

        for metric, value in metrics.items():

            print(f"{metric}: {value:.3f}")

        print("Confusion matrix:")
        print(matrix)

        # Participant-level stress recall.
        print("\nParticipant stress recall:")

        test_subject_values = groups.iloc[test_idx].reset_index(drop=True)
        y_test_values = y_test.reset_index(drop=True)

        for subject in test_subjects:

            subject_mask = test_subject_values == subject

            actual = y_test_values[subject_mask]
            predicted = pd.Series(predictions)[subject_mask]

            recall = recall_score(
                actual,
                predicted,
                pos_label=2,
                zero_division=0
            )

            stress_count = int((actual == 2).sum())

            print(
                f"{subject}: "
                f"recall={recall:.3f}, "
                f"stress windows={stress_count}"
            )


# ============================================================
# STEP 5: FINAL COMPARISON
# ============================================================

print("\n" + "=" * 65)
print("CROSS-VALIDATION SUMMARY")
print("=" * 65)

for experiment, fold_results in results.items():

    scores = pd.DataFrame(fold_results)

    print(f"\n{experiment.upper()}")

    print("\nMean scores:")
    print(scores.mean().round(3).to_string())

    print("\nStandard deviations:")
    print(scores.std().round(3).to_string())

    print("\nCombined confusion matrix:")
    print(confusion_matrices[experiment])


# ============================================================
# STEP 6: DIRECT COMPARISON
# ============================================================

raw_scores = pd.DataFrame(results["raw"]).mean()
personal_scores = pd.DataFrame(
    results["personal_baseline"]
).mean()

comparison = pd.DataFrame({
    "raw_10_features": raw_scores,
    "personal_baseline": personal_scores,
})

comparison["difference"] = (
    comparison["personal_baseline"]
    - comparison["raw_10_features"]
)

print("\n" + "=" * 65)
print("FINAL MODEL COMPARISON")
print("=" * 65)

print(comparison.round(3).to_string())

print("\nEXPERIMENT COMPLETED.")
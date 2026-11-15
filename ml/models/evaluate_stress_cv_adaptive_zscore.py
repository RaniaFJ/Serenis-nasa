
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
N_SPLITS = 5

df = pd.read_csv(DATA_FILE)
df = df.sort_values(
    ["subject", "window_start_seconds"]
).reset_index(drop=True)

# --------------------------------------------------
# 1. Personal calibration
# --------------------------------------------------

calibration = (
    df.groupby("subject", group_keys=False)
    .head(CALIBRATION_WINDOWS)
)

if not (calibration["label"] == 1).all():
    raise ValueError("Calibration contains non-baseline windows.")

personal_means = calibration.groupby("subject")[FEATURES].mean()
personal_stds = calibration.groupby("subject")[FEATURES].std()

# Remove calibration windows from evaluation
evaluation = df.drop(index=calibration.index).copy()
evaluation = evaluation.reset_index(drop=True)

X_raw = evaluation[FEATURES]
y = evaluation["label"]
groups = evaluation["subject"]

cv = GroupKFold(n_splits=N_SPLITS)

results = {
    "RAW": [],
    "ADAPTIVE_ZSCORE": [],
}

print("=" * 70)
print("SENTRA - ADAPTIVE PERSONAL Z-SCORE CROSS-VALIDATION")
print("=" * 70)

print("Participants:", df["subject"].nunique())
print("Calibration windows per participant:", CALIBRATION_WINDOWS)
print("Evaluation windows:", len(evaluation))

# --------------------------------------------------
# 2. Cross-validation
# --------------------------------------------------

for fold, (train_idx, test_idx) in enumerate(
    cv.split(X_raw, y, groups), start=1
):

    train_subjects = sorted(groups.iloc[train_idx].unique())
    test_subjects = sorted(groups.iloc[test_idx].unique())

    print("\n" + "=" * 70)
    print(f"FOLD {fold}")
    print("=" * 70)

    print("Training participants:", train_subjects)
    print("Testing participants:", test_subjects)

    train_df = evaluation.iloc[train_idx].copy()
    test_df = evaluation.iloc[test_idx].copy()

    # --------------------------------------------------
    # Calculate feature-specific floors using
    # TRAINING participants only
    # --------------------------------------------------

    adaptive_floors = (
        personal_stds.loc[train_subjects, FEATURES]
        .median(axis=0)
    )

    print("\nTraining-derived standard deviation floors:")
    print(adaptive_floors.round(6).to_string())

    # --------------------------------------------------
    # Personal Z-score transformation
    # --------------------------------------------------

    def normalize_participants(data):
        normalized = data.copy()

        for subject in normalized["subject"].unique():
            safe_std = personal_stds.loc[subject].copy()

            # Feature-specific floor learned from training subjects
            safe_std = np.maximum(
                safe_std.values,
                adaptive_floors.values
            )

            normalized.loc[
                normalized["subject"] == subject,
                FEATURES
            ] = (
                normalized.loc[
                    normalized["subject"] == subject,
                    FEATURES
                ].values
                - personal_means.loc[subject].values
            ) / safe_std

        return normalized

    train_z = normalize_participants(train_df)
    test_z = normalize_participants(test_df)

    if not np.isfinite(train_z[FEATURES].values).all():
        raise ValueError("Non-finite training values.")

    if not np.isfinite(test_z[FEATURES].values).all():
        raise ValueError("Non-finite testing values.")

    # --------------------------------------------------
    # Train and evaluate both approaches
    # --------------------------------------------------

    approaches = {
        "RAW": (
            train_df[FEATURES],
            test_df[FEATURES],
        ),
        "ADAPTIVE_ZSCORE": (
            train_z[FEATURES],
            test_z[FEATURES],
        ),
    }

    for name, (X_train, X_test) in approaches.items():

        model = RandomForestClassifier(
            n_estimators=300,
            class_weight="balanced",
            random_state=42,
            min_samples_leaf=2,
            n_jobs=-1,
        )

        model.fit(X_train, train_df["label"])

        predictions = model.predict(X_test)

        metrics = {
            "accuracy": accuracy_score(
                test_df["label"], predictions
            ),
            "balanced_accuracy": balanced_accuracy_score(
                test_df["label"], predictions
            ),
            "stress_precision": precision_score(
                test_df["label"], predictions,
                pos_label=2, zero_division=0
            ),
            "stress_recall": recall_score(
                test_df["label"], predictions,
                pos_label=2, zero_division=0
            ),
            "stress_f1": f1_score(
                test_df["label"], predictions,
                pos_label=2, zero_division=0
            ),
        }

        results[name].append(metrics)

        print(f"\n{name}")
        for metric, value in metrics.items():
            print(f"{metric}: {value:.3f}")

        print("Confusion matrix:")
        print(
            confusion_matrix(
                test_df["label"],
                predictions,
                labels=[1, 2],
            )
        )

        fold_results = test_df[
            ["subject", "label"]
        ].copy()

        fold_results["prediction"] = predictions

        print("\nParticipant stress recall:")

        for subject in test_subjects:
            participant = fold_results[
                fold_results["subject"] == subject
            ]

            actual_stress = participant["label"] == 2

            if actual_stress.sum() == 0:
                continue

            participant_recall = (
                (
                    participant.loc[
                        actual_stress, "prediction"
                    ] == 2
                ).sum()
                / actual_stress.sum()
            )

            print(
                f"{subject}: {participant_recall:.3f}"
            )

# --------------------------------------------------
# 3. Final comparison
# --------------------------------------------------

print("\n" + "=" * 70)
print("FINAL COMPARISON")
print("=" * 70)

summary = {}

for name, fold_results in results.items():
    result_df = pd.DataFrame(fold_results)

    summary[name] = result_df.mean()

    print(f"\n{name}")
    print("\nMean scores:")
    print(result_df.mean().round(3).to_string())

    print("\nStandard deviations:")
    print(result_df.std().round(3).to_string())

summary_df = pd.DataFrame(summary).T

print("\nMODEL COMPARISON")
print(summary_df.round(3).to_string())

print("\nEXPERIMENT COMPLETED.")

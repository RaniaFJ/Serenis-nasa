
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

DATA_FILE = (
    PROJECT_ROOT
    / "ml"
    / "data"
    / "processed"
    / "stress_features.csv"
)

FEATURE_COLUMNS = [
    "heart_rate_mean",
    "heart_rate_std",
    "hrv_rmssd",
    "hrv_sdnn",
    "eda_mean",
    "eda_std",
    "eda_min",
    "eda_max",
    "temperature_mean",
    "temperature_std",
    "acc_magnitude_mean",
    "acc_magnitude_std",
]


def main():

    print("=" * 55)
    print("SENTRA - 5-FOLD GROUP CROSS-VALIDATION")
    print("=" * 55)

    df = pd.read_csv(DATA_FILE)

    X = df[FEATURE_COLUMNS]
    y = df["label"]
    groups = df["subject"]

    cv = GroupKFold(n_splits=5)

    results = []
    total_matrix = np.zeros((2, 2), dtype=int)

    for fold, (train_idx, test_idx) in enumerate(
        cv.split(X, y, groups), start=1
    ):

        X_train = X.iloc[train_idx]
        X_test = X.iloc[test_idx]

        y_train = y.iloc[train_idx]
        y_test = y.iloc[test_idx]

        train_subjects = sorted(
            groups.iloc[train_idx].unique()
        )

        test_subjects = sorted(
            groups.iloc[test_idx].unique()
        )

        assert set(train_subjects).isdisjoint(test_subjects)

        model = RandomForestClassifier(
            n_estimators=300,
            class_weight="balanced",
            random_state=42,
            min_samples_leaf=2,
            n_jobs=-1
        )

        model.fit(X_train, y_train)

        predictions = model.predict(X_test)

        matrix = confusion_matrix(
            y_test,
            predictions,
            labels=[1, 2]
        )

        total_matrix += matrix

        metrics = {
            "fold": fold,
            "accuracy": accuracy_score(y_test, predictions),
            "balanced_accuracy": balanced_accuracy_score(
                y_test, predictions
            ),
            "stress_precision": precision_score(
                y_test, predictions, pos_label=2,
                zero_division=0
            ),
            "stress_recall": recall_score(
                y_test, predictions, pos_label=2,
                zero_division=0
            ),
            "stress_f1": f1_score(
                y_test, predictions, pos_label=2,
                zero_division=0
            ),
        }

        results.append(metrics)

        print(f"\nFOLD {fold}")
        print("Training participants:", train_subjects)
        print("Testing participants:", test_subjects)
        print("Testing windows:", len(test_idx))
        print("Confusion matrix:")
        print(matrix)

        print(
            f"Accuracy: {metrics['accuracy']:.3f} | "
            f"Balanced accuracy: "
            f"{metrics['balanced_accuracy']:.3f} | "
            f"Stress recall: "
            f"{metrics['stress_recall']:.3f} | "
            f"Stress F1: {metrics['stress_f1']:.3f}"
        )

    results_df = pd.DataFrame(results)

    print("\n" + "=" * 55)
    print("CROSS-VALIDATION SUMMARY")
    print("=" * 55)

    metric_columns = [
        "accuracy",
        "balanced_accuracy",
        "stress_precision",
        "stress_recall",
        "stress_f1",
    ]

    print("\nMean scores:")
    print(results_df[metric_columns].mean().round(3))

    print("\nStandard deviations:")
    print(results_df[metric_columns].std().round(3))

    print("\nCOMBINED CONFUSION MATRIX:")
    print(total_matrix)

    print("\nCROSS-VALIDATION COMPLETED.")


if __name__ == "__main__":
    main()

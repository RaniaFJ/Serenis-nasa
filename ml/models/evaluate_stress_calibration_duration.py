
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
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_FILE = PROJECT_ROOT / "ml/data/processed/stress_features.csv"
OUTPUT_FILE = (
    PROJECT_ROOT / "ml/data/processed/calibration_duration_results.csv"
)

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

CALIBRATION_OPTIONS = [5, 10, 15]
N_SPLITS = 5
STD_FLOOR = 0.01

MODEL_PARAMS = {
    "n_estimators": 300,
    "class_weight": "balanced",
    "random_state": 42,
    "min_samples_leaf": 2,
    "n_jobs": -1,
}



def calculate_metrics(y_true, y_pred):
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "balanced_accuracy": balanced_accuracy_score(y_true, y_pred),
        "precision": precision_score(
            y_true, y_pred, pos_label=2, zero_division=0
        ),
        "recall": recall_score(
            y_true, y_pred, pos_label=2, zero_division=0
        ),
        "f1": f1_score(
            y_true, y_pred, pos_label=2, zero_division=0
        ),
    }

    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "balanced_accuracy": balanced_accuracy_score(y_true, y_pred),
        "precision": precision_score(
            y_true, y_pred, zero_division=0
        ),
        "recall": recall_score(
            y_true, y_pred, zero_division=0
        ),
        "f1": f1_score(
            y_true, y_pred, zero_division=0
        ),
    }


def main():
    print("=" * 75)
    print("SENTRA - CALIBRATION DURATION EXPERIMENT")
    print("=" * 75)

    df = pd.read_csv(DATA_FILE)
    df = df.sort_values(
        ["subject", "window_start_seconds"]
    ).reset_index(drop=True)

    print(f"Participants: {df['subject'].nunique()}")
    print(f"Original windows: {len(df)}")

    all_results = []

    for calibration_windows in CALIBRATION_OPTIONS:

        print("\n" + "=" * 75)
        print(f"CALIBRATION: {calibration_windows} WINDOWS")
        print("=" * 75)

        calibration = (
            df.groupby("subject", sort=False)
            .head(calibration_windows)
            .copy()
        )

        # All calibration windows must be baseline.
        if not (calibration["label"] == 1).all():
            raise ValueError(
                f"Non-baseline calibration data found "
                f"for {calibration_windows} windows."
            )

        # Personal baseline statistics.
        personal_means = calibration.groupby("subject")[
            FEATURES
        ].mean()

        personal_stds = calibration.groupby("subject")[
            FEATURES
        ].std().clip(lower=STD_FLOOR)

        # Remove calibration windows from evaluation.
        evaluation = df.drop(
            index=calibration.index
        ).copy().reset_index(drop=True)

        print(f"Evaluation windows: {len(evaluation)}")

        # Personal Z-score transformation.
        zscore_df = evaluation.copy()

        for feature in FEATURES:
            zscore_df[feature] = (
                evaluation[feature]
                - evaluation["subject"].map(
                    personal_means[feature]
                )
            ) / evaluation["subject"].map(
                personal_stds[feature]
            )

        if not np.isfinite(
            zscore_df[FEATURES].to_numpy()
        ).all():
            raise ValueError("Invalid values in Z-score data.")

        X_raw = evaluation[FEATURES]
        X_zscore = zscore_df[FEATURES]

        y = evaluation["label"]
        groups = evaluation["subject"]

        cv = GroupKFold(n_splits=N_SPLITS)

        fold_results = {
            "RAW": [],
            "PERSONAL_ZSCORE": [],
        }

        for fold, (train_idx, test_idx) in enumerate(
            cv.split(X_raw, y, groups), start=1
        ):

            y_train = y.iloc[train_idx]
            y_test = y.iloc[test_idx]

            print(f"\nFold {fold}")

            for model_name, X in [
                ("RAW", X_raw),
                ("PERSONAL_ZSCORE", X_zscore),
            ]:

                model = RandomForestClassifier(**MODEL_PARAMS)

                model.fit(
                    X.iloc[train_idx],
                    y_train,
                )

                predictions = model.predict(
                    X.iloc[test_idx]
                )

                metrics = calculate_metrics(
                    y_test,
                    predictions,
                )

                fold_results[model_name].append(metrics)

                print(
                    f"{model_name}: "
                    f"Accuracy={metrics['accuracy']:.3f}, "
                    f"Recall={metrics['recall']:.3f}, "
                    f"F1={metrics['f1']:.3f}"
                )

        # Average metrics across folds.
        for model_name, results in fold_results.items():

            summary = pd.DataFrame(results).mean()

            all_results.append({
                "calibration_windows": calibration_windows,
                "calibration_minutes": calibration_windows,
                "model": model_name,
                **summary.to_dict(),
            })

    results_df = pd.DataFrame(all_results)

    print("\n" + "=" * 75)
    print("FINAL COMPARISON")
    print("=" * 75)

    print(
        results_df.round(3).to_string(index=False)
    )

    results_df.to_csv(OUTPUT_FILE, index=False)

    print("\nResults saved to:")
    print(OUTPUT_FILE)

    print("\nEXPERIMENT COMPLETED.")


if __name__ == "__main__":
    main()

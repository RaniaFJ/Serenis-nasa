
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

# ============================================================
# 1. PATHS AND CONFIGURATION
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_FILE = PROJECT_ROOT / "ml" / "data" / "processed" / "stress_features.csv"

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

TARGET_FOLD = 4

# ============================================================
# 2. LOAD DATA
# ============================================================

def main():

    print("=" * 65)
    print("SENTRA - FOLD 4 PARTICIPANT ANALYSIS")
    print("=" * 65)

    df = pd.read_csv(DATA_FILE)

    X = df[FEATURE_COLUMNS]
    y = df["label"]
    groups = df["subject"]

    print("\nDataset shape:", df.shape)
    print("Participants:", groups.nunique())
    print("Total windows:", len(df))

    # ========================================================
    # 3. RECREATE THE SAME 5-FOLD GROUP CROSS-VALIDATION
    # ========================================================

    cv = GroupKFold(n_splits=5)

    fold_data = None

    for fold, (train_idx, test_idx) in enumerate(
        cv.split(X, y, groups), start=1
    ):

        if fold == TARGET_FOLD:
            fold_data = (train_idx, test_idx)
            break

    if fold_data is None:
        raise ValueError("Target fold not found.")

    train_idx, test_idx = fold_data

    X_train = X.iloc[train_idx]
    X_test = X.iloc[test_idx]

    y_train = y.iloc[train_idx]
    y_test = y.iloc[test_idx]

    train_groups = groups.iloc[train_idx]
    test_groups = groups.iloc[test_idx]

    print("\n" + "=" * 65)
    print("FOLD 4 PARTICIPANTS")
    print("=" * 65)

    print("\nTraining participants:")
    print(sorted(train_groups.unique()))

    print("\nTesting participants:")
    print(sorted(test_groups.unique()))

    # Confirm there is no participant overlap
    assert set(train_groups.unique()).isdisjoint(
        set(test_groups.unique())
    )

    # ========================================================
    # 4. TRAIN THE SAME RANDOM FOREST MODEL
    # ========================================================

    model = RandomForestClassifier(
        n_estimators=300,
        class_weight="balanced",
        random_state=42,
        min_samples_leaf=2,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    # ========================================================
    # 5. OVERALL FOLD 4 PERFORMANCE
    # ========================================================

    print("\n" + "=" * 65)
    print("OVERALL FOLD 4 PERFORMANCE")
    print("=" * 65)

    print("Accuracy:",
          round(accuracy_score(y_test, predictions), 3))

    print("Stress precision:",
          round(precision_score(
              y_test, predictions, pos_label=2, zero_division=0
          ), 3))

    print("Stress recall:",
          round(recall_score(
              y_test, predictions, pos_label=2, zero_division=0
          ), 3))

    print("Stress F1:",
          round(f1_score(
              y_test, predictions, pos_label=2, zero_division=0
          ), 3))

    print("\nConfusion matrix:")
    print(confusion_matrix(y_test, predictions, labels=[1, 2]))

    # ========================================================
    # 6. PERFORMANCE FOR EACH TEST PARTICIPANT
    # ========================================================

    print("\n" + "=" * 65)
    print("PARTICIPANT-BY-PARTICIPANT PERFORMANCE")
    print("=" * 65)

    test_results = df.iloc[test_idx].copy()
    test_results["prediction"] = predictions

    participant_results = []

    for subject in sorted(test_results["subject"].unique()):

        participant_df = test_results[
            test_results["subject"] == subject
        ]

        actual = participant_df["label"]
        predicted = participant_df["prediction"]

        matrix = confusion_matrix(
            actual,
            predicted,
            labels=[1, 2]
        )

        stress_actual = int((actual == 2).sum())
        stress_detected = int(
            ((actual == 2) & (predicted == 2)).sum()
        )
        missed_stress = stress_actual - stress_detected

        accuracy = accuracy_score(actual, predicted)

        stress_recall = recall_score(
            actual,
            predicted,
            pos_label=2,
            zero_division=0
        )

        stress_precision = precision_score(
            actual,
            predicted,
            pos_label=2,
            zero_division=0
        )

        stress_f1 = f1_score(
            actual,
            predicted,
            pos_label=2,
            zero_division=0
        )

        participant_results.append({
            "subject": subject,
            "windows": len(participant_df),
            "baseline_windows": int((actual == 1).sum()),
            "stress_windows": stress_actual,
            "accuracy": accuracy,
            "stress_precision": stress_precision,
            "stress_recall": stress_recall,
            "stress_f1": stress_f1,
            "missed_stress": missed_stress,
        })

        print(f"\nPARTICIPANT: {subject}")
        print("Windows:", len(participant_df))
        print("Actual baseline:", int((actual == 1).sum()))
        print("Actual stress:", stress_actual)
        print("Missed stress windows:", missed_stress)
        print("Accuracy:", round(accuracy, 3))
        print("Stress precision:", round(stress_precision, 3))
        print("Stress recall:", round(stress_recall, 3))
        print("Stress F1:", round(stress_f1, 3))
        print("Confusion matrix:")
        print(matrix)

    results_df = pd.DataFrame(participant_results)

    # ========================================================
    # 7. COMPARE PARTICIPANT FEATURES WITH TRAINING DATA
    # ========================================================

    print("\n" + "=" * 65)
    print("FEATURE DISTRIBUTION ANALYSIS")
    print("=" * 65)

    # Reference statistics are calculated ONLY from training data.
    train_mean = X_train.mean()
    train_std = X_train.std().replace(0, np.nan)

    for subject in sorted(test_groups.unique()):

        participant_data = test_results.loc[
            test_results["subject"] == subject,
            FEATURE_COLUMNS
        ]

        participant_mean = participant_data.mean()

        # How many training standard deviations separate
        # this participant's feature mean from the training mean?
        z_scores = (participant_mean - train_mean) / train_std

        comparison = pd.DataFrame({
            "training_mean": train_mean,
            "participant_mean": participant_mean,
            "difference_in_std": z_scores,
            "absolute_difference": z_scores.abs(),
        })

        comparison = comparison.sort_values(
            "absolute_difference",
            ascending=False
        )

        print(f"\nPARTICIPANT: {subject}")
        print("Largest feature differences from training data:")
        print(
            comparison[
                ["training_mean", "participant_mean", "difference_in_std"]
            ].head(6).round(3)
        )

    # ========================================================
    # 7B. S2 BASELINE VS STRESS FEATURE COMPARISON
    # ========================================================

    print("\n" + "=" * 65)
    print("S2 - BASELINE VS STRESS FEATURE ANALYSIS")
    print("=" * 65)

    train_data = df.iloc[train_idx].copy()

    s2_data = test_results[
        test_results["subject"] == "S2"
    ].copy()

    for label, label_name in [(1, "BASELINE"), (2, "STRESS")]:

        print("\n" + "-" * 65)
        print(f"S2 {label_name} WINDOWS")
        print("-" * 65)

        training_class = train_data[
            train_data["label"] == label
        ][FEATURE_COLUMNS]

        s2_class = s2_data[
            s2_data["label"] == label
        ][FEATURE_COLUMNS]

        training_mean = training_class.mean()
        training_std = training_class.std().replace(0, np.nan)

        s2_mean = s2_class.mean()
        s2_std = s2_class.std()

        z_scores = (s2_mean - training_mean) / training_std

        comparison = pd.DataFrame({
            "training_mean": training_mean,
            "training_std": training_std,
            "S2_mean": s2_mean,
            "S2_std": s2_std,
            "difference_in_std": z_scores,
        })

        comparison["absolute_difference"] = (
            comparison["difference_in_std"].abs()
        )

        comparison = comparison.sort_values(
            "absolute_difference",
            ascending=False
        )

        print("Training windows:", len(training_class))
        print("S2 windows:", len(s2_class))

        print(
            comparison.drop(
                columns=["absolute_difference"]
            ).round(3).to_string()
        )

    # ========================================================
    # 7C. MODEL CONFIDENCE ON S2 STRESS WINDOWS
    # ========================================================

    print("\n" + "=" * 65)
    print("S2 - STRESS PREDICTION CONFIDENCE")
    print("=" * 65)

    s2_stress = s2_data[
        s2_data["label"] == 2
    ].copy()

    stress_class_index = list(model.classes_).index(2)

    s2_stress["predicted_stress_probability"] = (
        model.predict_proba(
            s2_stress[FEATURE_COLUMNS]
        )[:, stress_class_index]
    )

    s2_stress["prediction"] = model.predict(
        s2_stress[FEATURE_COLUMNS]
    )

    print(
        s2_stress[
            [
                "window_start_seconds",
                "prediction",
                "predicted_stress_probability",
            ]
        ].sort_values(
            "predicted_stress_probability"
        ).round(3).to_string(index=False)
    )

    # ========================================================
    # 8. MODEL FEATURE IMPORTANCE
    # ========================================================

    print("\n" + "=" * 65)
    print("FEATURE IMPORTANCE IN FOLD 4 MODEL")
    print("=" * 65)

    importance = pd.Series(
        model.feature_importances_,
        index=FEATURE_COLUMNS
    ).sort_values(ascending=False)

    print(importance.round(4))

    # ========================================================
    # 9. FINAL PARTICIPANT SUMMARY
    # ========================================================

    print("\n" + "=" * 65)
    print("PARTICIPANT SUMMARY")
    print("=" * 65)

    print(
        results_df[
            [
                "subject",
                "windows",
                "stress_windows",
                "missed_stress",
                "accuracy",
                "stress_recall",
                "stress_f1",
            ]
        ].round(3).to_string(index=False)
    )

    print("\nANALYSIS COMPLETED.")


if __name__ == "__main__":
    main()

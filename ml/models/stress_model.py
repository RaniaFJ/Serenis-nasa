
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)


# --------------------------------------------------
# 1. PROJECT PATHS
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_FILE = (
    PROJECT_ROOT
    / "ml"
    / "data"
    / "processed"
    / "stress_features.csv"
)

MODEL_DIR = PROJECT_ROOT / "ml" / "saved_models"

MODEL_FILE = MODEL_DIR / "stress_classifier.joblib"


# --------------------------------------------------
# 2. FEATURES USED BY THE MODEL
# --------------------------------------------------

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

LABEL_NAMES = {
    1: "baseline",
    2: "stress",
}


# --------------------------------------------------
# 3. LOAD AND VALIDATE DATA
# --------------------------------------------------

def load_data():

    print("Loading WESAD features...")

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_FILE}"
        )

    df = pd.read_csv(DATA_FILE)

    required_columns = (
        FEATURE_COLUMNS + ["label", "subject"]
    )

    missing_columns = [
        col for col in required_columns
        if col not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing columns: {missing_columns}"
        )

    if df.empty:
        raise ValueError("Dataset is empty.")

    if df[FEATURE_COLUMNS].isna().any().any():
        raise ValueError("Features contain missing values.")

    if not np.isfinite(
        df[FEATURE_COLUMNS].to_numpy()
    ).all():
        raise ValueError("Features contain infinite values.")

    if not set(df["label"].unique()).issubset({1, 2}):
        raise ValueError("Unexpected target labels found.")

    print(f"Dataset loaded: {len(df)} windows")
    print(f"Participants: {df['subject'].nunique()}")

    return df


# --------------------------------------------------
# 4. SPLIT BY PARTICIPANT
# --------------------------------------------------

def split_data(df):

    X = df[FEATURE_COLUMNS]
    y = df["label"]
    groups = df["subject"]

    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=0.20,
        random_state=42
    )

    train_indices, test_indices = next(
        splitter.split(X, y, groups)
    )

    X_train = X.iloc[train_indices]
    X_test = X.iloc[test_indices]

    y_train = y.iloc[train_indices]
    y_test = y.iloc[test_indices]

    train_subjects = sorted(
        groups.iloc[train_indices].unique()
    )

    test_subjects = sorted(
        groups.iloc[test_indices].unique()
    )

    # Make sure no participant appears in both sets
    assert set(train_subjects).isdisjoint(
        set(test_subjects)
    )

    if set(y_train.unique()) != {1, 2}:
        raise ValueError(
            "Training data must contain both classes."
        )

    if set(y_test.unique()) != {1, 2}:
        raise ValueError(
            "Test data must contain both classes. "
            "Try another random_state."
        )

    print("\nTRAINING PARTICIPANTS:")
    print(train_subjects)

    print("\nTEST PARTICIPANTS:")
    print(test_subjects)

    print(f"\nTraining windows: {len(X_train)}")
    print(f"Testing windows: {len(X_test)}")

    return X_train, X_test, y_train, y_test


# --------------------------------------------------
# 5. TRAIN RANDOM FOREST
# --------------------------------------------------

def train_model(X_train, y_train):

    print("\nTraining Random Forest...")

    model = RandomForestClassifier(
        n_estimators=300,
        class_weight="balanced",
        random_state=42,
        min_samples_leaf=2,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    print("Training completed.")

    return model


# --------------------------------------------------
# 6. EVALUATE MODEL
# --------------------------------------------------

def evaluate_model(model, X_test, y_test):

    print("\nEvaluating model...")

    predictions = model.predict(X_test)

    print("\nCLASSIFICATION REPORT:")
    print(
        classification_report(
            y_test,
            predictions,
            labels=[1, 2],
            target_names=["baseline", "stress"],
            zero_division=0
        )
    )

    print("CONFUSION MATRIX:")
    print(
        confusion_matrix(
            y_test,
            predictions,
            labels=[1, 2]
        )
    )

    print("\nADDITIONAL METRICS:")
    print(
        f"Accuracy: "
        f"{accuracy_score(y_test, predictions):.3f}"
    )

    print(
        f"Balanced accuracy: "
        f"{balanced_accuracy_score(y_test, predictions):.3f}"
    )

    print(
        f"Stress precision: "
        f"{precision_score(y_test, predictions, pos_label=2):.3f}"
    )

    print(
        f"Stress recall: "
        f"{recall_score(y_test, predictions, pos_label=2):.3f}"
    )

    print(
        f"Stress F1-score: "
        f"{f1_score(y_test, predictions, pos_label=2):.3f}"
    )

    return predictions


# --------------------------------------------------
# 7. FEATURE IMPORTANCE
# --------------------------------------------------

def show_feature_importance(model):

    importance = pd.DataFrame({
        "feature": FEATURE_COLUMNS,
        "importance": model.feature_importances_
    })

    importance = importance.sort_values(
        by="importance",
        ascending=False
    )

    print("\nFEATURE IMPORTANCE:")
    print(importance.to_string(index=False))


# --------------------------------------------------
# 8. SAVE MODEL
# --------------------------------------------------

def save_model(model):

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    model_package = {
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "label_names": LABEL_NAMES,
        "dataset": "WESAD",
        "window_seconds": 60,
        "sampling_rate": 700,
    }

    joblib.dump(model_package, MODEL_FILE)

    print(f"\nModel saved to: {MODEL_FILE}")


# --------------------------------------------------
# 9. MAIN
# --------------------------------------------------

def main():

    print("=" * 50)
    print("SENTRA - STRESS PATTERN CLASSIFIER")
    print("=" * 50)

    df = load_data()

    X_train, X_test, y_train, y_test = split_data(df)

    model = train_model(X_train, y_train)

    evaluate_model(model, X_test, y_test)

    show_feature_importance(model)

    save_model(model)

    print("\nSTRESS CLASSIFIER PIPELINE COMPLETED.")


if __name__ == "__main__":
    main()

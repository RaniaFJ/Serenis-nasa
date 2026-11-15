
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupKFold

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

STD_FLOOR = 0.01
CALIBRATION_WINDOWS = 5

df = pd.read_csv(DATA_FILE)
df = df.sort_values(
    ["subject", "window_start_seconds"]
).reset_index(drop=True)

# Personal calibration
calibration = (
    df.groupby("subject", group_keys=False)
    .head(CALIBRATION_WINDOWS)
)

if not (calibration["label"] == 1).all():
    raise ValueError("Calibration contains non-baseline windows.")

means = calibration.groupby("subject")[FEATURES].mean()
raw_stds = calibration.groupby("subject")[FEATURES].std()
safe_stds = raw_stds.clip(lower=STD_FLOOR)

# Apply personal Z-score normalization
normalized = df.copy()

for subject, indices in normalized.groupby("subject").groups.items():
    normalized.loc[indices, FEATURES] = (
        normalized.loc[indices, FEATURES] - means.loc[subject]
    ) / safe_stds.loc[subject]

# Remove calibration windows from evaluation
evaluation = normalized.drop(index=calibration.index).copy()
evaluation = evaluation.reset_index(drop=True)

# Reproduce Fold 4
X = evaluation[FEATURES]
y = evaluation["label"]
groups = evaluation["subject"]

cv = GroupKFold(n_splits=5)

for fold, (train_idx, test_idx) in enumerate(
    cv.split(X, y, groups), start=1
):
    if fold == 4:
        X_train = X.iloc[train_idx]
        y_train = y.iloc[train_idx]
        X_test = X.iloc[test_idx]

        train_subjects = groups.iloc[train_idx].unique()
        test_subjects = groups.iloc[test_idx].unique()

        train_df = evaluation.iloc[train_idx]
        test_df = evaluation.iloc[test_idx]
        break

print("=" * 65)
print("SENTRA - S2 PERSONAL Z-SCORE DIAGNOSTIC")
print("=" * 65)

print("\nTraining participants:", sorted(train_subjects))
print("Testing participants:", sorted(test_subjects))

# Calibration statistics for S2
print("\n1. S2 CALIBRATION STATISTICS")
print("-" * 65)

print("\nCalibration means:")
print(means.loc["S2"].round(4).to_string())

print("\nActual calibration standard deviations:")
print(raw_stds.loc["S2"].round(6).to_string())

print("\nStandard deviations after applying the floor:")
print(safe_stds.loc["S2"].round(6).to_string())

floor_features = raw_stds.loc["S2"] < STD_FLOOR

print("\nFeatures affected by the 0.01 floor:")
print(floor_features[floor_features].index.tolist())

# Train the model
model = RandomForestClassifier(
    n_estimators=300,
    class_weight="balanced",
    random_state=42,
    min_samples_leaf=2,
    n_jobs=-1,
)

model.fit(X_train, y_train)

# S2 stress windows
s2_stress = test_df[
    (test_df["subject"] == "S2")
    & (test_df["label"] == 2)
].copy()

s2_positions = s2_stress.index
s2_X = s2_stress[FEATURES]

probabilities = model.predict_proba(s2_X)
stress_column = list(model.classes_).index(2)
stress_probabilities = probabilities[:, stress_column]

s2_stress["stress_probability"] = stress_probabilities
s2_stress["predicted_label"] = model.predict(s2_X)

print("\n2. S2 STRESS WINDOW PREDICTIONS")
print("-" * 65)

print(
    s2_stress[
        [
            "window_start_seconds",
            "stress_probability",
            "predicted_label",
        ]
    ].round(3).to_string(index=False)
)

# Compare normalized stress feature means
print("\n3. NORMALIZED FEATURE COMPARISON")
print("-" * 65)

s2_mean = s2_stress[FEATURES].mean()
training_stress = train_df[train_df["label"] == 2]
training_mean = training_stress[FEATURES].mean()

comparison = pd.DataFrame({
    "S2_stress_mean": s2_mean,
    "training_stress_mean": training_mean,
})

comparison["difference"] = (
    comparison["S2_stress_mean"]
    - comparison["training_stress_mean"]
)

print(comparison.round(3).to_string())

# Model feature importance
print("\n4. MODEL FEATURE IMPORTANCE")
print("-" * 65)

importance = pd.Series(
    model.feature_importances_,
    index=FEATURES,
).sort_values(ascending=False)

print(importance.round(4).to_string())

print("\n5. TRAINING PARTICIPANT EDA DIAGNOSTICS")
print("-" * 65)

eda_features = [
    "eda_mean",
    "eda_std",
    "eda_min",
    "eda_max",
]

# Average normalized stress features for each training participant
participant_eda = (
    train_df[train_df["label"] == 2]
    .groupby("subject")[eda_features]
    .mean()
)

print("\nNormalized EDA means by training participant:")
print(participant_eda.round(3).to_string())

# Inspect the calibration standard deviations
print("\nActual EDA calibration standard deviations:")
print(
    raw_stds.loc[sorted(train_subjects), eda_features]
    .round(6)
    .to_string()
)

print("\nEDA standard deviations after applying the floor:")
print(
    safe_stds.loc[sorted(train_subjects), eda_features]
    .round(6)
    .to_string()
)

# Identify participants with extreme normalized EDA values
print("\nLargest absolute normalized EDA values:")

for feature in eda_features:
    largest = (
        train_df[train_df["label"] == 2]
        .groupby("subject")[feature]
        .mean()
        .abs()
        .sort_values(ascending=False)
        .head(5)
    )

    print(f"\n{feature}:")
    print(largest.round(3).to_string())

# Check the range of normalized training features
print("\nNormalized training feature ranges:")
print(
    train_df[FEATURES]
    .agg(["min", "max", "mean", "std"])
    .round(3)
    .to_string()
)

print("\nDIAGNOSTIC COMPLETED.")

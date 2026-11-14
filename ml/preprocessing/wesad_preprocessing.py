
from pathlib import Path
import argparse
import pickle

import neurokit2 as nk
import numpy as np
import pandas as pd


# Project configuration
PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_DIR = PROJECT_ROOT / "ml" / "data" / "raw" / "WESAD"
OUTPUT_DIR = PROJECT_ROOT / "ml" / "data" / "processed"
OUTPUT_FILE = OUTPUT_DIR / "stress_features.csv"

SAMPLING_RATE = 700
WINDOW_SECONDS = 60
WINDOW_SAMPLES = SAMPLING_RATE * WINDOW_SECONDS

# WESAD labels:
# 1 = Baseline
# 2 = Stress
VALID_LABELS = {
    1: "baseline",
    2: "stress",
}


def extract_features(ecg, eda, temp, acc):
    """Extract physiological features from one 60-second window."""

    # Check that the signals contain valid numerical values
    signals = [ecg, eda, temp, acc]

    if any(not np.isfinite(signal).all() for signal in signals):
        raise ValueError("Signal contains NaN or infinite values")

    if np.std(ecg) == 0:
        raise ValueError("ECG signal is constant")

    # ECG processing and heart rate
    ecg_signals, ecg_info = nk.ecg_process(
        ecg,
        sampling_rate=SAMPLING_RATE
    )

    heart_rate = ecg_signals["ECG_Rate"].dropna()

    if len(heart_rate) == 0:
        raise ValueError("No valid heart-rate values detected")

    # Time-domain HRV features
    hrv = nk.hrv_time(
        ecg_info,
        sampling_rate=SAMPLING_RATE,
        show=False
    )

    # Acceleration magnitude
    acc_magnitude = np.sqrt(np.sum(acc ** 2, axis=1))

    return {
        "heart_rate_mean": float(heart_rate.mean()),
        "heart_rate_std": float(heart_rate.std()),
        "hrv_rmssd": float(hrv["HRV_RMSSD"].iloc[0]),
        "hrv_sdnn": float(hrv["HRV_SDNN"].iloc[0]),

        "eda_mean": float(np.mean(eda)),
        "eda_std": float(np.std(eda)),
        "eda_min": float(np.min(eda)),
        "eda_max": float(np.max(eda)),

        "temperature_mean": float(np.mean(temp)),
        "temperature_std": float(np.std(temp)),

        "acc_magnitude_mean": float(np.mean(acc_magnitude)),
        "acc_magnitude_std": float(np.std(acc_magnitude)),
    }


def process_subject(subject_file):
    """Process one participant's WESAD recording."""

    subject = subject_file.stem
    print(f"\nProcessing {subject}...")

    with open(subject_file, "rb") as file:
        data = pickle.load(file, encoding="latin1")

    chest = data["signal"]["chest"]
    labels = np.asarray(data["label"]).flatten()

    ecg = np.asarray(chest["ECG"]).flatten()
    eda = np.asarray(chest["EDA"]).flatten()
    temp = np.asarray(chest["Temp"]).flatten()
    acc = np.asarray(chest["ACC"])

    # Verify that all signals have matching lengths
    lengths = [
        len(labels),
        len(ecg),
        len(eda),
        len(temp),
        len(acc),
    ]

    if len(set(lengths)) != 1:
        raise ValueError(f"{subject}: signal lengths do not match")

    rows = []
    skipped_labels = 0
    failed_windows = 0

    total_windows = len(labels) // WINDOW_SAMPLES

    for window_index in range(total_windows):

        start = window_index * WINDOW_SAMPLES
        end = start + WINDOW_SAMPLES

        window_labels = labels[start:end]

        # Keep only windows with one consistent valid label
        unique_labels = np.unique(window_labels)

        if len(unique_labels) != 1:
            skipped_labels += 1
            continue

        label = int(unique_labels[0])

        if label not in VALID_LABELS:
            skipped_labels += 1
            continue

        try:
            features = extract_features(
                ecg[start:end],
                eda[start:end],
                temp[start:end],
                acc[start:end]
            )

            row = {
                "subject": subject,
                "window_start_seconds": start / SAMPLING_RATE,
                "label": label,
                "label_name": VALID_LABELS[label],
            }

            row.update(features)
            rows.append(row)

        except Exception:
            failed_windows += 1

    print(f"  Valid windows: {len(rows)}")
    print(f"  Skipped mixed/unsupported labels: {skipped_labels}")
    print(f"  Failed signal windows: {failed_windows}")

    return rows


def main():
    parser = argparse.ArgumentParser(
        description="Extract stress features from WESAD"
    )

    parser.add_argument(
        "--subjects",
        nargs="*",
        default=None,
        help="Participant IDs, for example: S2 S3"
    )

    args = parser.parse_args()

    subject_files = sorted(DATA_DIR.glob("S*/S*.pkl"))

    if args.subjects:
        selected = set(args.subjects)
        subject_files = [
            file for file in subject_files
            if file.stem in selected
        ]

    if not subject_files:
        raise FileNotFoundError(
            "No matching WESAD participant files were found."
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_rows = []

    for subject_file in subject_files:
        rows = process_subject(subject_file)
        all_rows.extend(rows)

    if not all_rows:
        raise RuntimeError(
            "No valid windows were extracted. Check the dataset and logs."
        )

    df = pd.DataFrame(all_rows)

    df.to_csv(OUTPUT_FILE, index=False)

    print("\nPREPROCESSING COMPLETED")
    print(f"Output: {OUTPUT_FILE}")
    print(f"Total windows: {len(df)}")

    print("\nClass distribution:")
    print(df["label_name"].value_counts())

    print("\nParticipants:")
    print(df["subject"].nunique())


if __name__ == "__main__":
    main()


from pathlib import Path
import pickle

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_DIR = PROJECT_ROOT / "ml" / "data" / "raw" / "WESAD"

SAMPLING_RATE = 700
WINDOW_SECONDS = 60
WINDOW_SIZE = SAMPLING_RATE * WINDOW_SECONDS


def load_participant(file_path):

    with open(file_path, "rb") as file:
        data = pickle.load(file, encoding="latin1")

    temperature = np.asarray(
        data["signal"]["chest"]["Temp"]
    ).reshape(-1)

    labels = np.asarray(data["label"]).reshape(-1)

    return temperature, labels


def extract_temperature_windows(subject, temperature, labels):

    results = []

    usable_length = min(len(temperature), len(labels))

    number_of_windows = usable_length // WINDOW_SIZE

    for window_index in range(number_of_windows):

        start = window_index * WINDOW_SIZE
        end = start + WINDOW_SIZE

        temp_window = temperature[start:end]
        label_window = labels[start:end]

        if len(temp_window) != WINDOW_SIZE:
            continue

        unique_labels, counts = np.unique(
            label_window,
            return_counts=True
        )

        majority_label = unique_labels[np.argmax(counts)]

        # Keep only completely consistent baseline/stress windows.
        if majority_label not in [1, 2]:
            continue

        if np.mean(label_window == majority_label) != 1.0:
            continue

        results.append({
            "subject": subject,
            "window_start_seconds": start / SAMPLING_RATE,
            "label": int(majority_label),
            "label_name": (
                "baseline" if majority_label == 1 else "stress"
            ),
            "temperature_mean": np.mean(temp_window),
            "temperature_std": np.std(temp_window),
            "temperature_min": np.min(temp_window),
            "temperature_max": np.max(temp_window),
        })

    return results


def main():

    print("=" * 65)
    print("SENTRA - RAW WESAD TEMPERATURE INVESTIGATION")
    print("=" * 65)

    files = sorted(DATA_DIR.glob("S*/S*.pkl"))

    if not files:
        raise FileNotFoundError(
            f"No WESAD participant files found in {DATA_DIR}"
        )

    all_results = []

    for file_path in files:

        subject = file_path.stem

        temperature, labels = load_participant(file_path)

        windows = extract_temperature_windows(
            subject,
            temperature,
            labels
        )

        all_results.extend(windows)

        print(f"\n{subject}")
        print("Raw temperature samples:", len(temperature))
        print("Raw temperature min:", round(np.min(temperature), 3))
        print("Raw temperature max:", round(np.max(temperature), 3))
        print("Raw temperature mean:", round(np.mean(temperature), 3))
        print("Accepted windows:", len(windows))

    df = pd.DataFrame(all_results)

    print("\n" + "=" * 65)
    print("TEMPERATURE SUMMARY BY PARTICIPANT AND LABEL")
    print("=" * 65)

    summary = (
        df.groupby(["subject", "label_name"])
        .agg(
            windows=("temperature_mean", "count"),
            mean_temperature=("temperature_mean", "mean"),
            mean_window_std=("temperature_std", "mean"),
            minimum=("temperature_min", "min"),
            maximum=("temperature_max", "max"),
        )
        .round(3)
    )

    print(summary.to_string())

    print("\n" + "=" * 65)
    print("S2 INDIVIDUAL TEMPERATURE WINDOWS")
    print("=" * 65)

    s2 = df[df["subject"] == "S2"].copy()

    print(
        s2[
            [
                "window_start_seconds",
                "label_name",
                "temperature_mean",
                "temperature_std",
                "temperature_min",
                "temperature_max",
            ]
        ].round(3).to_string(index=False)
    )

    print("\n" + "=" * 65)
    print("S2 RAW TEMPERATURE QUANTILES")
    print("=" * 65)

    s2_temperature, _ = load_participant(
        DATA_DIR / "S2" / "S2.pkl"
    )

    print(
        pd.Series(s2_temperature).quantile(
            [0, 0.01, 0.05, 0.25, 0.50, 0.75, 0.95, 0.99, 1]
        ).round(3)
    )

    print("\nTEMPERATURE INVESTIGATION COMPLETED.")


if __name__ == "__main__":
    main()

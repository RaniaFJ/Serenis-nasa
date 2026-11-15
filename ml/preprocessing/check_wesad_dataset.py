import pickle
from pathlib import Path
import numpy as np

DATA_DIR = Path("ml/data/raw/WESAD")

subjects = sorted(
    DATA_DIR.glob("S*/S*.pkl"),
    key=lambda p: int(p.parent.name[1:])
)

print("=" * 65)
print("WESAD - COMPLETE DATASET VALIDATION")
print("=" * 65)

expected_chest = ["ACC", "ECG", "EMG", "EDA", "Temp", "Resp"]
expected_wrist = ["ACC", "BVP", "EDA", "TEMP"]

for path in subjects:
    with path.open("rb") as f:
        data = pickle.load(f, encoding="latin1")

    labels = np.asarray(data["label"]).flatten()

    print(f"\n{path.parent.name}")
    print("-" * 40)

    for device, expected in [
        ("chest", expected_chest),
        ("wrist", expected_wrist)
    ]:
        signals = data["signal"][device]

        missing = [s for s in expected if s not in signals]

        print(f"{device.upper()}:")

        for name in expected:
            if name in signals:
                arr = np.asarray(signals[name])
                print(f"  {name:8s} {arr.shape}")

        if missing:
            print("  MISSING:", missing)

    unique, counts = np.unique(labels, return_counts=True)
    print("Labels:", dict(zip(unique.tolist(), counts.tolist())))
    print("Total label samples:", len(labels))

print("\n" + "=" * 65)
print(f"VALIDATION COMPLETED: {len(subjects)} participants found")
print("=" * 65)

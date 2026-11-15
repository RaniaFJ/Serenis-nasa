import pickle
from pathlib import Path
from collections import Counter
import numpy as np

file_path = Path("ml/data/raw/WESAD/S2/S2.pkl")

print("=" * 60)
print("WESAD - PARTICIPANT S2 INSPECTION")
print("=" * 60)

with file_path.open("rb") as file:
    data = pickle.load(file, encoding="latin1")

print("\n1. MAIN DATA STRUCTURE")
print("Keys:", list(data.keys()))

print("\n2. SENSOR SIGNALS")

for device in ["chest", "wrist"]:
    print(f"\n{device.upper()} DEVICE")

    signals = data["signal"][device]

    for name, values in signals.items():
        array = np.asarray(values)
        print(
            f"{name:10s} | shape: {str(array.shape):18s} "
            f"| dtype: {array.dtype}"
        )

print("\n3. LABEL INFORMATION")

labels = np.asarray(data["label"]).flatten()
unique_labels, counts = np.unique(labels, return_counts=True)

for label, count in zip(unique_labels, counts):
    print(f"Label {label}: {count:,} samples")

print("\nTotal label samples:", len(labels))

print("\n4. SELF-REPORT INFORMATION")

if "questionnaire" in data:
    print("Questionnaire data is available.")
    print("Questionnaire keys:", list(data["questionnaire"].keys()))
else:
    print("No questionnaire key found at the top level.")

print("\n" + "=" * 60)
print("INSPECTION COMPLETED")
print("=" * 60)

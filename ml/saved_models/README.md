# SENTRA - Trained Stress Model

The trained model file is intentionally not committed to Git.

Expected file:
stress_classifier_personal_zscore.joblib

To generate it locally:

1. Obtain the WESAD dataset from its official source.
2. Follow the preprocessing instructions in ml/preprocessing/.
3. Run from the repository root:

   python ml/models/train_final_stress_model.py

4. Verify that the model is generated in:

   ml/saved_models/stress_classifier_personal_zscore.joblib

5. Build the API:

   docker compose build api

Dataset:
WESAD - Wearable Stress and Affect Detection.

The model is experimental and is not validated for astronaut
health assessment. Review the WESAD license before using or
redistributing the dataset or derived artifacts.

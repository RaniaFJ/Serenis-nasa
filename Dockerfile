FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app/Backend

COPY Backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY Backend/app ./app
COPY ml/saved_models/stress_classifier_personal_zscore.joblib /app/ml/saved_models/stress_classifier_personal_zscore.joblib

COPY ml/risk_engine ./ml/risk_engine

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

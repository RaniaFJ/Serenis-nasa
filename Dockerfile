FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/Backend

COPY Backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY Backend/app ./app
COPY ml/risk_engine ./ml/risk_engine
# Dossier du modèle IA (le fichier .joblib est optionnel : sans lui, seule /ai/stress/predict est désactivée)
COPY ml/saved_models /app/ml/saved_models

# Utilisateur sans privilèges
RUN useradd --system --no-create-home sentra
USER sentra

EXPOSE 8000
# --proxy-headers : l'audit_log enregistre la vraie IP du client (transmise par nginx) et non celle du conteneur nginx
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]

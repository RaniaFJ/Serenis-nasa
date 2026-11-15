# API SENTRA (backend FastAPI) — routes actuelles

Documentation interactive : http://localhost:8000/docs (Docker : le port 8000 n'est ouvert que sur ta machine).
Toutes les routes, sauf `/health` et `/auth/login`, exigent `Authorization: Bearer <jeton>`.

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/health` | l'API répond |
| POST | `/auth/login` | `{astronaut_id, passcode}` → jeton JWT (24 h) |
| POST | `/auth/logout` | trace la déconnexion dans l'audit |
| GET | `/me` | profil de l'astronaute connecté |
| GET | `/vitals/indicators` | les 11 indicateurs : plages normales, plages d'alerte, comment mesurer, pourquoi, effet en vol |
| GET | `/vitals/status/latest` | dernière mesure de chaque indicateur + état (green / yellow / red) calculé **par la base** |
| GET | `/vitals/measurements?indicator_id=&limit=` | historique (utilisé par les courbes) |
| POST | `/vitals/measurements` | `{indicator_id, value, source, note?, measured_at?}` ; la base refuse les valeurs impossibles (422) et crée l'alerte si besoin |
| GET | `/vitals/alerts?resolved=` | alertes générées par la base |
| PATCH | `/vitals/alerts/{id}/resolve` | marque une alerte comme traitée |
| GET | `/vitals/recommendations` | actions recommandées par indicateur / sens / gravité |
| GET | `/api/gamification/...` | tâches, XP, séries |
| POST | `/ai/stress/predict` | stress (modèle WESAD ; 503 tant que le fichier du modèle n'existe pas) |
| POST | `/ai/cardiovascular/analyze` | écart par rapport à la ligne de base personnelle (15 fenêtres) |
| POST | `/ai/sleep/analyze` | analyse du sommeil |
| POST | `/ai/health/assess` | évaluation globale à partir des composantes précédentes |

## Correspondance base ↔ interface (frontend/src/api/client.js)

- SBP + DBP (2 indicateurs en base) = « Tension artérielle » à l'écran ; la saisie envoie deux mesures.
- green / yellow / red = normal / à surveiller / alerte.
- Aptitude : « NO-GO » s'il y a une alerte, « GO sous surveillance » s'il y a un à-surveiller, sinon « GO ».
- Les textes d'alerte et de conseil viennent de la base (en anglais).

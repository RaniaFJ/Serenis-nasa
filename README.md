# SENTRA — suivi de santé autonome pour astronautes

NASA Space Apps Challenge 2026 · défi « Create Health Monitoring Software for Astronauts on Space Missions »

Sur Mars, une réponse de la Terre peut mettre 3 à 22 minutes. SENTRA permet à l'astronaute de s'évaluer **seul** : 10 indicateurs
de santé, un verdict GO / NO-GO, des conseils d'action, des alertes calculées par la base de données, et un corps humain en 3D
relié aux risques de vol de la NASA. La sécurité (rôles de base de données, sécurité par ligne, journal d'audit infalsifiable) fait
partie de l'architecture, pas d'un ajout de dernière minute.

```
Navigateur ──► nginx (interface React, :8080) ──/api──► FastAPI (:8000) ──► PostgreSQL 16
                 CSP stricte                              JWT, validation        RLS, audit_log, alertes
                                                          modules IA (ml/)       rôle restreint astro_login
```

## Lancer le projet (Windows, avec Docker Desktop)

1. Installer et **démarrer** Docker Desktop (attendre que l'icône soit verte).
2. Dans PowerShell, dans le dossier du projet (celui qui contient `compose.yaml`) :

```powershell
.\setup.ps1
docker compose up --build
```

3. Ouvrir **http://localhost:8080**. Connexion : n° d'astronaute `1`, code d'accès `APOLLO2026`.

`setup.ps1` crée le fichier `.env` avec des mots de passe aléatoires (il ne l'écrase jamais). Si PowerShell refuse le script :
`powershell -ExecutionPolicy Bypass -File .\setup.ps1`. Sous Linux / macOS : `./setup.sh`.

Le premier lancement prend quelques minutes (téléchargement et compilation). Ensuite : `docker compose up`.
Arrêter : `Ctrl+C`, puis `docker compose down`. **Repartir d'une base vierge** : `docker compose down -v` (les scripts SQL ne
s'exécutent qu'à la création du volume : si tu modifies le SQL ou les mots de passe, il faut ce `-v`).

## Vérifier que tout marche (2 minutes)

| Test | Résultat attendu |
|---|---|
| http://localhost:8000/health | `{"status":"ok"}` |
| http://localhost:8000/docs | documentation interactive de l'API |
| Connexion avec un mauvais code | « Identifiants incorrects » (et la tentative apparaît dans `audit_log`) |
| Saisir un sommeil de 5 h | alerte rouge « Report to flight surgeon… », verdict NO-GO |
| Saisir une tension systolique de 999 | refus : « Invalid value 999 for SBP (plausible range 40 to 300) » (c'est la **base** qui refuse) |
| Onglet « Corps humain » | silhouette 3D qui tourne, repères colorés cliquables |

Voir les traces de sécurité directement dans la base :
```powershell
docker compose exec db psql -U postgres -d SENTRA_APP -c "SELECT * FROM astro.audit_log ORDER BY 1 DESC LIMIT 10;"
```

## Sans Docker (développement)

- **Interface seule, fausse API** (aucun backend) : `cd frontend`, `npm install`, `Copy-Item .env.example .env.local`, `npm run dev`
  → http://localhost:5173 (comptes de démo affichés sur l'écran de connexion).
- **Interface + vrai backend** : lancer la base (`docker compose up db`), puis l'API :
  ```powershell
  cd Backend
  python -m venv .venv ; .\.venv\Scripts\Activate.ps1 ; pip install -r requirements.txt
  $env:PYTHONPATH = ".."                       # pour que le dossier ml/ soit trouvé
  $env:DATABASE_URL = "postgresql://astro_login:<ASTRO_LOGIN_PASSWORD du .env>@localhost:5432/SENTRA_APP"
  $env:JWT_SECRET = "<JWT_SECRET du .env>" ; $env:DEMO_PASSCODE = "APOLLO2026"
  uvicorn app.main:app --reload --port 8000
  ```
  (pour joindre la base depuis ta machine, ajouter `ports: ["127.0.0.1:5432:5432"]` au service `db` de `compose.yaml`),
  puis `cd frontend`, mettre `VITE_USE_MOCK=false` dans `.env.local`, `npm run dev`.

## Contenu du dépôt

```
compose.yaml            base + API + interface
Dockerfile              image de l'API
setup.ps1 / setup.sh    génèrent .env (secrets aléatoires)
Backend/app/            API FastAPI (auth, vitals, gamification, ai)
Backend/BD/             schéma PostgreSQL complet (tables, RLS, audit, vues, déclencheurs, données de départ)
docker/postgres/init/   création du rôle astro_login (avant / après le schéma)
ml/                     pipeline IA (WESAD) et moteur de risque
frontend/               interface React (design, corps 3D, adaptateur API)
docs/                   API.md (routes), SECURITY.md (sécurité), API_CONTRACT_FUTUR.md (feuille de route)
```

## Intelligence artificielle

Le modèle de stress (forêt aléatoire entraîné sur le jeu de données public WESAD) n'est pas dans Git (licence du jeu de données).
Sans lui, tout fonctionne ; seule la route `/ai/stress/predict` répond 503. Pour le générer : voir `ml/saved_models/README.md`.
Les routes sommeil, cardiovasculaire et évaluation globale n'ont pas besoin du modèle. Résultats expérimentaux, pas un outil médical.

## Statut honnête (à connaître avant la présentation)

- **Fonctionne de bout en bout** : connexion, 10 indicateurs, historique et courbes, alertes et recommandations venant de la base, saisie validée par la base, audit des connexions, corps 3D, français / anglais, mobile.
- **Présent dans l'interface de démo seulement** (pas encore de routes backend) : chaîne de hachage des mesures, simulation d'attaque, journal de sécurité visible, rôles médecin de vol / commandant, liaison Terre avec délai. Ces onglets sont masqués avec le vrai backend. Spécification : `docs/API_CONTRACT_FUTUR.md`. Pour les montrer au jury : lancer l'interface en mode démo (`VITE_USE_MOCK=true`).
- Limites de sécurité et pistes d'amélioration : `docs/SECURITY.md`.
- Le build Docker a été vérifié étape par étape (base, API, interface) mais pas avec Docker lui-même dans l'environnement où le projet a été préparé : si une étape échoue chez toi, copie le message d'erreur complet.

## Mettre le projet sur GitHub

```powershell
git clone https://github.com/RaniaFJ/Serenis-nasa.git
cd Serenis-nasa
git checkout -b integration
```
Copier le **contenu** de ce dossier (`compose.yaml`, `Backend`, `frontend`…) dans `Serenis-nasa`, en acceptant de remplacer, puis :
```powershell
git status                      # vérifier : aucun .env, aucun node_modules
git add -A
git commit -m "Projet complet : interface, API, base, IA, Docker"
git push -u origin integration
```
Puis sur GitHub : « Compare & pull request » → relire → « Merge ». Le `.gitignore` empêche de commiter `.env`.

**Important** : la branche `backend` contient un `Backend/.env` commité avec un `JWT_SECRET`. Même supprimé, il reste dans l'historique : le dépôt est public, donc considérer ce secret comme compromis (il ne sert plus ici : `setup.ps1` en génère un nouveau).

## Équipe

Interface, design, intégration, sécurité applicative : ABDALLI Fatima · Backend et base de données, IA / ML : équipe SENTRA (voir l'historique Git de chaque branche).

# Contrat d'API des fonctions PAS ENCORE implémentées (feuille de route)

Les routes actuelles du backend sont décrites dans `docs/API.md`. Ce document garde la spécification des routes que le front
sait déjà afficher en mode démo (`VITE_USE_MOCK=true`) mais que le backend n'a pas encore : intégrité par chaîne de hachage,
résumé « liaison Terre », journal de sécurité, rôles médecin de vol / commandant. Pour les activer côté front, passer les
drapeaux correspondants à `true` dans `CAPS` (frontend/src/api/client.js) et écrire l'adaptateur.

Si une réponse du backend diffère de ce qui est écrit ici, **c'est le backend qui doit s'aligner** (ou ce document qui doit être mis à jour et le front prévenu).

## Conventions

- **URL de base vue par le navigateur** : `/api`. Vite (dev) ou nginx (Docker) retire le préfixe `/api` et relaie vers `http://backend:8000`. Côté FastAPI, les routes s'écrivent donc **sans** `/api` (ex. `@app.get("/status")`).
- **Format** : JSON partout. Dates `YYYY-MM-DD`, horodatages ISO 8601 (`2026-11-14T08:00:00.000Z`).
- **Authentification** : `POST /auth/login` renvoie un jeton JWT ; ensuite `Authorization: Bearer <token>` sur chaque appel.
- **Langue** : `?lang=fr` ou `?lang=en` sur les routes qui renvoient des textes (`/status`, `/advice`, `/ground/summary`).
- **Erreurs** : statut HTTP + corps `{"detail": "message lisible"}` (format FastAPI par défaut).
  - `401` : jeton absent, invalide ou expiré → le front ramène à l'écran de connexion.
  - `403` : rôle non autorisé pour cette route.
  - `422` : donnée invalide (hors plage, date future…).
- **CORS** : inutile tant que le front passe par `/api`. Si vous appelez le backend directement depuis un autre port, activez `CORSMiddleware`.
- **Les rôles se vérifient dans le backend.** Le front masque des onglets par confort, mais ce n'est pas une protection.

## Rôles

| Rôle (`role`) | Compte de démo (mock) | Ce qu'il peut appeler |
|---|---|---|
| `astronaut` | `astro` / `astro123` | Tout |
| `flight_surgeon` | `surgeon` / `surgeon123` | `GET /ground/summary` uniquement (statuts, **jamais** de valeurs brutes) |
| `commander` | `commander` / `cmd123` | `GET /ground/summary` uniquement (**aptitude seulement**) |

## Routes

### `POST /auth/login`
Requête : `{ "username": "astro", "password": "astro123" }`
Réponse `200` : `{ "token": "<jwt>", "role": "astronaut", "name": "Astronaut" }`
Erreur : `401` si identifiants incorrects.

### `GET /status?lang=fr` — astronaute
État courant de chaque indicateur, alertes et aptitude.
```json
{
  "fitness": "unfit",
  "indicators": [
    {
      "indicator": "sleep",
      "label": "Sommeil",
      "unit": "h",
      "decimals": 1,
      "latest": { "id": 208, "date": "2026-11-13", "value": 4.8, "value2": null },
      "status": "alert",
      "trend": "down",
      "thresholds": { "normal": [7, 9], "watch": [5, 10] }
    }
  ],
  "alerts": [
    {
      "id": "trend-behavioral",
      "level": "alert",
      "title": "Risque comportemental (tendance sur 3 jours)",
      "detail": "Sommeil insuffisant et humeur en baisse depuis 3 jours : …",
      "indicators": ["sleep", "mood"]
    }
  ]
}
```
- `indicator` ∈ `heart_rate`, `blood_pressure`, `glucose`, `temperature`, `sleep`, `mood`, `exercise`.
- `status` / `level` ∈ `normal` | `watch` | `alert` (| `nodata` si aucune mesure).
- `trend` ∈ `up` | `down` | `flat` (dernière valeur comparée à la moyenne des 3 précédentes, seuil ±3 %).
- `fitness` ∈ `fit` (aucune alerte) | `watch` (au moins un « à surveiller ») | `unfit` (au moins une alerte).
- `latest` vaut `null` s'il n'y a aucune mesure. Pour `blood_pressure`, `value` = systolique et `value2` = diastolique ; sinon `value2` = `null`.
- `thresholds` sert au front à dessiner la zone normale des graphiques (pour la tension : seuils de la systolique).
- Les alertes sont **triées** (alertes d'abord) et incluent les règles de **tendance sur 3 jours** (voir plus bas).

### `GET /measures?indicator=sleep` — astronaute
Historique dans l'ordre de la chaîne (`id` croissant). Sans `indicator` : toutes les mesures.
```json
[
  {
    "id": 208, "date": "2026-11-13", "indicator": "sleep", "value": 4.8, "value2": null,
    "unit": "h", "ts": "2026-11-13T08:04:00.000Z",
    "prev_hash": "9abac192da…", "hash": "7862cd0c0b…", "status": "alert"
  }
]
```
`hash` et `prev_hash` (hex, 64 caractères) sont **obligatoires** : le front les affiche dans le panneau Sécurité.

### `POST /measures` — astronaute
Requête :
```json
{ "date": "2026-11-14", "indicator": "blood_pressure", "value": 128, "value2": 84, "unit": "mmHg" }
```
Le backend doit **valider** (Pydantic), **chiffrer** la valeur avant de l'écrire en base, **chaîner** (`prev_hash` = hash de la mesure précédente) et **signer**. Réponse `200` : la mesure créée (même format que ci-dessus, avec `status`).

Plages acceptées (sinon `422`) : fréquence cardiaque 20–250, tension systolique 50–260 (diastolique 30 et < systolique), glycémie 20–600, température 30–45, sommeil 0–24, humeur 1–5, exercice 0–600. Date au format `YYYY-MM-DD`, pas dans le futur.

### `GET /advice/{indicator}?lang=fr` — astronaute
```json
{
  "indicator": "sleep",
  "label": "Sommeil",
  "unit": "h",
  "how_to_measure": "Notez le nombre d'heures dormies…",
  "why": "Le travail intense et les horloges biologiques perturbées…",
  "hazard": "Sommeil inadéquat et horaires irréguliers",
  "actions": { "normal": "…", "watch": "…", "alert": "…" },
  "ranges": { "normal": [7, 9], "watch": [5, 10] }
}
```
`404` si l'indicateur est inconnu. Les textes de référence sont dans `frontend/src/api/mockRules.js` (constante `ADVICE`) : copiez-les dans un fichier JSON côté backend.

### `GET /ground/summary?env=mars&lang=fr` — tous les rôles
`env` ∈ `iss` | `moon` | `mars` (délais simulés : 0,6 s, 1,3 s, 720 s). Chaque appel incrémente `seq` (anti-rejeu).
```json
{
  "env": "mars", "seq": 4, "delay_seconds": 720,
  "generated_at": "2026-11-14T12:18:37.000Z", "received_at": "2026-11-14T12:30:37.000Z",
  "encrypted": true, "signature_valid": true, "payload_hash": "8251ccacc3bcab1e429e…",
  "fitness": "unfit",
  "indicators": [ { "indicator": "sleep", "label": "Sommeil", "status": "alert", "trend": "down" } ],
  "alerts": [ { "level": "alert", "title": "Risque comportemental (tendance sur 3 jours)" } ]
}
```
- **`flight_surgeon`** : reçoit `indicators` (statuts, sans valeurs) et `alerts` (titres seuls).
- **`commander`** : reçoit seulement les champs d'en-tête + `fitness` (**pas** de `indicators` ni `alerts`).
- `signature_valid` : résultat de la vérification de la signature du paquet et de la chaîne.

### `GET /integrity/verify` — astronaute
Recalcule toute la chaîne.
```json
{ "valid": false, "broken_at": 208, "checked": 210 }
```
`broken_at` = `id` de la **première** mesure incohérente (hash recalculé ≠ hash stocké, ou `prev_hash` ≠ hash de la précédente), sinon `null`. Le front appelle cette route à chaque rafraîchissement et affiche un bandeau rouge si `valid` est `false`.

### `GET /security/events` — astronaute
Journal d'audit, du plus récent au plus ancien.
```json
[ { "ts": "2026-11-14T12:17:25.000Z", "type": "attack_tamper", "severity": "critical", "detail": "…" } ]
```
`severity` ∈ `info` | `warn` | `critical`. Types utilisés par le front : `login`, `measure_added`, `integrity_check`, `ground_send`, `attack_tamper`, `replay_rejected`, `reset`. Journaliser aussi les accès refusés (403).

### Routes de démonstration (désactivables en production)
- `POST /demo/attack` avec `{ "type": "tamper" }` : modifie la dernière valeur de sommeil **sans recalculer le hash** (réponse : `{ "ok": true, "detail": "…" }`). Le front doit ensuite voir `valid: false`.
- `POST /demo/attack` avec `{ "type": "replay" }` : renvoie un ancien paquet vers la liaison sol ; il doit être **rejeté** (numéro de séquence déjà traité) → `{ "ok": true, "rejected": true, "detail": "…" }` et un événement `replay_rejected`.
- `POST /demo/reset` : recrée les 30 jours de données simulées (graine fixe). Réponse : `{ "ok": true }`.

## Règles de santé (à reproduire dans `backend/rules.py`)

Valeurs de référence **indicatives**, à faire valider par un professionnel avant tout usage réel.

| Indicateur | Normal | À surveiller | Alerte |
|---|---|---|---|
| Fréquence cardiaque (bpm) | 60–100 | 50–59 ou 101–110 | < 50 ou > 110 |
| Tension (mmHg) | sys < 120 **et** dia < 80 | entre les deux | sys ≥ 140 **ou** dia ≥ 90 **ou** sys < 90 **ou** dia < 55 |
| Glycémie à jeun (mg/dL) | 70–99 | 100–125 | < 70 ou > 125 |
| Température (°C) | 36,1–37,2 | 35,5–36,0 ou 37,3–37,9 | < 35,5 ou > 37,9 |
| Sommeil (h) | 7–9 | 5–6,9 ou 9,1–10 | < 5 ou > 10 |
| Humeur (1–5) | 4–5 | 3 | 1–2 |
| Exercice (min/jour) | ≥ 60 | 30–59 | < 30 |

Règles de **tendance** (moyenne des valeurs journalières sur les 3 derniers jours) :
- **Risque comportemental** (niveau `alert`) : sommeil moyen < 7 h **et** humeur moyenne ≤ 3,5.
- **Tension cardiovasculaire** (niveau `watch`) : fréquence cardiaque moyenne > 90 bpm **ou** systolique moyenne ≥ 130.

## Chaîne d'intégrité (recommandation)

Pour chaque mesure : `hash = SHA-256(id | date | indicator | value | value2 | unit | ts | prev_hash)`. La première mesure a `prev_hash = "0" × 64`. Le mock utilise exactement ce schéma (voir `canonical()` dans `mock.js`) ; le backend peut y ajouter une signature Ed25519 sur `hash` et le chiffrement AES-GCM des valeurs au repos, sans changer le format JSON ci-dessus.


---

## Correspondance avec la base PostgreSQL (`db/01_astro_health_pg_full.sql`)

Le front est écrit pour ce contrat, **pas pour les tables**. Le backend doit donc traduire. Écarts à traiter (testés sur la vraie base) :

| Sujet | Base de données | Contrat / front | À faire côté backend |
|---|---|---|---|
| États | `green` / `yellow` / `red` | `normal` / `watch` / `alert` | Convertir (`green→normal`, `yellow→watch`, `red→alert`) |
| Indicateurs | 11 : `HR, SBP, DBP, GLU, TEMP, SLEEP, MOOD, STRESS, SPO2, RAD, EXER` | 7 : `heart_rate, blood_pressure, glucose, temperature, sleep, mood, exercise` | Table de correspondance `code → indicator` ; **fusionner SBP + DBP** en `blood_pressure` (`value` = SBP, `value2` = DBP). Le front ignore pour l'instant `STRESS`, `SPO2`, `RAD` |
| Humeur | échelle 1–10, normal 6–10 | échelle 1–5 | Choisir une échelle commune (voir ci-dessous) |
| Seuils | `indicators` + surcharge par environnement (`indicator_env_thresholds`) | tableau de `mockRules.js` | **La base fait foi** : renvoyer ses seuils dans `thresholds` |
| Dates | `measured_at` (timestamptz) | `date` (YYYY-MM-DD) | Convertir en entrée et en sortie |
| Textes de conseil | `recommendations` (action par indicateur, direction `low/high`, gravité) | `/advice` (comment mesurer, pourquoi, danger, actions) | `how_to_measure`, `why_it_matters`, `space_effect` viennent de `indicators` ; l'action vient de `recommendations`. Le texte est en anglais : traduire ou accepter l'anglais |
| Alertes | table `alerts` remplie par trigger | `/status.alerts` | Lire `alerts` ; les **règles de tendance sur 3 jours** n'existent pas en base, à coder dans le backend |
| Mesures | **pas de `hash`, `prev_hash` ni signature** | `GET /measures` doit les renvoyer | **Ajouter ces colonnes** à `measurements` (voir ci-dessous) |
| Connexion | **aucune table d'utilisateurs, de mots de passe ni de rôles** | `/auth/login`, rôles `astronaut`, `flight_surgeon`, `commander` | **Ajouter une table `users`** (`username`, `password_hash`, `role`, `astronaut_id`) |
| Journal d'audit | `event_type` en majuscules (`LOGIN_SUCCESS`, `INSERT`…), `success`, `details` | `type` en minuscules + `severity` `info/warn/critical` | Convertir (ex. `LOGIN_FAILURE`/`ACCESS_DENIED` → `warn`, `UPDATE measurements` → `critical`) |

### Règles de sécurité à respecter côté backend (vérifiées sur la base)

1. **Un seul astronaute par requête, dans une transaction** : `BEGIN; SELECT set_config('app.astronaut_id', '<id>', true); … COMMIT;`. Le `true` limite la valeur à la transaction. Un simple `SET app.astronaut_id = …` reste actif sur la connexion et **fuit vers la requête suivante** si les connexions sont réutilisées (pool) : l'astronaute suivant verrait les données du précédent. Sans `app.astronaut_id`, la base ne renvoie rien (testé : 0 ligne).
2. Faire de même pour `app.client_ip` et `app.user_agent`, sinon le journal d'audit n'a ni IP ni acteur.
3. Le backend se connecte avec **`astro_login`** (droits `astro_app`). Il peut lire et insérer des mesures mais **ne peut pas les modifier** (testé : `permission denied`). La route `/security/events` utilise **`astro_audit_login`** (`AUDIT_DATABASE_URL`), seul compte autorisé à lire `audit_log` et les vues `v_sec_*`.
4. Appeler `astro.log_app_event(...)` pour les connexions réussies ou ratées (`LOGIN_SUCCESS`, `LOGIN_FAILURE`), les refus (`ACCESS_DENIED`) et les actions importantes. Six échecs de connexion depuis la même IP font apparaître la vue `v_sec_bruteforce` (testé).

### Chaîne d'intégrité et démo d'attaque avec cette base

- Le journal d'audit est immuable (testé : même le superuser ne peut pas le modifier), mais **les mesures ne sont pas chaînées**. Ajoutez à `measurements` les colonnes `prev_hash TEXT` et `hash TEXT` (et `signature` si Ed25519), calculées par le backend à l'insertion.
- Le compte applicatif ne peut pas faire d'`UPDATE` sur `measurements`, donc la route `POST /demo/attack` (`tamper`) doit utiliser **une connexion distincte de propriétaire**, réservée à la démo et désactivée en production. Testé : une falsification faite par le propriétaire (valeur de sommeil 4,8 → 7,5) change le statut affiché (`red → green`), est invisible dans l'interface sans la vérification de chaîne, mais **apparaît dans `v_sec_privileged_changes`** (`UPDATE | measurements | postgres`). C'est un bon scénario de démo : deux défenses indépendantes, la chaîne de hachage et le journal d'audit.

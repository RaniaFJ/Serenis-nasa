# SENTRA — interface (React)

React 18, Vite, Tailwind CSS v4, Recharts, three.js (corps 3D, chargé seulement à l'ouverture de l'onglet). Polices embarquées (Barlow, Barlow Condensed, JetBrains Mono) : aucune ressource externe, ce qui permet une CSP stricte.

## Deux modes

| Mode | Réglage | Usage |
|---|---|---|
| Démo (fausse API en mémoire, avec chaîne de hachage, simulation d'attaque, rôles) | `VITE_USE_MOCK=true` | travailler le design sans backend |
| Réel (API FastAPI + PostgreSQL) | `VITE_USE_MOCK=false` | version du projet complet |

Le navigateur appelle toujours `/api/...` : Vite (dev) ou nginx (Docker) retire `/api` et relaie vers FastAPI. Il ne parle jamais à la base de données.

## Développement

```
npm install
cp .env.example .env.local      # PowerShell : Copy-Item .env.example .env.local
npm run dev                     # http://localhost:5173
```
Avec le vrai backend lancé sur le port 8000 : mettre `VITE_USE_MOCK=false` dans `.env.local`.

## Structure

```
src/
  api/         index.js choisit client.js (adaptateur du vrai backend) ou mock.js (fausse API)
               client.js traduit la base (HR, SBP/DBP, green/yellow/red) vers l'interface ; CAPS = fonctions disponibles
  components/  Dashboard, PollBoard (verdict GO/NO-GO), Body3D (corps 3D), BodyMap, MeasureForm, SecurityPanel, GroundView…
  content/     textes éducatifs des zones du corps, utilitaires et classes d'état (STATUS_STYLE)
  i18n/        français et anglais
  styles.css   thème (@theme) et classes de composants
```

Tailwind ne détecte que les noms de classes écrits en entier : pour une couleur d'état, passer par `STATUS_STYLE` (content/format.js).

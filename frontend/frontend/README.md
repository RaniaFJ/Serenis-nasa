# Astro Health Monitor, front-end

React 18, Vite, Tailwind CSS v4, Recharts. Polices embarquées (Instrument Sans, JetBrains Mono) : aucune ressource externe.

## Lancer

```
npm install
cp .env.example .env.local      # VITE_USE_MOCK=true : fausse API, aucun backend requis
npm run dev                     # http://localhost:5173
```

Avec le vrai backend : `VITE_USE_MOCK=false`. Le navigateur appelle `/api/...` ; Vite (dev) ou nginx (Docker) retire `/api` et relaie vers FastAPI sur le port 8000. Les formats JSON attendus sont décrits dans `docs/API_CONTRACT.md` du dépôt.

## Docker

Depuis ce dossier : `docker compose up --build`, puis http://localhost:3000 (fausse API, comptes de test affichés).


`Dockerfile` en deux étapes (Node compile, nginx sert et relaie `/api` vers le service `backend`). Arguments de build :
- `VITE_USE_MOCK` (`true` ou `false`)
- `VITE_SHOW_DEMO_ACCOUNTS` (`true` affiche les comptes de test sur l'écran de connexion, mock uniquement ; `false` par défaut)

## Comptes de test (mock uniquement)

`astro / astro123` (astronaute), `surgeon / surgeon123` (médecin de vol), `commander / cmd123` (commandant). Ils n'existent que dans `src/api/mock.js`.

## Structure

```
src/
  api/          index.js choisit client.js (vrai backend) ou mock.js (fausse API) ; mockRules.js = seuils et conseils du mock
  components/   Dashboard, ReadinessRing (anneau à 7 segments), IndicatorRow, TrendChart, BodyMap, MeasureForm, GroundView, SecurityPanel, Login…
  content/      textes éducatifs des zones du corps, utilitaires et classes d'état (STATUS_STYLE)
  i18n/         français et anglais
  styles.css    thème Tailwind (@theme) et classes de composants (.panel, .btn, .field…)
```

Tailwind ne détecte que les noms de classes écrits en entier : pour une couleur d'état, passer par `STATUS_STYLE` (content/format.js), sans assembler de noms de classes à la volée.

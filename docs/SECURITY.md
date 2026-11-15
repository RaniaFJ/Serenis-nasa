# Sécurité de SENTRA

## Déjà en place (à présenter au jury)

**Base de données (PostgreSQL)**
- Sécurité par ligne (RLS) : chaque astronaute ne voit que ses propres lignes, même si l'API avait un bug.
- L'API se connecte avec `astro_login`, un rôle restreint, jamais en superutilisateur.
- `audit_log` en ajout seul (déclencheurs interdisant UPDATE / DELETE) ; vues de sécurité `v_sec_*` ; rôle auditeur séparé.
- Valeurs impossibles refusées par la base (contraintes + déclencheur de plausibilité) ; alertes et XP calculés côté base.

**API**
- Jeton JWT signé (HS256), 24 h ; secret jamais dans le code (variable d'environnement obligatoire).
- Comparaison du code d'accès en temps constant ; échecs de connexion tracés dans l'audit.
- Contexte de session transmis à la base (`set_config(..., true)` : limité à la transaction) pour que la RLS et l'audit sachent « qui, depuis quelle IP ».
- CORS limité aux origines listées (`CORS_ORIGINS`), plus de `*`.
- Conteneur API sans privilèges ; port 8000 limité à la machine locale.

**Interface**
- nginx : CSP stricte (`default-src 'self'`), `X-Frame-Options: DENY`, `nosniff`, pas de Referrer.
- Polices et scripts embarqués (aucun CDN) ; le navigateur ne parle jamais à la base.
- Jeton en `sessionStorage` (effacé à la fermeture de l'onglet) ; un 401 ramène à l'écran de connexion.

## Limites connues (à dire honnêtement, et à améliorer si le temps le permet)

1. Un seul code d'accès partagé (`DEMO_PASSCODE`) : c'est une démo, pas un vrai système d'identité. Piste : un hash par astronaute (argon2) en base.
2. Pas de limitation du nombre d'essais de connexion (les échecs sont seulement journalisés). Piste : verrouillage temporaire par astronaute + IP.
3. Jeton non révocable avant expiration (la déconnexion est tracée mais le jeton reste valide). Piste : durée courte + liste de révocation.
4. Pas de HTTPS dans le Docker local : à ajouter derrière un reverse proxy TLS pour tout déploiement réel.
5. Chaîne de hachage des mesures, rôles médecin de vol / commandant, simulation d'attaque et journal d'audit visibles dans l'interface : implémentés dans la **démo** (`VITE_USE_MOCK=true`), pas encore côté backend (voir `docs/API_CONTRACT_FUTUR.md`).
6. Modèle IA « stress » entraîné sur WESAD (non fourni, licence) : expérimental, pas un outil médical.

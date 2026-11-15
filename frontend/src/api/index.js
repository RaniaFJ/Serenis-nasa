// Point d'entrée unique de l'API pour toute l'interface.
// VITE_USE_MOCK=true  → fausse API en mémoire (aucun backend requis)
// VITE_USE_MOCK=false → vrai backend FastAPI via /api
// Les deux modules exposent exactement les mêmes fonctions (voir docs/API_CONTRACT.md).
import * as real from './client.js'
import * as mock from './mock.js'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
export const api = USE_MOCK ? mock : real

// Fonctionnalités disponibles : tout en mode démo ; avec le vrai backend, seulement ce que ses routes permettent (voir CAPS dans client.js).
export const CAPS = USE_MOCK ? { ground: true, security: true, roles: true } : real.CAPS

// Les comptes de test ne s'affichent que si on le demande : en développement (npm run dev) ou avec VITE_SHOW_DEMO_ACCOUNTS=true.
// Avec le vrai backend (VITE_USE_MOCK=false) ils n'existent pas et ne sont jamais affichés.
export const SHOW_DEMO_ACCOUNTS =
  USE_MOCK && (import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true')

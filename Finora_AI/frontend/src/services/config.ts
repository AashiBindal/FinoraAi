// Data-source configuration for the Finora service layer.
//
//   VITE_FINORA_DATA_SOURCE = api (default) | local
//     api   → the Finora Spring Boot backend (/api/transactions, /api/goals, …).
//             Requires login; every request carries the JWT. See services/api/*.
//     local → data lives in this browser's localStorage with labelled sample
//             data (offline demo, no login).
//
//   VITE_FINORA_COACH_MODE = api | demo   (default: api with the api data source, else demo)
//     api  → POST /api/ai/chat on the Spring backend (the backend holds the model key)
//     demo → rule-based responses computed from your data, clearly labelled
//
// Never put API keys in VITE_* variables: they are bundled into the browser.

const env = import.meta.env

export const API_BASE_URL = (env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
export const DATA_SOURCE: 'local' | 'api' = env.VITE_FINORA_DATA_SOURCE === 'local' ? 'local' : 'api'
export const COACH_MODE: 'demo' | 'api' =
  env.VITE_FINORA_COACH_MODE === 'api' ? 'api' : env.VITE_FINORA_COACH_MODE === 'demo' ? 'demo' : DATA_SOURCE === 'api' ? 'api' : 'demo'

/** True when the app talks to the real backend and therefore needs a logged-in user. */
export const AUTH_REQUIRED = DATA_SOURCE === 'api'

/** Simulated latency for local mode so loading states are visible and realistic. */
export const LOCAL_LATENCY_MS = 120

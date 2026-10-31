/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin, e.g. https://api.example.com (empty = same origin / Vite proxy) */
  readonly VITE_API_BASE_URL?: string
  /** 'api' (default, Spring Boot backend + login) | 'local' (localStorage demo) */
  readonly VITE_FINORA_DATA_SOURCE?: string
  /** 'api' (POST /api/ai/chat) | 'demo' (rule-based). Default follows the data source. */
  readonly VITE_FINORA_COACH_MODE?: string
  readonly VITE_SPRING_PROXY_TARGET?: string
  readonly VITE_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

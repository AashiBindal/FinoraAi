import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Dev proxy, so the browser only talks to the Vite origin (no CORS setup needed locally):
//   Finora Spring Boot API (port 8080) -> the /api prefixes below
//   AgentForge FastAPI workspace (port 8000) -> every other /api path
// Override targets with VITE_SPRING_PROXY_TARGET / VITE_PROXY_TARGET in frontend/.env.local.
const SPRING_PREFIXES = [
  '/api/auth',
  '/api/transactions',
  '/api/subscriptions',
  '/api/goals',
  '/api/profile',
  '/api/budgets',
  '/api/ai',
  '/api/analytics',
  '/api/dashboard',
  '/api/reports',
  '/api/users',
  '/api/v1',
  '/api/finance',
  '/api/demo',
]

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  const spring = env.VITE_SPRING_PROXY_TARGET || 'http://localhost:8080'
  const fastapi = env.VITE_PROXY_TARGET || 'http://localhost:8000'

  const proxy: Record<string, { target: string; changeOrigin: boolean }> = {}
  for (const prefix of SPRING_PREFIXES) proxy[prefix] = { target: spring, changeOrigin: true }
  proxy['/api'] = { target: fastapi, changeOrigin: true } // must stay last (most general)

  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy },
  }
})

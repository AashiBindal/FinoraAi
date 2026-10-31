import { useEffect, type ComponentType } from 'react'
import { AppShell } from './components/layout/AppShell'
import { FinoraShell } from './components/layout/FinoraShell'
import { Button, EmptyState } from './components/ui'
import { useAuthSession } from './hooks/useAuth'
import { FinanceProvider } from './hooks/useFinance'
import { Link, useRouter } from './lib/router'
import { WorkspaceProvider } from './lib/workspace'
import Analytics from './pages/Analytics'
import ForgotPassword from './pages/auth/ForgotPassword'
import Login from './pages/auth/Login'
import SignUp from './pages/auth/SignUp'
import Dashboard from './pages/Dashboard'
import FinanceCoach from './pages/FinanceCoach'
import GoalPlanner from './pages/GoalPlanner'
import MoneyProfile from './pages/MoneyProfile'
import MonthlyReport from './pages/MonthlyReport'
import Settings from './pages/Settings'
import SmartAlerts from './pages/SmartAlerts'
import Subscriptions from './pages/Subscriptions'
import Transactions from './pages/Transactions'
import { AUTH_REQUIRED } from './services/config'
import WsAgentWorkspace from './workspace/pages/AgentWorkspace'
import WsArchitecture from './workspace/pages/Architecture'
import WsDashboard from './workspace/pages/Dashboard'
import WsDocumentation from './workspace/pages/Documentation'
import WsProjectOverview from './workspace/pages/ProjectOverview'
import WsProgress from './workspace/pages/Progress'
import WsRoadmap from './workspace/pages/Roadmap'
import WsSettings from './workspace/pages/Settings'
import WsTeam from './workspace/pages/Team'

// Finora AI routes. Add a page: create it in src/pages, add it here and in
// components/layout/finoraNav.ts.
const FINORA_ROUTES: Record<string, ComponentType> = {
  '/': Dashboard,
  '/coach': FinanceCoach,
  '/transactions': Transactions,
  '/subscriptions': Subscriptions,
  '/profile': MoneyProfile,
  '/goals': GoalPlanner,
  '/analytics': Analytics,
  '/alerts': SmartAlerts,
  '/reports': MonthlyReport,
  '/settings': Settings,
}

// Auth pages render full-screen, outside the dashboard shell.
// With the backend (DATA_SOURCE=api) login/sign-up call the Spring /api/auth endpoints
// and every Finora route above requires a session. In local demo mode they stay demo-only.
const AUTH_ROUTES: Record<string, ComponentType> = {
  '/login': Login,
  '/signup': SignUp,
  '/forgot-password': ForgotPassword,
}

// AgentForge hackathon dev workspace (talks to the FastAPI backend).
const WORKSPACE_ROUTES: Record<string, ComponentType> = {
  '/workspace': WsDashboard,
  '/workspace/agent': WsAgentWorkspace,
  '/workspace/overview': WsProjectOverview,
  '/workspace/architecture': WsArchitecture,
  '/workspace/roadmap': WsRoadmap,
  '/workspace/progress': WsProgress,
  '/workspace/docs': WsDocumentation,
  '/workspace/team': WsTeam,
  '/workspace/settings': WsSettings,
}

function NotFound({ home }: { home: string }) {
  return (
    <EmptyState
      icon="alert"
      title="Page not found"
      description="That page doesn't exist."
      action={
        <Link to={home}>
          <Button>Back to dashboard</Button>
        </Link>
      }
    />
  )
}

/** Sends logged-out users to /login?next=<current page> (backend mode only). */
function RedirectToLogin() {
  const { path, search, navigate } = useRouter()
  useEffect(() => {
    navigate(`/login?next=${encodeURIComponent(path + search)}`, { replace: true })
  }, [navigate, path, search])
  return null
}

export default function App() {
  const { path } = useRouter()
  const session = useAuthSession()
  const normalized = path.length > 1 ? path.replace(/\/$/, '') : path

  const AuthPage = AUTH_ROUTES[normalized]
  if (AuthPage) return <AuthPage key={normalized} />

  if (normalized.startsWith('/workspace')) {
    const Page = WORKSPACE_ROUTES[normalized]
    return (
      <WorkspaceProvider>
        <AppShell>{Page ? <Page key={normalized} /> : <NotFound home="/workspace" />}</AppShell>
      </WorkspaceProvider>
    )
  }

  if (AUTH_REQUIRED && !session) return <RedirectToLogin />

  const Page = FINORA_ROUTES[normalized]
  return (
    // Keyed by user so switching accounts reloads everything
    <FinanceProvider key={session?.user.userId ?? 'local'}>
      <FinoraShell>{Page ? <Page key={normalized} /> : <NotFound home="/" />}</FinoraShell>
    </FinanceProvider>
  )
}

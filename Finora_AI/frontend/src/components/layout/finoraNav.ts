import type { IconName } from '../ui'

export interface FinoraNavItem {
  path: string
  label: string
  icon: IconName
  /** Show the unread-alerts count next to this item */
  badge?: 'alerts'
}

// Single source of truth for Finora routes shown in the sidebar.
export const FINORA_NAV: { title: string; items: FinoraNavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: 'dashboard' },
      { path: '/coach', label: 'AI Finance Coach', icon: 'sparkles' },
    ],
  },
  {
    title: 'Money',
    items: [
      { path: '/transactions', label: 'Transactions', icon: 'receipt' },
      { path: '/subscriptions', label: 'Subscriptions', icon: 'repeat' },
      { path: '/profile', label: 'Money Profile', icon: 'wallet' },
      { path: '/goals', label: 'Goal Planner', icon: 'target' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { path: '/analytics', label: 'Analytics', icon: 'lineChart' },
      { path: '/alerts', label: 'Smart Alerts', icon: 'bell', badge: 'alerts' },
      { path: '/reports', label: 'Monthly Reports', icon: 'file' },
    ],
  },
]

export const FINORA_SETTINGS: FinoraNavItem = { path: '/settings', label: 'Settings', icon: 'settings' }

export const pageTitle = (path: string) =>
  [...FINORA_NAV.flatMap((s) => s.items), FINORA_SETTINGS].find((i) => i.path === path)?.label ?? 'Finora AI'

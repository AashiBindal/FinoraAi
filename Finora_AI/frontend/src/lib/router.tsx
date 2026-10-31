// A tiny History-API router (no dependency). Exact-path matching plus query
// strings (`navigate('/transactions?q=rent')`). Swap for react-router if
// nested routes or URL params become necessary.

import { createContext, useContext, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react'

interface RouterState {
  /** Pathname only, e.g. "/transactions" */
  path: string
  /** Query string including "?", e.g. "?q=rent" (empty string when none) */
  search: string
  navigate: (to: string, opts?: { replace?: boolean }) => void
}

const RouterContext = createContext<RouterState>({ path: '/', search: '', navigate: () => {} })

const current = () => ({ path: window.location.pathname, search: window.location.search })

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState(current)

  useEffect(() => {
    const onPop = () => setLoc(current())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (to: string, opts?: { replace?: boolean }) => {
    if (to === window.location.pathname + window.location.search) return
    if (opts?.replace) window.history.replaceState({}, '', to)
    else window.history.pushState({}, '', to)
    setLoc(current())
    window.scrollTo({ top: 0 })
  }

  return <RouterContext.Provider value={{ ...loc, navigate }}>{children}</RouterContext.Provider>
}

export const useRouter = () => useContext(RouterContext)

/** Read one query parameter from the current URL. */
export function useQueryParam(name: string) {
  const { search } = useRouter()
  return new URLSearchParams(search).get(name)
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const { navigate } = useRouter()
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={handle} {...rest} />
}

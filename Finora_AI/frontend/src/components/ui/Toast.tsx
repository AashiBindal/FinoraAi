// Minimal toast notifications. `const toast = useToast(); toast.error('...')`

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { cx } from './primitives'

type Toast = { id: number; kind: 'success' | 'error'; message: string }
const ToastContext = createContext<{ success: (m: string) => void; error: (m: string) => void }>({
  success: () => {},
  error: () => {},
})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 2500)
  }, [])
  const success = useCallback((m: string) => push('success', m), [push])
  const error = useCallback((m: string) => push('error', m), [push])

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cx(
              'pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-panel-2 px-3.5 py-3 text-sm shadow-xl shadow-black/40',
              t.kind === 'error' ? 'border-danger/40' : 'border-line-strong',
            )}
          >
            <Icon name={t.kind === 'error' ? 'alert' : 'check'} className={t.kind === 'error' ? 'mt-0.5 text-danger' : 'mt-0.5 text-ok'} />
            <span className="text-fg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

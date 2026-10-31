import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Loads data with loading/error state and a `reload` function.
 *
 *   const { data, error, loading, reload, setData } = useAsync(() => api.tasks.list(), [])
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const result = await fnRef.current()
      setData(result)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading, reload, setData }
}

/** Wraps a mutation: tracks pending state and surfaces errors via `onError`. */
export function useMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>, onError?: (e: Error) => void) {
  const [pending, setPending] = useState(false)
  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      setPending(true)
      try {
        return await fn(...args)
      } catch (e) {
        onError?.(e instanceof Error ? e : new Error(String(e)))
        return undefined
      } finally {
        setPending(false)
      }
    },
    [fn, onError],
  )
  return { run, pending }
}

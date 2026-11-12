import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'hms.theme'
const ThemeContext = createContext(null)

const read = () => {
  try { return localStorage.getItem(KEY) || 'system' } catch { return 'system' }
}
const systemDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches

export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(read)
  const [prefersDark, setPrefersDark] = useState(systemDark)

  useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = (e) => setPrefersDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const resolved = choice === 'system' ? (prefersDark ? 'dark' : 'light') : choice

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#000000' : '#ffffff')
  }, [resolved])

  const setTheme = useCallback((next) => {
    setChoice(next)
    try { localStorage.setItem(KEY, next) } catch { /* storage unavailable */ }
  }, [])

  const toggle = useCallback(() => setTheme(resolved === 'dark' ? 'light' : 'dark'), [resolved, setTheme])
  const value = useMemo(() => ({ choice, resolved, setTheme, toggle }), [choice, resolved, setTheme, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

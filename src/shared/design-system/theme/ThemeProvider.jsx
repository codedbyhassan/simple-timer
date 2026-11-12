import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import useLocalPreferences from '@core/storage/useLocalPreferences.js'

const ThemeContext = createContext(null)
const systemDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches

export function ThemeProvider({ children }) {
  const { preferences, updatePreference } = useLocalPreferences()
  const choice = preferences.theme || 'system'
  const [prefersDark, setPrefersDark] = useState(systemDark)

  useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = (event) => setPrefersDark(event.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const resolved = choice === 'system' ? (prefersDark ? 'dark' : 'light') : choice

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#000000' : '#ffffff')
  }, [resolved])

  const setTheme = useCallback(async (next) => {
    try { await updatePreference('theme', next) } catch { /* Keep the last saved theme when IndexedDB is unavailable. */ }
  }, [updatePreference])

  const toggle = useCallback(() => setTheme(resolved === 'dark' ? 'light' : 'dark'), [resolved, setTheme])
  const value = useMemo(() => ({ choice, resolved, setTheme, toggle }), [choice, resolved, setTheme, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

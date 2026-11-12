import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from './authService.js'

const AuthContext = createContext(null)
const toState = (session) => (session ? { status: 'signedIn', user: session.user } : { status: 'signedOut', user: null })

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null })

  useEffect(() => {
    if (!authService) return undefined
    let alive = true
    authService.getSession().then((s) => alive && setState(toState(s))).catch(() => alive && setState(toState(null)))
    const off = authService.onAuthChange((_event, session) => alive && setState(toState(session)))
    return () => { alive = false; off() }
  }, [])

  const signIn = useCallback((email, password) => authService.signIn(email, password), [])
  const signOut = useCallback(() => authService.signOut(), [])
  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

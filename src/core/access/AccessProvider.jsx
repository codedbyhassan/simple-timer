import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../auth/authService.js'
import { workspaceHome, workspacesForRoles } from './navigation.js'

const AccessContext = createContext(null)

export function AccessProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', access: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    authService.getAccess()
      .then((access) => alive && setState({ status: 'ready', access, error: null }))
      .catch((error) => alive && setState({ status: 'error', access: null, error }))
    return () => { alive = false }
  }, [attempt])

  const retry = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    setAttempt((n) => n + 1)
  }, [])

  const value = useMemo(() => {
    const permissions = new Set(state.access?.permissions || [])
    const can = (code) => permissions.has(code)
    const roles = state.access?.roles || []
    const workspaces = workspacesForRoles(roles)
    const home = workspaces[0] ? workspaceHome(workspaces[0]) : '/profile'
    return { ...state, can, roles, workspaces, home, retry }
  }, [state, retry])

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export function useAccess() {
  const ctx = useContext(AccessContext)
  if (!ctx) throw new Error('useAccess must be used inside AccessProvider')
  return ctx
}

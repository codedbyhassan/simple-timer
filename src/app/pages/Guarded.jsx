import { useAccess } from '@core/access/AccessProvider.jsx'
import NoAccess from './NoAccess.jsx'

// Renders its children only when the user belongs to the workspace and holds one of the menu's permissions.
export default function Guarded({ workspace, menu, permission, children }) {
  const { can, workspaces } = useAccess()
  const allowed = permission ? can(permission) : workspaces.includes(workspace) && menu.anyOf.some(can)
  return allowed ? children : <NoAccess />
}

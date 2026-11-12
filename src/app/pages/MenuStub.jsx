// Temporary body for menus that are built in later milestones. Removed as each one lands.
import { EmptyState, PageHeader } from '@ui'

export default function MenuStub({ menu }) {
  return (
    <>
      <PageHeader title={menu.label} description={menu.summary} />
      <EmptyState icon={menu.icon} title="This screen is built in a later milestone">
        The workspace, menu and access rules around it are already in place.
      </EmptyState>
    </>
  )
}

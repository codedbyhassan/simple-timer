import { EmptyState, PageHeader } from '@ui'

export default function AdminMenuStub({ menu }) {
  return (
    <>
      <PageHeader title={menu.label} description={menu.summary} />
      <EmptyState icon={menu.icon} title="No records to display" />
    </>
  )
}

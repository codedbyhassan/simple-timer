import { EmptyState, PageHeader } from '@ui'

export default function SharedStub({ title, description, icon }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} title="This screen is built in a later milestone">Shared across every workspace.</EmptyState>
    </>
  )
}

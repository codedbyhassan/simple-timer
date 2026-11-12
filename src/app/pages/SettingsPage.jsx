import { Card, PageHeader, SegmentedControl, useTheme } from '@ui'

export default function SettingsPage() {
  const { choice, setTheme } = useTheme()
  return (
    <>
      <PageHeader title="Settings" />
      <div style={{ display: 'grid', gap: 24, maxWidth: 720 }}>
        <Card title="Appearance" description="Applies on this device only.">
          <SegmentedControl
            label="Theme"
            name="theme"
            value={choice}
            onChange={setTheme}
            options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          />
        </Card>
      </div>
    </>
  )
}

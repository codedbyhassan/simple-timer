// Living reference for every shared UI element. All figures and names on this page are sample data.
import { useState } from 'react'
import {
  Breadcrumbs, Button, ChartCard, FolderTile, GaugeArc, HeatGrid, InfoFooterLink, InfoPanel, MetricCard, PageHeader, PatientCard,
  PillBarChart, PropertyList, RankedList, ReceiptCard, SegmentedBar, StatusBadge, StripeMeter, Tag, TextField, UsageCard,
} from '@ui'
import { useAccess } from '@core/access/AccessProvider.jsx'
import NoAccess from './NoAccess.jsx'

const section = { display: 'grid', gap: 16, marginBottom: 40 }
const h = { margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, letterSpacing: '-0.01em' }
const note = { margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }

export default function DesignSystemPage() {
  const { can } = useAccess()
  const [folder, setFolder] = useState('Referrals')
  if (!can('admin.manage_config')) return <NoAccess />

  return (
    <>
      <PageHeader title="Design system" description="Every shared element, as used across the workspaces. All names and figures here are sample data." />

      <div style={section}>
        <h2 style={h}>Type</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="hms-chartcard" style={{ display: 'grid', gap: 10 }}>
            <p style={{ ...note, fontFamily: 'var(--font-display)' }}>Plus Jakarta Sans, 600. Titles and numbers.</p>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 600, letterSpacing: '-0.02em' }}>Page title, 26</p>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em' }}>Section title, 20</p>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>Card title, 16</p>
          </div>
          <div className="hms-chartcard" style={{ display: 'grid', gap: 10 }}>
            <p style={note}>Manrope, 400 to 600. Body, labels, controls and tables.</p>
            <p style={{ margin: 0, fontSize: 'var(--text-md)' }}>Body text at 14 is the default size for reading and data.</p>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Secondary text at 13 for descriptions and hints.</p>
            <p style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 500 }}>Medium 500 for labels and menu items.</p>
            <p style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600 }}>Semibold 600 is the heaviest weight used.</p>
          </div>
        </div>
      </div>

      <div style={section}>
        <h2 style={h}>Controls</h2>
        <div className="hms-chartcard" style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 280 }}><TextField label="Patient number" placeholder="ASC-PAT-000124" icon="search" readOnly /></div>
          <Button size="md">Primary</Button>
          <Button size="md" intent="secondary">Secondary</Button>
          <Button size="md" loading>Saving</Button>
          <StatusBadge tone="success">Verified</StatusBadge>
          <StatusBadge tone="warning">Pending</StatusBadge>
          <StatusBadge tone="critical">Critical</StatusBadge>
          <StatusBadge tone="info">In consultation</StatusBadge>
          <Tag>Insured</Tag><Tag tone="warning">Near expiry</Tag><Tag tone="critical">Allergy</Tag>
        </div>
      </div>

      <div style={section}>
        <h2 style={h}>Key figures</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <MetricCard label="Waiting for triage" value="12" icon="heartPulse" delta={{ value: '+4.7%', direction: 'up', good: false }} caption="since 08:00" />
          <MetricCard label="Seen today" value="86" icon="stethoscope" delta={{ value: '+12%', direction: 'up' }} caption="vs last Tuesday" />
          <MetricCard label="Results to verify" value="7" icon="flask" delta={{ value: '-1.2%', direction: 'down' }} caption="since 08:00" />
          <MetricCard label="Outstanding balance" value="GHS 4,820" icon="wallet" caption="across 31 patients" />
        </div>
      </div>

      <div style={section}>
        <h2 style={h}>Charts</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr 1fr', gap: 16 }}>
          <ChartCard eyebrow="Arrivals by weekday" title="OPD visits" onOpen={() => {}}>
            <PillBarChart label="OPD visits by weekday" unit="visits" data={[
              { label: 'Mon', value: 74 }, { label: 'Tue', value: 51 }, { label: 'Wed', value: 63 }, { label: 'Thu', value: 48 }, { label: 'Fri', value: 92 }, { label: 'Sat', value: 37 }, { label: 'Sun', value: 21 },
            ]} />
          </ChartCard>
          <ChartCard eyebrow="Registered patients" title="Insurance status" onOpen={() => {}}>
            <GaugeArc total="1,284" caption="patients" segments={[{ label: 'Insured', value: 72, tone: 'accent' }, { label: 'Non-Insured', value: 19, tone: 'soft' }, { label: 'Near Expiry', value: 9, tone: 'ink' }]} />
          </ChartCard>
          <ChartCard eyebrow="Claims this month" title="Readiness" onOpen={() => {}}>
            <div style={{ display: 'grid', gap: 22 }}>
              <SegmentedBar label="Claim readiness" segments={[{ label: 'Ready', value: 38, tone: 'accent' }, { label: 'Blocked', value: 25, tone: 'soft' }, { label: 'Draft', value: 18, tone: 'ink' }, { label: 'Failed', value: 8, tone: 'muted' }]} />
              <StripeMeter label="Claims by state" groups={[{ label: 'Exported', count: 14, tone: 'accent' }, { label: 'Ready', count: 11, tone: 'soft' }, { label: 'Blocked', count: 6, tone: 'ink' }]} />
            </div>
          </ChartCard>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ChartCard eyebrow="Busiest times" title="Arrivals heat map">
            <HeatGrid label="Arrivals by hour and weekday" unit="arrivals" cols={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']} rows={['08:00', '10:00', '12:00', '14:00', '16:00']} values={[[18, 22, 16, 20, 31], [34, 29, 27, 31, 40], [22, 19, 24, 18, 26], [12, 15, 11, 14, 17], [6, 8, 5, 7, 9]]} />
          </ChartCard>
          <ChartCard eyebrow="Most active" title="Top consulting rooms" onOpen={() => {}}>
            <RankedList items={[
              { name: 'Room 1', sub: 'General medicine', score: '41', caption: 'visits' },
              { name: 'Room 3', sub: 'Paediatrics', score: '36', caption: 'visits' },
              { name: 'Room 2', sub: 'Obstetrics and gynaecology', score: '29', caption: 'visits' },
              { name: 'Room 4', sub: 'Dental', score: '18', caption: 'visits' },
            ]} />
          </ChartCard>
        </div>
      </div>

      <div style={section}>
        <h2 style={h}>Patient cards</h2>
        <p style={note}>The whole card opens the record. There are no buttons on it, and no accent bar.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
          <PatientCard to="/design-system" name="Ama Serwaa Mensah" meta="34 years · Female" reference="ASC-PAT-000124" status="insured" stats={[{ icon: 'stethoscope', value: 12, label: 'visits' }, { icon: 'folder', value: 4, label: 'documents' }]} footnote="Last visit 03 Nov" />
          <PatientCard to="/design-system" name="Kofi Boateng" meta="8 years · Male" reference="ASC-PAT-000131" status="near-expiry" stats={[{ icon: 'stethoscope', value: 5, label: 'visits' }, { icon: 'folder', value: 1, label: 'documents' }]} footnote="Expires in 9 days" />
          <PatientCard to="/design-system" name="Yaw Owusu Ansah" meta="52 years · Male" reference="ASC-PAT-000087" status="non-insured" stats={[{ icon: 'stethoscope', value: 3, label: 'visits' }, { icon: 'folder', value: 0, label: 'documents' }]} footnote="Last visit 19 Oct" />
          <PatientCard to="/design-system" name="Akosua Frimpong" meta="27 years · Female" reference="ASC-PAT-000142" status="insured" stats={[{ icon: 'stethoscope', value: 2, label: 'visits' }, { icon: 'folder', value: 2, label: 'documents' }]} footnote="Last visit 01 Nov" />
        </div>
      </div>

      <div style={section}>
        <h2 style={h}>Receipt</h2>
        <ReceiptCard
          date="03.11.2026" receiptNo="ASC-RCT-000412" patientName="Ama Serwaa Mensah" intro="Payment received for 3 services."
          items={[{ name: 'Consultation', amount: 'GHS 60.00' }, { name: 'Full blood count', amount: 'GHS 45.00' }, { name: 'Artesunate 50 mg, 6 tablets', amount: 'GHS 38.50' }]}
          total="GHS 143.50" barcodeValue="ASC-RCT-000412"
        />
      </div>

      <div style={section}>
        <h2 style={h}>Documents</h2>
        <Breadcrumbs items={[{ label: 'Patients', to: '/design-system', icon: 'users' }, { label: 'Ama Serwaa Mensah', to: '/design-system', icon: 'folder' }, { label: 'Documents' }]} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
            {[
              ['Referrals', '3 documents', '1.2 MB', 'Referral to the eye clinic, issued 12 Oct. Please review the attached…'],
              ['ID and NHIS cards', '2 documents', '640 KB', 'Membership card, front and back.'],
              ['Lab reports', '9 documents', '4.8 MB', 'Full blood count, 03 Nov. Haemoglobin and white cell count within…'],
              ['Imaging', '1 document', '2.1 MB', 'Chest X-ray report.'],
              ['Consent forms', '2 documents', '310 KB', 'Signed consent for minor procedure.'],
              ['Other', '4 documents', '1.9 MB', 'Letters and miscellaneous scans.'],
            ].map(([name, count, meta, preview]) => (
              <FolderTile key={name} name={name} count={count} meta={meta} preview={preview} selected={folder === name} onSelect={() => setFolder(name)} />
            ))}
            <FolderTile name="Archive" count="Cold storage" meta="Older than 5 years" tone="dark" />
          </div>
          <InfoPanel footer={<><InfoFooterLink icon="star">Pinned items</InfoFooterLink><InfoFooterLink icon="history">Activity</InfoFooterLink></>}>
            <UsageCard label="Documents" value="11.0 MB" used={11} max={50} />
            <UsageCard label="Scans" value="2.1 MB" used={42} max={50} tone="critical" />
            <PropertyList title="Properties" items={[{ label: 'Folder', value: folder }, { label: 'Created', value: '12/10/2026' }, { label: 'Last modified', value: '03/11/2026' }]} />
            <div style={{ display: 'grid', gap: 8 }}><h3 style={{ ...h, fontSize: 'var(--text-md)' }}>Tags</h3><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><Tag>Referral</Tag><Tag tone="success">Verified</Tag><Tag tone="critical">Original needed</Tag></div></div>
          </InfoPanel>
        </div>
      </div>
    </>
  )
}

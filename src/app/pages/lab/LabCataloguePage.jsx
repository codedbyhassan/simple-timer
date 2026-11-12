import { useState } from 'react'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { LabEmpty, LabError, LabField, LabNotice, LabPanel, uid } from './LabShared.jsx'
import './lab styles/shared.css'
import './lab styles/catalogue.css'

const EMPTY_TEST = { code: '', name: '', category: 'Haematology', specimenType: '', turnaroundHours: '4', fee: '', trackedStock: true, component: '', unit: '', low: '', high: '', criticalLow: '', criticalHigh: '' }

export default async async function LabCataloguePage({ data, error, commit, can }) {
  const [values, setValues] = useState(EMPTY_TEST)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const tests = data.lab.catalogue.filter((test) => `${test.name} ${test.code} ${test.category} ${test.specimenType}`.toLowerCase().includes(query.toLowerCase().trim()))

  const addTest = (event) => {
    event.preventDefault()
    setMessage('')
    setActionError('')
    if (!can('lab.manage_catalogue')) { setActionError('Your role cannot manage the test catalogue.'); return }
    const code = values.code.trim().toUpperCase()
    const name = values.name.trim()
    const componentName = values.component.trim()
    if (!code || !name || !values.specimenType.trim() || !componentName) { setActionError('Enter a test code, test name, specimen type, and at least one result component.'); return }
    if (data.lab.catalogue.some((test) => test.code.toLowerCase() === code.toLowerCase())) { setActionError('A test with that code already exists.'); return }
    const low = values.low === '' ? undefined : Number(values.low)
    const high = values.high === '' ? undefined : Number(values.high)
    const criticalLow = values.criticalLow === '' ? undefined : Number(values.criticalLow)
    const criticalHigh = values.criticalHigh === '' ? undefined : Number(values.criticalHigh)
    if ([low, high, criticalLow, criticalHigh].some((value) => value !== undefined && !Number.isFinite(value))
      || (low !== undefined && high !== undefined && low > high)
      || (criticalLow !== undefined && low !== undefined && criticalLow > low)
      || (criticalHigh !== undefined && high !== undefined && criticalHigh < high)) {
      setActionError('Enter valid numeric ranges. Critical low must not exceed the low range, and critical high must not be below the high range.')
      return
    }
    const test = {
      id: uid('TEST'),
      code,
      name,
      category: values.category,
      specimenType: values.specimenType.trim(),
      turnaroundHours: Math.max(1, Number(values.turnaroundHours) || 4),
      fee: Math.max(0, Number(values.fee) || 0),
      trackedStock: values.trackedStock,
      claimCode: '',
      components: [{ key: uid('component').toLowerCase().replace(/[^a-z0-9]/g, ''), label: componentName, unit: values.unit.trim() || 'Result', ...(low !== undefined ? { low } : {}), ...(high !== undefined ? { high } : {}), ...(criticalLow !== undefined ? { criticalLow } : {}), ...(criticalHigh !== undefined ? { criticalHigh } : {}) }],
      active: true,
    }
    const now = new Date().toISOString()
    const lab = { ...data.lab, catalogue: [test, ...data.lab.catalogue], activity: [{ id: uid('LACT'), kind: 'Catalogue', message: `Catalogue test added · ${test.name}`, at: now }, ...data.lab.activity] }
    if (await commit({ ...data, lab })) {
      setValues(EMPTY_TEST)
      setMessage(`${name} added to the test catalogue.`)
      setShowAdd(false)
    }
  }

  const toggleTest = (test) => {
    if (!can('lab.manage_catalogue')) return
    const now = new Date().toISOString()
    const lab = {
      ...data.lab,
      catalogue: data.lab.catalogue.map((item) => item.id === test.id ? { ...item, active: item.active === false } : item),
      activity: [{ id: uid('LACT'), kind: 'Catalogue', message: `${test.name} ${test.active === false ? 'activated' : 'deactivated'}`, at: now }, ...data.lab.activity],
    }
    if (await commit({ ...data, lab })) setMessage(`${test.name} ${test.active === false ? 'activated' : 'deactivated'}.`)
  }

  return <>
    <PageHeader title="Test catalogue" description="Review tests, specimen requirements, reference ranges, turnaround targets, claim references, and tracked stock rules." actions={can('lab.manage_catalogue') ? <button type="button" className="hms-lab__button hms-lab__button--primary" onClick={() => { setShowAdd(true); setActionError('') }}><Icon name="plus" size={15} />Add test</button> : null} />
    <div className="hms-lab">
      <LabError error={error} />
      {message ? <LabNotice tone="success">{message}</LabNotice> : null}
      {actionError ? <LabNotice tone="error">{actionError}</LabNotice> : null}
      <LabNotice tone="warning">Reference ranges and critical thresholds require confirmation by a hospital laboratory lead, including approved age/sex rules and critical values, before clinical use.</LabNotice>
      <label className="hms-lab__search"><Icon name="search" size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search test, code, specimen, or category" /></label>
      <LabPanel title={`Available tests · ${tests.length}`} description="Claim mappings are shown as reference flags only; no external tariff lookup is connected.">
        {tests.length ? <div className="hms-lab__catalogue-grid">{tests.map((test) => <article className={`hms-lab__test-card${test.active === false ? ' is-inactive' : ''}`} key={test.id}><header><span className="hms-lab__test-icon"><Icon name="flask" size={18} /></span><span><strong>{test.name}</strong><small>{test.code} · {test.category}</small></span><StatusBadge tone={test.active === false ? 'neutral' : 'success'}>{test.active === false ? 'Inactive' : 'Active'}</StatusBadge></header><dl><div><dt>Specimen</dt><dd>{test.specimenType}</dd></div><div><dt>Turnaround target</dt><dd>{test.turnaroundHours} hours</dd></div><div><dt>Stock</dt><dd>{test.trackedStock ? 'Tracked consumables' : 'Not stock tracked'}</dd></div><div><dt>Claim reference</dt><dd>{test.claimCode || <StatusBadge tone="warning">Unmapped</StatusBadge>}</dd></div></dl><div className="hms-lab__components"><strong>Result components</strong>{test.components.map((component) => <div key={component.key}><span>{component.label}<small>{component.unit}</small></span><span>{component.options ? component.options.join(' / ') : `${component.low ?? '—'}–${component.high ?? '—'}`}<small>{component.criticalLow !== undefined || component.criticalHigh !== undefined ? `Critical: ${component.criticalLow ?? '—'}–${component.criticalHigh ?? '—'}` : 'No critical thresholds configured'}</small></span></div>)}</div>{can('lab.manage_catalogue') ? <button type="button" className={`hms-lab__button${test.active === false ? '' : ' hms-lab__button--quiet'}`} onClick={() => toggleTest(test)}>{test.active === false ? 'Activate test' : 'Deactivate test'}</button> : null}</article>)}</div> : <LabEmpty title="No catalogue tests match">Try another search.</LabEmpty>}
      </LabPanel>
      {can('lab.manage_catalogue') ? <Dialog open={showAdd} title="Add a catalogue test" description="Define the test and its result component." onClose={() => setShowAdd(false)} size="large">
        <form className="hms-lab__catalogue-form" onSubmit={addTest}>
          <div className="hms-lab__catalogue-form-grid"><LabField label="Test code" value={values.code} onChange={(value) => setValues((current) => ({ ...current, code: value }))} placeholder="e.g., HAE-014" maxLength="24" /><LabField label="Test name" value={values.name} onChange={(value) => setValues((current) => ({ ...current, name: value }))} placeholder="Test display name" maxLength="80" /><LabField label="Category" value={values.category} onChange={(value) => setValues((current) => ({ ...current, category: value }))} options={['Haematology', 'Biochemistry', 'Microbiology', 'Serology', 'Urinalysis', 'Other']} /><LabField label="Specimen type" value={values.specimenType} onChange={(value) => setValues((current) => ({ ...current, specimenType: value }))} placeholder="e.g., Serum" maxLength="80" /><LabField label="Turnaround (hours)" type="number" min="1" step="1" value={values.turnaroundHours} onChange={(value) => setValues((current) => ({ ...current, turnaroundHours: value }))} /><LabField label="Test fee (GHS)" type="number" min="0" step="0.01" value={values.fee} onChange={(value) => setValues((current) => ({ ...current, fee: value }))} /><LabField label="Component name" value={values.component} onChange={(value) => setValues((current) => ({ ...current, component: value }))} placeholder="e.g., Result value" maxLength="80" /><LabField label="Unit" value={values.unit} onChange={(value) => setValues((current) => ({ ...current, unit: value }))} placeholder="e.g., mmol/L" maxLength="24" /><LabField label="Reference low" type="number" step="any" value={values.low} onChange={(value) => setValues((current) => ({ ...current, low: value }))} /><LabField label="Reference high" type="number" step="any" value={values.high} onChange={(value) => setValues((current) => ({ ...current, high: value }))} /><LabField label="Critical low" type="number" step="any" value={values.criticalLow} onChange={(value) => setValues((current) => ({ ...current, criticalLow: value }))} /><LabField label="Critical high" type="number" step="any" value={values.criticalHigh} onChange={(value) => setValues((current) => ({ ...current, criticalHigh: value }))} /></div>
          <label className="hms-lab__check"><input type="checkbox" checked={values.trackedStock} onChange={(event) => setValues((current) => ({ ...current, trackedStock: event.target.checked }))} /><span>Track consumables for this test</span></label>
          <button type="submit" className="hms-lab__button hms-lab__button--primary"><Icon name="plus" size={15} />Add catalogue test</button>
        </form>
      </Dialog> : <LabNotice>Your role can review the test catalogue but cannot edit it.</LabNotice>}
    </div>
  </>
}

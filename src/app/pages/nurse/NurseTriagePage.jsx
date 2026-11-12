import { useState } from 'react'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { NurseEmpty, NurseErrorNotice, NurseField, NurseMessage, NursePatientIdentity, elapsedLabel, nameOf, patientFor, statusTone, uid } from './NurseShared.jsx'
import { RED_FLAGS, TRIAGE_PRIORITIES } from './nurseData.js'
import './nurse styles/shared.css'
import './nurse styles/triage.css'

const EMPTY_VITALS = { temperature: '', pulse: '', respiratoryRate: '', oxygenSaturation: '', systolic: '', diastolic: '', weight: '', height: '', glucose: '', glucoseType: 'RBS', complaint: '', priority: 'Routine', redFlags: [] }
const STAGES_FOR_TRIAGE = new Set(['Registered', 'Waiting for triage'])
const numericChecks = [
  ['temperature', 25, 45, 'Temperature'],
  ['pulse', 20, 250, 'Pulse'],
  ['respiratoryRate', 5, 80, 'Respiratory rate'],
  ['oxygenSaturation', 40, 100, 'SpO₂'],
  ['systolic', 40, 300, 'Systolic pressure'],
  ['diastolic', 20, 200, 'Diastolic pressure'],
  ['weight', 0.3, 500, 'Weight'],
  ['height', 0.3, 2.8, 'Height'],
  ['glucose', 0.1, 100, 'Glucose'],
]

function getWarnings(values) {
  return numericChecks.flatMap(([key, min, max, label]) => {
    const raw = values[key]
    if (raw === '' || raw === undefined) return []
    const number = Number(raw)
    return Number.isFinite(number) && number >= min && number <= max ? [] : [`${label}: check the value and units.`]
  })
}

export default function NurseTriagePage({ data, error, commit, can }) {
  const [selectedId, setSelectedId] = useState('')
  const [drafts, setDrafts] = useState({})
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const waiting = data.queue.filter((entry) => STAGES_FOR_TRIAGE.has(entry.stage)).sort((a, b) => {
    const priorityRank = (value) => value === 'Urgent' ? 0 : value === 'Priority' ? 1 : 2
    const priority = priorityRank(a.priority) - priorityRank(b.priority)
    return priority || new Date(a.arrivedAt) - new Date(b.arrivedAt)
  })
  const selected = waiting.find((entry) => entry.id === selectedId) || waiting[0]
  const patient = selected ? patientFor(data, selected.patientId) : null
  const values = selected ? drafts[selected.id] || selected.triageDraft || EMPTY_VITALS : EMPTY_VITALS
  const warnings = getWarnings(values)
  const bmi = values.weight && values.height && Number(values.height) > 0
    ? (Number(values.weight) / (Number(values.height) ** 2)).toFixed(1)
    : ''

  const updateDraft = (key, value) => {
    if (!selected) return
    setDrafts((current) => ({ ...current, [selected.id]: { ...values, [key]: value } }))
    setMessage('')
    setFormError('')
  }
  const updateRedFlag = (flag, checked) => {
    const next = checked ? [...values.redFlags, flag] : values.redFlags.filter((item) => item !== flag)
    setDrafts((current) => ({ ...current, [selected.id]: { ...values, redFlags: next, ...(checked ? { priority: 'Urgent' } : {}) } }))
    setMessage('')
    setFormError('')
  }
  const saveDraft = async () => {
    if (!selected || !can('nursing.triage')) return
    const queue = data.queue.map((entry) => entry.id === selected.id ? { ...entry, triageDraft: values, triageDraftAt: new Date().toISOString() } : entry)
    if (await commit({ ...data, queue })) setMessage('Triage draft saved on this device.')
  }
  const completeTriage = async (event) => {
    event.preventDefault()
    if (!selected || !can('nursing.triage')) { setFormError('Your role does not have permission to complete triage.'); return }
    if (![values.temperature, values.pulse, values.respiratoryRate, values.oxygenSaturation, values.systolic, values.diastolic, values.weight, values.height, values.glucose, values.complaint].some((value) => String(value || '').trim()) && values.redFlags.length === 0) {
      setFormError('Enter observations or a presenting concern before handing over.')
      return
    }
    const finalPriority = values.redFlags.length ? 'Urgent' : values.priority
    const triage = {
      ...values,
      priority: finalPriority,
      bmi,
      recordedAt: new Date().toISOString(),
      recordedBy: 'Nursing team',
    }
    const queue = data.queue.map((entry) => entry.id === selected.id
      ? { ...entry, stage: 'Waiting for clinician', priority: finalPriority, triage, triageDraft: undefined }
      : entry)
    const nurse = {
      ...data.nurse,
      activity: [{ id: uid('ACT'), kind: 'Triage', message: `${nameOf(patient)} triage completed · ${finalPriority} handover`, at: triage.recordedAt }, ...data.nurse.activity],
    }
    if (await commit({ ...data, queue, nurse })) {
      setMessage(`${nameOf(patient)} handed over to the clinician queue.`)
      setFormError('')
      setDrafts((current) => { const next = { ...current }; delete next[selected.id]; return next })
      setSelectedId('')
    }
  }

  return <>
    <PageHeader title="Triage queue" description="Review arrivals, record observations and hand over a concise triage summary to the clinician." />
    <div className="hms-nurse">
      <NurseErrorNotice error={error} />
      <NurseMessage>{message}</NurseMessage>
      <NurseMessage tone="error">{formError}</NurseMessage>
      <div className="hms-nurse__triage-layout">
        <aside className="hms-nurse__panel hms-nurse__triage-list"><header className="hms-nurse__panel-head"><div><span className="hms-nurse__eyebrow">Outpatient arrivals</span><h2>Waiting for triage</h2></div><span className="hms-nurse__count">{waiting.length}</span></header>
          {waiting.length ? waiting.map((entry) => {
            const person = patientFor(data, entry.patientId)
            return <button type="button" className={`hms-nurse__triage-patient${selected?.id === entry.id ? ' is-selected' : ''}`} onClick={() => { setSelectedId(entry.id); setMessage(''); setFormError(''); setShowForm(false) }} key={entry.id}>
              <span className="hms-nurse__triage-patient-head"><NursePatientIdentity patient={person} secondary={entry.department} /><Icon name="chevronRight" size={16} /></span>
              <span className="hms-nurse__triage-meta"><StatusBadge tone={statusTone(entry.priority)}>{entry.priority || 'Routine'}</StatusBadge><small><Icon name="clock" size={13} />{elapsedLabel(entry.arrivedAt)}</small></span>
              <span className="hms-nurse__triage-reason">{entry.reason}</span>
              {entry.triageDraft ? <span className="hms-nurse__draft-label">Draft saved</span> : null}
            </button>
          }) : <NurseEmpty title="Triage queue is clear">New check-ins from Reception appear here.</NurseEmpty>}
        </aside>
        <section className="hms-nurse__panel hms-nurse__triage-form-panel">
          {selected && patient ? <>
            <header className="hms-nurse__patient-header"><NursePatientIdentity patient={patient} secondary={`${patient.sex || 'Sex not recorded'} · ${patient.dateOfBirth || 'DOB not recorded'}`} /><div><StatusBadge tone={statusTone(selected.priority)}>{selected.priority || 'Routine'}</StatusBadge><span className="hms-nurse__arrival-time">Arrived {elapsedLabel(selected.arrivedAt)} ago</span><button type="button" className="hms-nurse__button hms-nurse__button--primary" onClick={() => setShowForm(true)} disabled={!can('nursing.triage')}><Icon name="activity" size={15} />Record observations</button></div></header>
            <div className="hms-nurse__triage-context"><span><strong>Department</strong>{selected.department}</span><span><strong>Presenting reason</strong>{selected.reason || 'Not recorded at check-in'}</span></div>
            <Dialog open={showForm} title={`Triage · ${nameOf(patient)}`} description="Record observations and prepare a clinical handover." onClose={() => setShowForm(false)} size="large">
            <form onSubmit={completeTriage}>
              <section className="hms-nurse__vitals-section"><header><div><span className="hms-nurse__eyebrow">Observations</span><h3>Record vital signs</h3></div><small>Enter available readings; each is saved with the triage time.</small></header>
                <div className="hms-nurse__vitals-grid">
                  <NurseField label="Temperature" unit="°C" type="number" min="25" max="45" value={values.temperature} onChange={(value) => updateDraft('temperature', value)} />
                  <NurseField label="Pulse" unit="bpm" type="number" min="20" max="250" value={values.pulse} onChange={(value) => updateDraft('pulse', value)} />
                  <NurseField label="Respiratory rate" unit="/min" type="number" min="5" max="80" value={values.respiratoryRate} onChange={(value) => updateDraft('respiratoryRate', value)} />
                  <NurseField label="Oxygen saturation" unit="%" type="number" min="40" max="100" value={values.oxygenSaturation} onChange={(value) => updateDraft('oxygenSaturation', value)} />
                  <NurseField label="Systolic pressure" unit="mmHg" type="number" min="40" max="300" value={values.systolic} onChange={(value) => updateDraft('systolic', value)} />
                  <NurseField label="Diastolic pressure" unit="mmHg" type="number" min="20" max="200" value={values.diastolic} onChange={(value) => updateDraft('diastolic', value)} />
                  <NurseField label="Weight" unit="kg" type="number" min="0.3" max="500" value={values.weight} onChange={(value) => updateDraft('weight', value)} />
                  <NurseField label="Height" unit="m" type="number" min="0.3" max="2.8" value={values.height} onChange={(value) => updateDraft('height', value)} />
                  <NurseField label="Glucose" unit="mmol/L" type="number" min="0.1" max="100" value={values.glucose} onChange={(value) => updateDraft('glucose', value)} />
                  <NurseField label="Glucose type" value={values.glucoseType} onChange={(value) => updateDraft('glucoseType', value)} options={['FBS', 'RBS', '2HPP', 'HBA1C']} />
                  <div className="hms-nurse__bmi"><span>BMI</span><strong>{bmi || '—'}</strong><small>Calculated display only</small></div>
                </div>
                {warnings.length ? <div className="hms-nurse__soft-warning"><Icon name="alertTriangle" size={16} /><span><strong>Check entered values</strong>{warnings.map((warning) => <small key={warning}>{warning}</small>)}</span></div> : null}
              </section>
              <section className="hms-nurse__vitals-section"><header><div><span className="hms-nurse__eyebrow">Nursing assessment</span><h3>Presenting concern</h3></div></header><NurseField label="Symptoms or nurse note" value={values.complaint} onChange={(value) => updateDraft('complaint', value)} placeholder="Brief presenting concern or relevant observation" /></section>
              <section className="hms-nurse__vitals-section"><header><div><span className="hms-nurse__eyebrow">Handover</span><h3>Priority and red flags</h3></div><small>Use the hospital&apos;s approved triage policy.</small></header>
                <div className="hms-nurse__priority-options">{TRIAGE_PRIORITIES.map((priority) => <label key={priority} className={values.priority === priority ? 'is-selected' : ''}><input type="radio" name="triage-priority" value={priority} checked={values.priority === priority} onChange={() => updateDraft('priority', priority)} /><span><StatusBadge tone={statusTone(priority)}>{priority}</StatusBadge><small>{priority === 'Routine' ? 'Standard assessment queue' : priority === 'Priority' ? 'Review promptly' : 'Immediate clinical attention'}</small></span></label>)}</div>
                <div className="hms-nurse__red-flags"><strong>Red-flag observations</strong><small>Select any that apply; these elevate the handover priority.</small>{RED_FLAGS.map((flag) => <label key={flag}><input type="checkbox" checked={values.redFlags.includes(flag)} onChange={(event) => updateRedFlag(flag, event.target.checked)} />{flag}</label>)}</div>
              </section>
              {!can('nursing.triage') ? <div className="hms-nurse__readonly-note"><Icon name="info" size={16} />Your role can view triage records but cannot edit or complete them.</div> : null}
              <footer className="hms-nurse__form-actions"><button type="button" className="hms-nurse__button hms-nurse__button--quiet" onClick={saveDraft} disabled={!can('nursing.triage')}>Save draft</button><button type="submit" className="hms-nurse__button hms-nurse__button--primary" disabled={!can('nursing.triage')}><Icon name="checkCircle" size={16} />Complete triage & hand over</button></footer>
            </form>
            </Dialog>
          </> : <NurseEmpty title="Select a patient to begin triage">Choose an arrival from the waiting list to record observations.</NurseEmpty>}
        </section>
      </div>
      <p className="hms-nurse__footnote">Recorded values are observations, not an automated diagnosis. The displayed entry-range warnings do not replace clinical assessment.</p>
    </div>
  </>
}

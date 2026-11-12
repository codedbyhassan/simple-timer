import { useState } from 'react'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { NurseEmpty, NurseErrorNotice, NurseMessage, NursePatientIdentity, nameOf, patientFor, statusTone, uid } from './NurseShared.jsx'
import { DISCHARGE_CHECKS } from './nurseData.js'
import './nurse styles/shared.css'
import './nurse styles/discharge.css'

export default function NurseDischargePage({ data, error, commit, can }) {
  const [message, setMessage] = useState('')
  const [editingRecordId, setEditingRecordId] = useState('')
  const nurse = data.nurse
  const preparing = nurse.discharges.filter((item) => item.status !== 'Discharged')
  const completed = nurse.discharges.filter((item) => item.status === 'Discharged')
  const editingRecord = preparing.find((item) => item.id === editingRecordId)

  const toggleCheck = async (record, key, checked) => {
    if (!can('nursing.observe')) return
    const now = new Date().toISOString()
    const discharges = nurse.discharges.map((item) => item.id === record.id
      ? { ...item, checks: { ...item.checks, [key]: checked }, updatedAt: now }
      : item)
    if (await commit({ ...data, nurse: { ...nurse, discharges } })) setMessage('Discharge checklist updated.')
  }
  const completeDischarge = async (record) => {
    if (!can('nursing.observe')) return
    const outcome = record.outcome
    if (!outcome) { setMessage('Choose a discharge outcome before completing this checklist.'); return }
    if (!DISCHARGE_CHECKS.every((check) => record.checks[check.key])) { setMessage('Complete every required discharge check before proceeding.'); return }
    const now = new Date().toISOString()
    const ward = nurse.wards.find((item) => item.id === record.wardId)
    const discharges = nurse.discharges.map((item) => item.id === record.id
      ? { ...item, status: 'Discharged', outcome, dischargedAt: now, updatedAt: now }
      : item)
    const beds = nurse.beds.map((item) => item.id === record.bedId
      ? { ...item, status: 'Cleaning', patientId: '', since: now }
      : item)
    const activity = [{ id: uid('ACT'), kind: 'Discharge', message: `${nameOf(patientFor(data, record.patientId))} discharge completed from ${ward?.name || 'ward'}`, at: now }, ...nurse.activity]
    if (await commit({ ...data, nurse: { ...nurse, discharges, beds, activity } })) {
      setMessage(`${nameOf(patientFor(data, record.patientId))} discharge checklist completed. Bed ${record.bedId} is marked for cleaning.`)
      setEditingRecordId('')
    }
  }
  const updateOutcome = async (record, outcome) => {
    if (!can('nursing.observe')) return
    const now = new Date().toISOString()
    const discharges = nurse.discharges.map((item) => item.id === record.id
      ? { ...item, outcome, checks: { ...item.checks, outcome: Boolean(outcome) }, updatedAt: now }
      : item)
    if (await commit({ ...data, nurse: { ...nurse, discharges } })) setMessage('Discharge outcome recorded.')
  }

  return <>
    <PageHeader title="Discharge checklist" description="Coordinate the documented checks and record the disposition before marking a discharge complete." />
    <div className="hms-nurse">
      <NurseErrorNotice error={error} />
      <NurseMessage>{message}</NurseMessage>
      <div className="hms-nurse__discharge-banner"><span><Icon name="listChecks" size={20} /></span><div><strong>Required before completion</strong><small>Clinical summary, medicines, billing arrangements and discharge outcome must all be recorded.</small></div></div>
      <section className="hms-nurse__panel"><header className="hms-nurse__panel-head"><div><span className="hms-nurse__eyebrow">Inpatient handover</span><h2>Preparing for discharge</h2></div><StatusBadge tone="info">{preparing.length} in progress</StatusBadge></header>
        {preparing.length ? <div className="hms-nurse__discharge-list">{preparing.map((record) => {
          const patient = patientFor(data, record.patientId)
          const completedCount = DISCHARGE_CHECKS.filter((check) => record.checks[check.key]).length
          const ward = nurse.wards.find((item) => item.id === record.wardId)
          return <article className="hms-nurse__discharge-card" key={record.id}>
            <header><NursePatientIdentity patient={patient} secondary={`${ward?.name || 'Ward'} · Bed ${record.bedId}`} /><div className="hms-nurse__discharge-progress"><strong>{completedCount}/{DISCHARGE_CHECKS.length}</strong><small>checks complete</small></div></header>
            <div className="hms-nurse__progress-track"><span style={{ width: `${(completedCount / DISCHARGE_CHECKS.length) * 100}%` }} /></div>
            <div className="hms-nurse__checklist">{DISCHARGE_CHECKS.map((check) => <div key={check.key} className={record.checks[check.key] ? 'is-checked' : ''}><span><strong>{check.label}</strong></span><StatusBadge tone={record.checks[check.key] ? 'success' : 'neutral'}>{record.checks[check.key] ? 'Done' : 'Required'}</StatusBadge></div>)}</div>
            <footer className="hms-nurse__discharge-actions"><button type="button" className="hms-nurse__button hms-nurse__button--primary" disabled={!can('nursing.observe')} onClick={() => setEditingRecordId(record.id)}><Icon name="edit" size={16} />Update checklist</button></footer>
          </article>
        })}</div> : <NurseEmpty title="No discharges in progress">New inpatient discharge preparations will appear here.</NurseEmpty>}
        {!can('nursing.observe') ? <p className="hms-nurse__permission-note">Your role can view discharge checklists but cannot update them.</p> : null}
      </section>
      <Dialog open={Boolean(editingRecord)} title="Update discharge checklist" description={editingRecord ? `${nameOf(patientFor(data, editingRecord.patientId))} · bed ${editingRecord.bedId}` : ''} onClose={() => setEditingRecordId('')} size="large">
        {editingRecord ? <>
          <div className="hms-nurse__checklist">{DISCHARGE_CHECKS.map((check) => <label key={check.key} className={editingRecord.checks[check.key] ? 'is-checked' : ''}><input type="checkbox" checked={Boolean(editingRecord.checks[check.key])} onChange={(event) => toggleCheck(editingRecord, check.key, event.target.checked)} disabled={!can('nursing.observe')} /><span><strong>{check.label}</strong><small>{check.key === 'billing' ? 'Confirm cleared or arrangements recorded' : check.key === 'medicines' ? 'Confirm medicines are dispensed or arranged' : check.key === 'outcome' ? 'Document the patient disposition' : 'Confirm documented by the responsible clinician'}</small></span><StatusBadge tone={editingRecord.checks[check.key] ? 'success' : 'neutral'}>{editingRecord.checks[check.key] ? 'Done' : 'Required'}</StatusBadge></label>)}</div>
          <footer className="hms-nurse__discharge-actions"><label className="hms-nurse__field"><span>Discharge outcome</span><select value={editingRecord.outcome || ''} onChange={(event) => updateOutcome(editingRecord, event.target.value)} disabled={!can('nursing.observe')}><option value="">Select recorded outcome</option>{['Discharged home', 'Transferred', 'Referred', 'Other documented outcome'].map((outcome) => <option key={outcome}>{outcome}</option>)}</select></label><button type="button" className="hms-nurse__button hms-nurse__button--primary" disabled={!can('nursing.observe') || !DISCHARGE_CHECKS.every((check) => editingRecord.checks[check.key]) || !editingRecord.outcome} onClick={() => completeDischarge(editingRecord)}><Icon name="checkCircle" size={16} />Complete discharge</button></footer>
        </> : null}
      </Dialog>
      <section className="hms-nurse__panel"><header className="hms-nurse__panel-head"><div><span className="hms-nurse__eyebrow">Completed records</span><h2>Recently discharged</h2></div></header>
        {completed.length ? completed.slice(0, 5).map((record) => <div className="hms-nurse__discharge-history" key={record.id}><NursePatientIdentity patient={patientFor(data, record.patientId)} secondary={`Bed ${record.bedId}`} /><span>{record.outcome} · {record.dischargedAt ? new Date(record.dischargedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Completed'}</span><StatusBadge tone={statusTone(record.status)}>{record.status}</StatusBadge></div>) : <NurseEmpty title="No completed discharges yet" />}
      </section>
    </div>
  </>
}

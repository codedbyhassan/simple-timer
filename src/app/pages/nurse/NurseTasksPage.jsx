import { useState } from 'react'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { NurseEmpty, NurseErrorNotice, NurseField, NurseMessage, NurseTaskRow, uid, nameOf, patientFor } from './NurseShared.jsx'
import { TASK_TYPES } from './nurseData.js'
import './nurse styles/shared.css'
import './nurse styles/tasks.css'

const EMPTY_TASK = { patientId: '', wardId: '', type: TASK_TYPES[0], note: '', priority: 'Routine' }

export default function NurseTasksPage({ data, error, commit, can }) {
  const [filter, setFilter] = useState('Open')
  const [showForm, setShowForm] = useState(false)
  const [values, setValues] = useState(EMPTY_TASK)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const tasks = data.nurse.tasks.filter((task) => filter === 'All' || (filter === 'Open' ? task.status !== 'Completed' : task.status === filter))
    .sort((a, b) => (a.status === 'Overdue' ? -1 : b.status === 'Overdue' ? 1 : new Date(a.dueAt) - new Date(b.dueAt)))
  const due = data.nurse.tasks.filter((task) => task.status !== 'Completed').length
  const overdue = data.nurse.tasks.filter((task) => task.status === 'Overdue').length

  const updateTask = (task, status = 'Completed') => {
    if (!can('nursing.observe')) return
    const now = new Date().toISOString()
    const nurse = {
      ...data.nurse,
      tasks: data.nurse.tasks.map((item) => item.id === task.id ? { ...item, status, completedAt: status === 'Completed' ? now : '' } : item),
      activity: [{ id: uid('ACT'), kind: 'Task', message: `${task.type} · ${nameOf(patientFor(data, task.patientId))} ${status === 'Completed' ? 'completed' : 'updated'}`, at: now }, ...data.nurse.activity],
    }
    if (await commit({ ...data, nurse })) setMessage(status === 'Completed' ? 'Task marked complete.' : 'Task status updated.')
  }
  const addTask = (event) => {
    event.preventDefault()
    if (!can('nursing.observe')) { setFormError('Your role does not have permission to create nursing tasks.'); return }
    if (!values.patientId || !values.wardId) { setFormError('Select a patient and ward for this task.'); return }
    const task = { ...values, id: uid('TASK'), note: values.note.trim() || 'Nursing follow-up', dueAt: new Date().toISOString(), status: 'Due', createdAt: new Date().toISOString() }
    const nurse = { ...data.nurse, tasks: [task, ...data.nurse.tasks] }
    if (await commit({ ...data, nurse })) {
      setValues(EMPTY_TASK)
      setShowForm(false)
      setFormError('')
      setMessage('Nursing task added to the shift list.')
    }
  }

  return <>
    <PageHeader title="Nursing tasks" description="Organise observation rounds, medication administration, dressing checks and handover notes." actions={can('nursing.observe') ? <button type="button" className="hms-nurse__button hms-nurse__button--primary" onClick={() => { setShowForm((open) => !open); setMessage(''); setFormError('') }}><Icon name="plus" size={16} />Add task</button> : null} />
    <div className="hms-nurse">
      <NurseErrorNotice error={error} />
      <NurseMessage>{message}</NurseMessage>
      <NurseMessage tone="error">{formError}</NurseMessage>
      <div className="hms-nurse__task-summary"><div><span className="hms-nurse__eyebrow">On this shift</span><strong>{due}</strong><small>open tasks</small></div><div><span className="hms-nurse__eyebrow">Needs attention</span><strong>{overdue}</strong><small>overdue tasks</small></div><div><span className="hms-nurse__eyebrow">Completed</span><strong>{data.nurse.tasks.filter((task) => task.status === 'Completed').length}</strong><small>documented tasks</small></div><span className="hms-nurse__task-summary-icon"><Icon name="checkSquare" size={23} /></span></div>
      <Dialog open={showForm} title="Create a nursing task" description="Add an observation or care task to the shift list." onClose={() => setShowForm(false)} size="large">
        <form className="hms-nurse__form-grid" onSubmit={addTask}>
          <NurseField label="Patient" value={values.patientId} onChange={(value) => setValues((current) => ({ ...current, patientId: value }))} options={[{ value: '', label: 'Choose patient' }, ...data.patients.map((patient) => ({ value: patient.id, label: `${nameOf(patient)} · ${patient.id}` }))]} />
          <NurseField label="Ward" value={values.wardId} onChange={(value) => setValues((current) => ({ ...current, wardId: value }))} options={[{ value: '', label: 'Choose ward' }, ...data.nurse.wards.map((ward) => ({ value: ward.id, label: ward.name }))]} />
          <NurseField label="Task type" value={values.type} onChange={(value) => setValues((current) => ({ ...current, type: value }))} options={TASK_TYPES} />
          <NurseField label="Priority" value={values.priority} onChange={(value) => setValues((current) => ({ ...current, priority: value }))} options={['Routine', 'Priority', 'Urgent']} />
          <NurseField label="Task note" value={values.note} onChange={(value) => setValues((current) => ({ ...current, note: value }))} placeholder="Add a short handover or task detail" />
          <div className="hms-nurse__form-actions"><button type="button" className="hms-nurse__button hms-nurse__button--quiet" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="hms-nurse__button hms-nurse__button--primary"><Icon name="plus" size={15} />Add to shift</button></div>
        </form>
      </Dialog>
      <section className="hms-nurse__panel"><header className="hms-nurse__panel-head"><div><span className="hms-nurse__eyebrow">Work queue</span><h2>Tasks and observations</h2></div><StatusBadge tone={overdue ? 'warning' : 'success'}>{overdue ? `${overdue} overdue` : 'On track'}</StatusBadge></header>
        <div className="hms-nurse__task-filters" role="tablist" aria-label="Filter nursing tasks">{['Open', 'Overdue', 'Completed', 'All'].map((status) => <button type="button" role="tab" aria-selected={filter === status} className={filter === status ? 'is-selected' : ''} key={status} onClick={() => setFilter(status)}>{status}{status === 'Open' ? <span>{due}</span> : status === 'Overdue' ? <span>{overdue}</span> : null}</button>)}</div>
        {tasks.length ? <div className="hms-nurse__task-list">{tasks.map((task) => <NurseTaskRow key={task.id} task={task} patient={patientFor(data, task.patientId)} canUpdate={can('nursing.observe')} onComplete={(item) => updateTask(item)} />)}</div> : <NurseEmpty title={`No ${filter.toLowerCase()} tasks`}>New observations and handover tasks will appear here.</NurseEmpty>}
        {!can('nursing.observe') ? <p className="hms-nurse__permission-note">Your role has read-only access to nursing tasks.</p> : null}
      </section>
    </div>
  </>
}

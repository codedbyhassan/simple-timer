import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { getDemoPatients, getPatientInsuranceStatus, providers, setDemoPatients, subscribeToDemoPatients } from './patientStore.js'
import PatientDetailPage from './PatientDetailPage.jsx'
import { useRoleAccess } from '../../access/roleAccess.js'
import './PatientsPage.css'

const pageSize = 50
const maxDateOfBirth = new Date().toISOString().slice(0, 10)

const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const emptyForm = {
  name: '',
  dob: '',
  sex: '',
  phone: '',
  email: '',
  insuranceProvider: '',
  insuranceMemberId: '',
  isDependant: '',
  insuranceExpires: '',
}

function formatDate(value) {
  if (!value) return '—'
  return dateFormatter.format(new Date(`${value}T00:00:00Z`))
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function patientRoute() {
  const match = window.location.pathname.match(/^\/patients\/([^/]+)\/?$/)
  return match ? { patientId: decodeURIComponent(match[1]) } : { patientId: '' }
}

function PatientsPage() {
  const { hasPermission } = useRoleAccess()
  const canCreatePatients = hasPermission('patients.create')
  const canEditPatients = hasPermission('patients.update')
  const patients = useSyncExternalStore(subscribeToDemoPatients, getDemoPatients, getDemoPatients)
  const [route, setRoute] = useState(patientRoute)
  const [query, setQuery] = useState('')
  const [insuranceFilter, setInsuranceFilter] = useState('All coverage')
  const [providerFilter, setProviderFilter] = useState('All providers')
  const [sexFilter, setSexFilter] = useState('All genders')
  const [sortOrder, setSortOrder] = useState('recent')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState('')
  const [editingPatientId, setEditingPatientId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!window.location.pathname.startsWith('/patients')) {
      window.history.replaceState({}, '', '/patients')
    }

    const syncRoute = () => {
      setRoute(patientRoute())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('popstate', syncRoute)
    return () => {
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  useEffect(() => {
    if (!modal && !route.patientId) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setModal('')
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [modal, route.patientId])

  const updatePatients = (updater) => {
    setDemoPatients(updater)
  }

  const selectedPatient = patients.find((patient) => patient.id === route.patientId)
  const coverageCounts = useMemo(() => {
    return patients.reduce(
      (counts, patient) => {
        counts[getPatientInsuranceStatus(patient)] += 1
        return counts
      },
      { Insured: 0, 'Non-insured': 0, 'Near expiry': 0 },
    )
  }, [patients])

  const filteredPatients = useMemo(() => {
    const term = query.trim().toLowerCase()
    return patients
      .filter((patient) => {
        const status = getPatientInsuranceStatus(patient)
        const matchesCoverage = insuranceFilter === 'All coverage' || status === insuranceFilter
        const matchesProvider =
          providerFilter === 'All providers' || patient.insuranceProvider === providerFilter
        const matchesSex = sexFilter === 'All genders' || patient.sex === sexFilter
        const matchesTerm =
          !term ||
          `${patient.id} ${patient.name} ${patient.phone} ${patient.email} ${patient.insuranceMemberId}`.toLowerCase().includes(term)
        return matchesCoverage && matchesProvider && matchesSex && matchesTerm
      })
      .sort((left, right) => {
        if (sortOrder === 'name') return left.name.localeCompare(right.name)
        if (sortOrder === 'oldest') return left.registered.localeCompare(right.registered)
        return right.registered.localeCompare(left.registered) || right.id.localeCompare(left.id)
      })
  }, [patients, query, insuranceFilter, providerFilter, sexFilter, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pagePatients = filteredPatients.slice((safePage - 1) * pageSize, safePage * pageSize)
  const providerOptions = [...new Set(patients.map((patient) => patient.insuranceProvider).filter(Boolean))].sort()

  const resetPage = () => setPage(1)
  const navigateToPatient = (patientId) => {
    window.history.pushState({}, '', `/patients/${encodeURIComponent(patientId)}`)
    setRoute({ patientId })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const navigateToDirectory = () => {
    window.history.pushState({}, '', '/patients')
    setRoute({ patientId: '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openNewPatient = () => {
    setEditingPatientId('')
    setForm(emptyForm)
    setFormError('')
    setModal('form')
  }

  const openEditPatient = (patient) => {
    setEditingPatientId(patient.id)
    setForm({
      name: patient.name,
      dob: patient.dob,
      sex: patient.sex,
      phone: patient.phone,
      email: patient.email,
      insuranceProvider: patient.insuranceProvider,
      insuranceMemberId: patient.insuranceMemberId,
      isDependant: patient.isDependant ?? '',
      insuranceExpires: patient.insuranceExpires,
    })
    setFormError('')
    setModal('form')
  }

  const savePatient = (event) => {
    event.preventDefault()
    const patientForm = {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      insuranceMemberId: form.insuranceProvider ? form.insuranceMemberId.trim() : '',
      isDependant: form.insuranceProvider === 'NHIS' ? form.isDependant : '',
      insuranceExpires: form.insuranceProvider ? form.insuranceExpires : '',
    }
    const normalizedPhone = patientForm.phone.replace(/\D/g, '')
    if (!patientForm.name) {
      setFormError('Enter the patient’s full name.')
      return
    }
    if (normalizedPhone.length < 7) {
      setFormError('Enter a valid phone number with at least 7 digits.')
      return
    }
    if (patients.some((patient) => patient.id !== editingPatientId && patient.phone.replace(/\D/g, '') === normalizedPhone)) {
      setFormError('This phone number is already assigned to another patient.')
      return
    }
    if (patientForm.insuranceProvider && (!patientForm.insuranceMemberId || !patientForm.insuranceExpires)) {
      setFormError('Enter the insurance member number and coverage expiry date.')
      return
    }
    if (form.dob && new Date(`${form.dob}T00:00:00`) > new Date()) {
      setFormError('Date of birth cannot be in the future.')
      return
    }

    if (editingPatientId) {
      updatePatients((current) =>
        current.map((patient) =>
          patient.id === editingPatientId ? { ...patient, ...patientForm } : patient,
        ),
      )
      setModal('')
      return
    }

    const nextNumber = Math.max(...patients.map((patient) => Number(patient.id.replace('HMS-', ''))), 10486) + 1
    const newPatient = {
      ...patientForm,
      id: `HMS-${nextNumber}`,
      registered: maxDateOfBirth,
    }
    updatePatients((current) => [newPatient, ...current])
    setPage(1)
    setQuery('')
    setInsuranceFilter('All coverage')
    setProviderFilter('All providers')
    setSexFilter('All genders')
    setModal('')
  }

  if (route.patientId && selectedPatient) {
    return (
      <>
        <PatientDetailPage
          patient={selectedPatient}
          insuranceStatus={getPatientInsuranceStatus(selectedPatient)}
          onBack={navigateToDirectory}
          onEdit={() => canEditPatients && openEditPatient(selectedPatient)}
          canEdit={canEditPatients}
        />
        {modal === 'form' && renderPatientForm()}
      </>
    )
  }

  if (route.patientId && !selectedPatient) {
    return (
      <section className="patients-page">
        <h1>Patient record not found</h1>
        <button className="button button--secondary" type="button" onClick={navigateToDirectory}>Back to patients</button>
      </section>
    )
  }

  function renderPatientForm() {
    return (
      <div className="patients-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal('')}>
        <section className="patients-modal" role="dialog" aria-modal="true" aria-labelledby="patient-form-title">
          <div className="patients-modal-header">
            <div>
              <span className="patients-modal-icon"><Users size={18} /></span>
              <h2 id="patient-form-title">{editingPatientId ? 'Edit patient' : 'Register a patient'}</h2>
              <p>Update the patient’s demographic and insurance details.</p>
            </div>
            <button className="icon-button" type="button" aria-label="Close form" onClick={() => setModal('')}><X size={18} /></button>
          </div>
          <form onSubmit={savePatient}>
            <div className="patients-form-grid">
              <label className="patients-form-field patients-form-field--wide">
                <span>Full name <b>*</b></span>
                <input autoFocus required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label className="patients-form-field">
                <span>Date of birth <b>*</b></span>
                <input type="date" required max={maxDateOfBirth} value={form.dob} onChange={(event) => setForm({ ...form, dob: event.target.value })} />
              </label>
              <label className="patients-form-field">
                <span>Gender <b>*</b></span>
                <select required value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })}>
                  <option value="">Select</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </label>
              <label className="patients-form-field">
                <span>Phone number <b>*</b></span>
                <input type="tel" required maxLength={32} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </label>
              <label className="patients-form-field">
                <span>Email <small>Optional</small></span>
                <input type="email" maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
              <label className="patients-form-field patients-form-field--wide">
                <span>Insurance provider</span>
                <select value={form.insuranceProvider} onChange={(event) => setForm({ ...form, insuranceProvider: event.target.value, insuranceMemberId: '', isDependant: '', insuranceExpires: '' })}>
                  <option value="">Non-insured</option>
                  {providers.map((provider) => <option key={provider}>{provider}</option>)}
                </select>
              </label>
              {form.insuranceProvider && (
                <>
                  <label className="patients-form-field">
                    <span>Member number <b>*</b></span>
                    <input required maxLength={48} value={form.insuranceMemberId} onChange={(event) => setForm({ ...form, insuranceMemberId: event.target.value })} />
                  </label>
                  <label className="patients-form-field">
                    <span>Coverage expiry <b>*</b></span>
                    <input type="date" required value={form.insuranceExpires} onChange={(event) => setForm({ ...form, insuranceExpires: event.target.value })} />
                  </label>
                  {form.insuranceProvider === 'NHIS' && (
                    <label className="patients-form-field">
                      <span>NHIS dependant status</span>
                      <select value={form.isDependant} onChange={(event) => setForm({ ...form, isDependant: event.target.value })}>
                        <option value="">Not recorded</option>
                        <option value="0">Member (0)</option>
                        <option value="1">Dependant (1)</option>
                      </select>
                    </label>
                  )}
                </>
              )}
            </div>
            {formError && <p className="patients-form-error" role="alert">{formError}</p>}
            <div className="patients-form-note"><ShieldCheck size={15} /> Insurance status is calculated from provider and expiry date.</div>
            <div className="patients-modal-actions">
              <button className="button button--secondary" type="button" onClick={() => setModal('')}>Cancel</button>
              <button className="button button--primary" type="submit">{editingPatientId ? 'Save changes' : 'Create patient'}</button>
            </div>
          </form>
        </section>
      </div>
    )
  }

  return (
    <section className="patients-page" aria-labelledby="patients-title">
      <div className="patients-heading">
        <div>
          <div className="patients-eyebrow"><Users size={15} /> Care operations</div>
          <h1 id="patients-title">Patients</h1>
          <p>Patient directory and insurance coverage at a glance.</p>
        </div>
        {canCreatePatients && <button className="button button--primary" type="button" onClick={openNewPatient}>
          <Plus size={16} /> Register patient
        </button>}
      </div>


      <div className="patients-overview">
        <article className="patients-overview-card patients-overview-card--insured">
          <span><BadgeCheck size={14} /> Insured</span>
          <strong>{coverageCounts.Insured + coverageCounts['Near expiry']}</strong>
        </article>
        <article className="patients-overview-card patients-overview-card--uninsured">
          <span><ShieldAlert size={14} /> Non-insured</span>
          <strong>{coverageCounts['Non-insured']}</strong>
        </article>
      </div>

      <section className="patients-directory content-panel" aria-label="Patient directory">
        <div className="patients-directory-heading">
          <div>
            <div className="patients-list-title">
              <h2>Patient directory</h2>
              <span>{filteredPatients.length} records</span>
            </div>
            <p>Browse the complete registry. Select a card to open its patient page.</p>
          </div>
          <label className="patients-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search name, ID, phone or member no."
              value={query}
              onChange={(event) => { setQuery(event.target.value); resetPage() }}
              aria-label="Search patients"
            />
          </label>
        </div>

        <div className="patients-filterbar" aria-label="Patient filters">
          <label className="patients-filter">
            <span>Insurance</span>
            <select value={insuranceFilter} onChange={(event) => { setInsuranceFilter(event.target.value); resetPage() }}>
              <option>All coverage</option>
              <option>Insured</option>
              <option>Non-insured</option>
              <option>Near expiry</option>
            </select>
            <ChevronDown size={14} />
          </label>
          <label className="patients-filter">
            <span>Provider</span>
            <select value={providerFilter} onChange={(event) => { setProviderFilter(event.target.value); resetPage() }}>
              <option>All providers</option>
              {providerOptions.map((provider) => <option key={provider}>{provider}</option>)}
            </select>
            <ChevronDown size={14} />
          </label>
          <label className="patients-filter">
            <span>Gender</span>
            <select value={sexFilter} onChange={(event) => { setSexFilter(event.target.value); resetPage() }}>
              <option>All genders</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
            <ChevronDown size={14} />
          </label>
          <label className="patients-filter patients-filter--sort">
            <span>Sort by</span>
            <select value={sortOrder} onChange={(event) => { setSortOrder(event.target.value); resetPage() }}>
              <option value="recent">Recently added</option>
              <option value="oldest">Oldest added</option>
              <option value="name">Name A–Z</option>
            </select>
            <ChevronDown size={14} />
          </label>
          <button
            className="patients-clear-filters"
            type="button"
            onClick={() => {
              setQuery('')
              setInsuranceFilter('All coverage')
              setProviderFilter('All providers')
              setSexFilter('All genders')
              setSortOrder('recent')
              setPage(1)
            }}
          >
            Clear filters
          </button>
        </div>

        {pagePatients.length > 0 ? (
          <div className="patients-card-grid">
            {pagePatients.map((patient) => {
              const status = getPatientInsuranceStatus(patient)
              return (
                <button
                  type="button"
                  className="patient-card"
                  key={patient.id}
                  onClick={() => navigateToPatient(patient.id)}
                  aria-label={`Open ${patient.name}, ${patient.id}, ${status}`}
                >
                  <span className="patient-card-top">
                    <span className="patients-avatar">{initials(patient.name)}</span>
                    <span className={`patients-insurance-status patients-insurance-status--${status.toLowerCase().replace(' ', '-')}`}>
                      {status === 'Insured' ? <BadgeCheck size={13} /> : <ShieldAlert size={13} />}
                      {status}
                    </span>
                  </span>
                  <span className="patient-card-name">{patient.name}</span>
                  <span className="patient-card-id">{patient.id} <i /> {patient.sex}</span>
                  <span className="patient-card-contact">{patient.phone}</span>
                  <span className="patient-card-insurance">
                    <span>{patient.insuranceProvider || 'No insurance provider'}</span>
                    <strong>{status === 'Near expiry' ? `Expires ${formatDate(patient.insuranceExpires)}` : status === 'Insured' ? `Valid to ${formatDate(patient.insuranceExpires)}` : 'Coverage not active'}</strong>
                  </span>
                  <span className="patient-card-open">View patient <ChevronRight size={14} /></span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="patients-empty">
            <Search size={21} />
            <strong>No matching patients</strong>
            <span>Change your search or filters to see more results.</span>
          </div>
        )}

        <div className="patients-pagination">
          <span>
            Showing <strong>{filteredPatients.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filteredPatients.length)}</strong> of <strong>{filteredPatients.length}</strong> patients
            <i /> 50 per page
          </span>
          <div className="patients-page-controls">
            <button type="button" aria-label="Previous page" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              <ChevronLeft size={16} /> Previous
            </button>
            <span>Page <strong>{safePage}</strong> of <strong>{totalPages}</strong></span>
            <button type="button" aria-label="Next page" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {modal === 'form' && renderPatientForm()}
    </section>
  )
}

export default PatientsPage

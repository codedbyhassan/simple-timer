import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog, FolderTile, Icon, PageHeader, PropertyList } from '@ui'
import { ErrorNotice, SearchField, EmptyResult, FormField, uid, nameOf, patientFor, formatDate } from './ReceptionShared.jsx'
import { DOCUMENT_CATEGORIES, TODAY } from './receptionData.js'
import { deleteReceptionFile, getReceptionFile, saveReceptionFile } from './receptionFiles.js'
import './reception styles/shared.css'
import './reception styles/documents.css'

export default function DocumentsPage({ menu, data, error, commit }) {
  const [category, setCategory] = useState('All documents')
  const [patientId, setPatientId] = useState('All patients')
  const [query, setQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState(null)
  const [docName, setDocName] = useState('')
  const [docCategory, setDocCategory] = useState('Referrals')
  const [docPatient, setDocPatient] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const docs = data.documents.filter((doc) => (
    (category === 'All documents' || doc.category === category)
    && (patientId === 'All patients' || doc.patientId === patientId)
    && `${doc.name} ${doc.fileName} ${nameOf(patientFor(data, doc.patientId))}`.toLowerCase().includes(query.toLowerCase())
  ))
  const selected = data.documents.find((doc) => doc.id === selectedId)
  const upload = async (event) => {
    event.preventDefault()
    if (!file || !docPatient || !docName.trim()) { setFormError('Choose a patient, enter a document name and select a file.'); return }
    if (file.size > 20 * 1024 * 1024) { setFormError('Files must be 20 MB or smaller.'); return }
    setBusy(true)
    setFormError('')
    const id = uid('DOC')
    try {
      await saveReceptionFile(id, file)
      const doc = { id, patientId: docPatient, name: docName.trim(), category: docCategory, fileName: file.name, type: file.type || 'application/octet-stream', size: file.size, addedAt: TODAY, stored: true }
      if (!commit({ ...data, documents: [doc, ...data.documents] })) {
        await deleteReceptionFile(id)
        setFormError('The document details could not be saved. Check local storage and try again.')
        return
      }
      setSelectedId(id)
      setMessage(`${doc.name} added to ${nameOf(patientFor(data, docPatient))}’s documents.`)
      setShowUpload(false)
      setFile(null)
      setDocName('')
      setDocPatient('')
    } catch (uploadError) {
      setFormError(uploadError instanceof Error ? uploadError.message : 'Unable to save this document file.')
    } finally {
      setBusy(false)
    }
  }
  const download = async (doc) => {
    if (!doc?.stored) { setFormError('This sample record has no attached file.'); return }
    try {
      const blob = await getReceptionFile(doc.id)
      if (!blob) { setFormError('The stored file could not be found in this browser.'); return }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = doc.fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      setFormError('')
    } catch (downloadError) {
      setFormError(downloadError instanceof Error ? downloadError.message : 'Unable to open this document.')
    }
  }
  const remove = async (doc) => {
    if (!window.confirm(`Remove ${doc.name} from this patient's document list?`)) return
    try {
      if (doc.stored) await deleteReceptionFile(doc.id)
      if (commit({ ...data, documents: data.documents.filter((item) => item.id !== doc.id) })) { setSelectedId(''); setMessage(`${doc.name} removed from the list.`) }
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : 'Unable to remove the document.')
    }
  }
  const folderNames = ['All documents', ...DOCUMENT_CATEGORIES]

  return (
    <>
      <PageHeader title={menu.label} description="Keep referrals, identity cards and reports organised with each patient record." actions={<button type="button" className="hms-reception__button hms-reception__button--primary" onClick={() => { setShowUpload((open) => !open); setFormError(''); setMessage('') }}><Icon name="upload" size={16} />Add document</button>} />
      <div className="hms-reception">
        <ErrorNotice error={error} />
        {formError ? <div className="hms-reception__notice hms-reception__notice--error" role="alert"><Icon name="alertTriangle" size={17} />{formError}</div> : null}
        {message ? <div className="hms-reception__notice hms-reception__notice--success" role="status"><Icon name="checkCircle" size={17} />{message}</div> : null}
        <Dialog open={showUpload} title="File a patient document" description="Add a document to the selected patient's record." onClose={() => setShowUpload(false)} size="large"><form className="hms-reception__form-grid" onSubmit={upload}>
          <FormField label="Patient" value={docPatient} onChange={setDocPatient} options={[{ value: '', label: 'Choose patient' }, ...data.patients.map((patient) => ({ value: patient.id, label: `${nameOf(patient)} · ${patient.id}` }))]} required />
          <FormField label="Document category" value={docCategory} onChange={setDocCategory} options={DOCUMENT_CATEGORIES} />
          <FormField label="Document name" value={docName} onChange={setDocName} required placeholder="e.g. Specialist referral" />
          <label className="hms-reception__field"><span>Choose file</span><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0] || null)} required /><small>PDF, image or Word document · up to 20 MB</small></label>
          <p className="hms-reception__field--wide hms-reception__storage-note"><Icon name="info" size={16} />Files are stored in this browser’s local document library.</p>
          <div className="hms-reception__form-actions hms-reception__field--wide"><button type="button" className="hms-reception__button hms-reception__button--quiet" onClick={() => setShowUpload(false)}>Cancel</button><button type="submit" disabled={busy} className="hms-reception__button hms-reception__button--primary"><Icon name="upload" size={16} />{busy ? 'Saving file…' : 'Add to patient file'}</button></div>
        </form></Dialog>
        <div className="hms-reception__document-toolbar"><div className="hms-reception__breadcrumbs"><Link to="/reception/patients"><Icon name="users" size={15} />Patients</Link><Icon name="chevronRight" size={14} /><span>Documents</span>{category !== 'All documents' ? <><Icon name="chevronRight" size={14} /><span>{category}</span></> : null}</div><div><SearchField value={query} onChange={setQuery} placeholder="Search documents" /><label className="hms-reception__select-filter"><Icon name="users" size={15} /><select value={patientId} onChange={(event) => setPatientId(event.target.value)} aria-label="Filter documents by patient"><option>All patients</option>{data.patients.map((patient) => <option value={patient.id} key={patient.id}>{nameOf(patient)}</option>)}</select></label></div></div>
        <div className="hms-reception__folder-grid">{folderNames.map((name) => {
          const count = name === 'All documents' ? data.documents.length : data.documents.filter((doc) => doc.category === name).length
          return <FolderTile key={name} name={name} count={`${count} ${count === 1 ? 'document' : 'documents'}`} meta={name === 'All documents' ? 'Patient records' : 'Document category'} selected={category === name} preview={name === 'All documents' ? 'Patient file library' : undefined} onSelect={() => setCategory(name)} />
        })}</div>
        <div className="hms-reception__documents-layout">
          <section className="hms-reception__document-grid">
            {docs.map((doc) => {
              const patient = patientFor(data, doc.patientId)
              return <button type="button" key={doc.id} className={`hms-reception__document-card${selectedId === doc.id ? ' is-selected' : ''}`} onClick={() => setSelectedId(doc.id)}><span className="hms-reception__document-preview"><Icon name={doc.type.startsWith('image/') ? 'fileText' : 'fileText'} size={23} /></span><span className="hms-reception__document-copy"><strong>{doc.name}</strong><small>{nameOf(patient)} · {doc.category}</small><small>{doc.fileName} · {(doc.size / 1024).toFixed(0)} KB</small></span></button>
            })}
            {!docs.length ? <div className="hms-reception__field--wide"><EmptyResult icon="folder" title="No documents in this folder" /></div> : null}
          </section>
          <aside className="hms-reception__panel hms-reception__document-info">
            <header className="hms-reception__panel-head"><div><span className="hms-reception__eyebrow">Selected file</span><h2>{selected?.name || 'Document details'}</h2></div></header>
            {selected ? <><PropertyList title="File information" items={[{ label: 'Patient', value: nameOf(patientFor(data, selected.patientId)) }, { label: 'Category', value: selected.category }, { label: 'File name', value: selected.fileName }, { label: 'File size', value: `${(selected.size / 1024).toFixed(0)} KB` }, { label: 'Added', value: formatDate(selected.addedAt) }, { label: 'Storage', value: selected.stored ? 'Browser document library' : 'Sample record' }]} /><div className="hms-reception__button-row"><button type="button" className="hms-reception__button hms-reception__button--primary" onClick={() => download(selected)}><Icon name="download" size={16} />Download</button><button type="button" className="hms-reception__button hms-reception__button--quiet" onClick={() => remove(selected)} aria-label={`Remove ${selected.name}`}><Icon name="trash" size={16} /></button></div></> : <p className="hms-reception__panel-hint">Select a document to view its patient and file details.</p>}
          </aside>
        </div>
      </div>
    </>
  )
}

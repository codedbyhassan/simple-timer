import { useState } from 'react'
import { Dialog, Icon, PageHeader, StatusBadge } from '@ui'
import { ClaimsError, ClaimsNotice, ClaimsPanel, statusTone, uid } from './ClaimsShared.jsx'
import './claims styles/shared.css'
import './claims styles/mapping.css'

const examples = {
  'NHIA medicine tariff': ['NHIA-MED-0184', 'NHIA-MED-1120', 'NHIA-MED-2041'],
  'G-DRG': ['OPD-GEN-01', 'OPD-PED-01', 'IPD-MED-01'],
  'Department specialty': ['GEN-MED', 'PAED', 'OBGYN', 'DENT'],
}
export default function ClaimsMappingPage({ data, error, commit, can }) {
  const [targets, setTargets] = useState(Object.fromEntries(data.claims.mappings.map((item) => [item.id, item.target || ''])))
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [editingMappingId, setEditingMappingId] = useState('')
  const editingMapping = data.claims.mappings.find((item) => item.id === editingMappingId)
  const saveMapping = async (mapping) => {
    setMessage('')
    setActionError('')
    if (!can('claims.manage_mappings')) { setActionError('Your role cannot manage claim reference mappings.'); return }
    const target = (targets[mapping.id] || '').trim()
    if (!target) { setActionError(`Enter a target reference for ${mapping.source}.`); return }
    const now = new Date().toISOString()
    const claims = { ...data.claims, mappings: data.claims.mappings.map((item) => item.id === mapping.id ? { ...item, target, status: 'Mapped', mappedAt: now, mappedBy: 'Claims officer' } : item), activity: [{ id: uid('CACT'), message: `Mapping updated for ${mapping.source}.`, at: now }, ...data.claims.activity] }
    if (await commit({ ...data, claims })) {
      setMessage(`${mapping.source} mapping saved. Refresh affected claim snapshots to recalculate readiness.`)
      setEditingMappingId('')
    }
  }
  return <>
    <PageHeader title="Mapping queue" description="Resolve G-DRG, medicine tariff, and department-specialty reference gaps." />
    <div className="hms-claims">
      <ClaimsError error={error} />{message ? <ClaimsNotice tone="success">{message}</ClaimsNotice> : null}{actionError ? <ClaimsNotice tone="error">{actionError}</ClaimsNotice> : null}
      <ClaimsNotice>Example target codes are not an approved NHIA catalogue. Verify official mappings before use.</ClaimsNotice>
      <div className="hms-claims__mapping-grid">{data.claims.mappings.map((mapping) => <ClaimsPanel key={mapping.id} title={mapping.source} description={`${mapping.kind} · ${mapping.affectedClaims} affected claim(s)`} actions={<StatusBadge tone={statusTone(mapping.status)}>{mapping.status}</StatusBadge>}>
        <div className="hms-claims__mapping-form"><span className="hms-claims__muted">Target reference: <strong>{mapping.target || 'Not mapped'}</strong></span><button className="hms-claims__button" type="button" onClick={() => setEditingMappingId(mapping.id)} disabled={!can('claims.manage_mappings')}><Icon name="edit" size={15} />Edit mapping</button></div>
        <small className="hms-claims__muted">Mapping is applied to future snapshot validation; review affected claims after saving.</small>
      </ClaimsPanel>)}</div>
      {!data.claims.mappings.length ? <ClaimsPanel title="Mapping queue"><p className="hms-claims__muted">No mappings require review.</p></ClaimsPanel> : null}
      <Dialog open={Boolean(editingMapping)} title={`Map ${editingMapping?.source || ''}`} description="Choose a target reference and save the mapping." onClose={() => setEditingMappingId('')}>
        {editingMapping ? <div className="hms-claims__mapping-form"><label className="hms-claims__field"><span>Target reference</span><input list={`targets-${editingMapping.id}`} value={targets[editingMapping.id] || ''} onChange={(event) => setTargets((current) => ({ ...current, [editingMapping.id]: event.target.value }))} placeholder="Select or enter a reference code" /><datalist id={`targets-${editingMapping.id}`}>{(examples[editingMapping.kind] || []).map((code) => <option key={code} value={code} />)}</datalist></label><button className="hms-claims__button" type="button" onClick={() => saveMapping(editingMapping)}><Icon name="checkCircle" size={15} />Save mapping</button></div> : null}
      </Dialog>
    </div>
  </>
}

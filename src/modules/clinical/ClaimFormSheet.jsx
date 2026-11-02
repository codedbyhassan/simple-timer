import './ClaimFormSheet.css'

const blankRows = (items, minimum) => Array.from({ length: Math.max(items.length, minimum) }, (_, index) => items[index] || null)

function Boxes({ value = '', count, grow = false }) {
  const characters = Array.from(String(value || '').toUpperCase())
  const total = grow ? Math.max(count, characters.length) : count
  return (
    <span className="nhis-boxes">
      {Array.from({ length: total }, (_, index) => <span className="nhis-box" key={index}>{characters[index] || ''}</span>)}
    </span>
  )
}

function DateBoxes({ value = '' }) {
  const [year = '', month = '', day = ''] = String(value || '').slice(0, 10).split('-')
  return <span className="nhis-date"><Boxes value={day} count={2} /><i>/</i><Boxes value={month} count={2} /><i>/</i><Boxes value={year} count={4} /></span>
}

function Check({ checked = false, children }) {
  return <span className="nhis-check"><span className={checked ? 'nhis-tick nhis-tick--on' : 'nhis-tick'} />{children}</span>
}

function ageAt(dateOfBirth, serviceDate) {
  if (!dateOfBirth || !serviceDate) return ''
  const birth = new Date(`${dateOfBirth}T00:00:00Z`)
  const service = new Date(`${serviceDate}T00:00:00Z`)
  if (Number.isNaN(birth.getTime()) || Number.isNaN(service.getTime()) || birth > service) return ''
  let age = service.getUTCFullYear() - birth.getUTCFullYear()
  if (service.getUTCMonth() < birth.getUTCMonth()
    || (service.getUTCMonth() === birth.getUTCMonth() && service.getUTCDate() < birth.getUTCDate())) age -= 1
  return String(age)
}

function serviceType(value) {
  const type = String(value || '').toUpperCase()
  return {
    outpatient: type === 'OPD' || type === 'PHC',
    inpatient: type === 'IPD',
    diagnostic: type === 'DIA',
    pharmacy: false,
  }
}

function FormTable({ headings, rows, className = '' }) {
  return (
    <table className={`nhis-table ${className}`}>
      <thead><tr>{headings.map((heading, index) => <th key={`${heading}-${index}`}>{heading}</th>)}</tr></thead>
      <tbody>{rows}</tbody>
    </table>
  )
}

export default function ClaimFormSheet({ claim, generatedAt = '' }) {
  const types = serviceType(claim.typeOfService)
  const serviceDates = claim.dateOfService || []
  const serviceDate = serviceDates[0] || ''
  const procedureRows = blankRows(claim.procedure || [], 3)
  const diagnosisRows = blankRows(claim.diagnosis || [], 4)
  const investigationRows = blankRows(claim.investigation || [], 5)
  const medicineRows = blankRows(claim.medicine || [], 5)
  const gender = claim.gender === 'M' ? 'Male' : claim.gender === 'F' ? 'Female' : ''
  const claimDate = (generatedAt || serviceDate).slice(0, 10)

  return (
    <div className="claim-paper-viewport">
      <article className="claim-paper" aria-label="NHIS claim sheet, front page">
        <h1 className="nhis-title">NATIONAL HEALTH INSURANCE SCHEME</h1>
        <div className="nhis-split">
          <div className="nhis-form-meta"><div className="nhis-line"><span className="nhis-label nhis-small">Form No.</span></div><div className="nhis-line"><span className="nhis-label nhis-small">HI Code:</span><Boxes count={12} /></div><div className="nhis-ref">Local reference: {claim.claimID}</div></div>
        </div>
        <hr className="nhis-rule" />
        <div className="nhis-line"><span className="nhis-label nhis-width">Name of Scheme</span><Boxes value="NATIONAL HEALTH INSURANCE" count={26} grow /></div>
        <div className="nhis-line"><span className="nhis-label nhis-width">Claim Number</span><Boxes count={13} /><span className="nhis-label nhis-gap">Date of Claim</span><DateBoxes value={claimDate} /></div>
        <hr className="nhis-rule" />

        <h2 className="nhis-heading">Client Information</h2>
        <div className="nhis-split nhis-top">
          <div>
            <div className="nhis-line"><span className="nhis-label nhis-width">Surname</span><Boxes value={claim.surname} count={20} grow /></div>
            <div className="nhis-line"><span className="nhis-label nhis-width">Other Names</span><Boxes value={claim.otherNames} count={20} grow /></div>
          </div>
          <div className="nhis-gender"><div className="nhis-small">Gender</div><Check checked={gender === 'Male'}>Male</Check><Check checked={gender === 'Female'}>Female</Check></div>
        </div>
        <div className="nhis-line"><span className="nhis-label nhis-width">Date of Birth</span><DateBoxes value={claim.dateOfBirth} /><span className="nhis-label nhis-gap">Age</span><Boxes value={ageAt(claim.dateOfBirth, serviceDate)} count={2} /><span className="nhis-label nhis-gap">NHIS no.</span><Boxes value={claim.memberNo} count={10} grow /></div>
        <div className="nhis-line nhis-indent"><span className="nhis-label">Hospital Record No</span><Boxes value={claim.hospitalRecNo} count={9} grow /></div>
        <hr className="nhis-rule" />

        <h2 className="nhis-heading">Services Provided <em>(to be filled by all health care providers)</em></h2>
        <div className="nhis-columns">
          <div className="nhis-left-column">
            <div className="nhis-panel"><div className="nhis-small">Type of Service</div><div className="nhis-checks">
              <Check checked={types.outpatient}>Outpatient</Check><Check checked={types.pharmacy || claim.includesPharmacy === '1'}>Pharmacy</Check><Check checked={types.diagnostic}>Diagnostic</Check><Check checked={types.inpatient}>In-patient</Check>
            </div></div>
            <div className="nhis-panel nhis-checks"><Check>All Inclusive</Check><Check checked={claim.isUnbundled === '1'}>Unbundled</Check></div>
            <div className="nhis-panel"><div className="nhis-small">Outcome</div><div className="nhis-checks"><Check checked={claim.serviceOutcome === 'DISC'}>Discharged</Check><Check checked={claim.serviceOutcome === 'DIED'}>Died</Check><Check checked={claim.serviceOutcome === 'TFOT'}>Transferred Out</Check></div><Check checked={claim.serviceOutcome === 'ABSC'}>Absconded/Discharged against medical advice</Check></div>
          </div>
          <div className="nhis-right-column nhis-panel">
            <div className="nhis-small">Date(s) of Service Provision</div><div className="nhis-center nhis-small">DD/MM/YYYY</div>
            {[0, 1, 2, 3].map((index) => <div className="nhis-visit" key={index}><span className="nhis-label">{['1st Visit/Admission', '2nd Visit/Discharge', '3rd Visit', '4th Visit'][index]}</span><DateBoxes value={serviceDates[index]} /></div>)}
            <div className="nhis-visit"><span className="nhis-label">Duration(days)</span><Boxes count={3} /></div>
          </div>
        </div>
        <div className="nhis-panel nhis-attendance">
          <div className="nhis-small">Type of Attendance</div>
          <div className="nhis-split"><div className="nhis-checks"><Check checked={claim.typeOfAttendance === 'CFU'}>Chronic Follow-Up</Check><Check checked={claim.typeOfAttendance === 'EAE'}>Emergency/Acute Episode</Check></div><div className="nhis-line"><span className="nhis-label">Specialty Code:</span><Boxes value={(claim.specialtyAttended || []).join('')} count={4} grow /></div></div>
          <div className="nhis-line nhis-indent-wide"><span className="nhis-label">Specialty Description:</span><Boxes count={20} /></div>
        </div>
        <hr className="nhis-rule" />
        <h2 className="nhis-heading">Procedure(s) <em>(to be filled by all health care providers who have provided out or in-patient services)</em></h2>
        <FormTable className="nhis-procedures" headings={['', 'Description', 'Date', 'G-DRG']} rows={procedureRows.map((item, index) => (
          <tr key={index}><th>Procedure {index + 1}</th><td>{item?.diagnosis || ''}</td><td><DateBoxes value={item?.serviceDate} /></td><td><Boxes value={item?.gdrgCode || ''} count={7} grow /></td></tr>
        ))} />
        <div className="nhis-page-foot">{claim.hospitalName || ''} · Claim {claim.claimID}</div>
      </article>

      <article className="claim-paper" aria-label="NHIS claim sheet, reverse page">
        <h2 className="nhis-heading">Diagnosis(es) <em>(to be filled by all health care providers who have provided out or in-patient services)</em></h2>
        <FormTable className="nhis-diagnoses" headings={['', 'Description', 'ICD-10', 'G-DRG']} rows={diagnosisRows.map((item, index) => (
          <tr key={index}><th>Diagnosis {index + 1}</th><td>{item?.diagnosis || ''}</td><td><Boxes value={item?.icd10 || ''} count={7} grow /></td><td><Boxes value={item?.gdrgCode || ''} count={7} grow /></td></tr>
        ))} />

        <h2 className="nhis-heading nhis-gap-top">Investigations <em>(to be filled by all health care providers providing diagnostic services)</em></h2>
        <FormTable className="nhis-investigations" headings={['', 'Description', 'Date', 'G-DRG']} rows={investigationRows.map((item, index) => (
          <tr key={index}><th>Investigation {index + 1}</th><td>{item?.description || ''}</td><td><DateBoxes value={item?.serviceDate} /></td><td><Boxes value={item?.gdrgCode || ''} count={7} grow /></td></tr>
        ))} />

        <h2 className="nhis-heading nhis-gap-top">Medicines <em>(to be filled by all health care providers dispensing medicines)</em></h2>
        <FormTable className="nhis-medicines" headings={['#', 'Description', 'Price', 'Qty', 'Total Cost', 'Code']} rows={medicineRows.map((item, index) => {
          const directions = [item?.prescription?.dose, item?.prescription?.frequency, item?.prescription?.duration].filter(Boolean).join(' · ')
          return <tr key={index}><th>{index + 1}</th><td>{item ? <>{item.description || item.medicineCode}<small className="nhis-directions">{directions || item.prescription?.unparsed || ''}</small></> : ''}</td><td><Boxes count={4} /><i>.</i><Boxes count={2} /></td><td><Boxes value={item ? String(item.dispensedQty) : ''} count={3} grow /></td><td><Boxes count={4} /><i>.</i><Boxes count={2} /></td><td><Boxes value={item?.medicineCode || ''} count={7} grow /></td></tr>
        })} />

        <div className="nhis-summary-grid">
          <div><h2 className="nhis-heading">Claim Summary <em>(to be filled by all health care providers)</em></h2>
            <FormTable className="nhis-summary" headings={['', 'Type of Service', 'G-DRG/Code', 'Tariff Amount']} rows={[
              ['A', 'In-Patient', types.inpatient ? claim.principalGDRG : '', types.inpatient],
              ['B', 'Out-Patient', types.outpatient ? claim.principalGDRG : '', types.outpatient],
              ['C', 'Investigations', claim.investigation.length ? claim.investigation.map((item) => item.gdrgCode).filter(Boolean).join(', ') : '', Boolean(claim.investigation.length)],
              ['D', 'Pharmacy', claim.medicine.length ? claim.medicine.map((item) => item.medicineCode).filter(Boolean).join(', ') : '', Boolean(claim.medicine.length)],
            ].map(([label, description, code]) => <tr key={label}><th>{label}</th><td>{description}</td><td>{code}</td><td><Boxes count={4} /><i>.</i><Boxes count={2} /></td></tr>)} />
            <div className="nhis-total"><strong>TOTAL</strong><span><Boxes count={4} /><i>.</i><Boxes count={2} /></span></div>
          </div>
          <div className="nhis-signature"><div className="nhis-small nhis-center">Signature</div><div className="nhis-sign-box" /><div className="nhis-small nhis-center">Name</div><div className="nhis-sign-box" /><div className="nhis-tiny">(Health Facility Insurance Officer)</div></div>
        </div>
        <h2 className="nhis-heading nhis-gap-top">Scheme Use Only</h2>
        <div className="nhis-panel nhis-scheme">
          {[1, 2].map((row) => <div className="nhis-scheme-row" key={row}><span>Date Received</span><i /><span>Action {row}</span><i className="nhis-scheme-short" /><span>Date</span><i className="nhis-scheme-short" /><span>Signed</span><i /></div>)}
        </div>
        <div className="nhis-page-foot">Generated from the archived CLAIM-it XML · {claim.claimID}</div>
      </article>
    </div>
  )
}

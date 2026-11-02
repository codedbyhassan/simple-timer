const datePattern = /^\d{4}-\d{2}-\d{2}$/
const memberNumberPattern = /^(?:\d{8}|\d{10})$/
const gdrgPattern = /^[A-Z]{4}\d{2}[A-Z]$/
const icd10Pattern = /^[A-Z]\d{2}(?:\.\d{1,2})?$/
const serviceTypes = ['OPD', 'IPD', 'DIA', 'PHC']
const yesNo = ['0', '1']
const attendanceTypes = ['EAE', 'CFU', 'ANC', 'PNC']
const serviceOutcomes = ['DISC', 'DIED', 'TFOT', 'ABSC']
const specialties = ['ENTH', 'ASUR', 'DENT', 'OPHT', 'ORTH', 'MEDI', 'PAED', 'PSUR', 'OBGY', 'RSUR', 'OPDC']

function isValidDate(value) {
  if (!datePattern.test(value || '')) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function splitName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  return {
    surname: parts.length ? parts[parts.length - 1] : '',
    otherNames: parts.slice(0, -1).join(' '),
  }
}

export function getClaimPatientDefaults(patient) {
  const memberNo = patient.insuranceProvider === 'NHIS'
    ? (patient.insuranceMemberId || '').trim()
    : ''
  const dependantValue = patient.isDependant

  return {
    memberNo: memberNumberPattern.test(memberNo) ? memberNo : '',
    hospitalRecNo: patient.id || '',
    isDependant: dependantValue === true || dependantValue === '1'
      ? '1'
      : dependantValue === false || dependantValue === '0' ? '0' : '',
    typeOfService: 'OPD',
    claimCheckCode: '',
    admissionDate: '',
    dischargeDate: '',
    principalGDRG: '',
  }
}

function ageOnDate(dateOfBirth, serviceDate) {
  if (!isValidDate(dateOfBirth) || !isValidDate(serviceDate) || dateOfBirth > serviceDate) return null
  const birth = new Date(`${dateOfBirth}T00:00:00Z`)
  const service = new Date(`${serviceDate}T00:00:00Z`)
  let age = service.getUTCFullYear() - birth.getUTCFullYear()
  if (
    service.getUTCMonth() < birth.getUTCMonth() ||
    (service.getUTCMonth() === birth.getUTCMonth() && service.getUTCDate() < birth.getUTCDate())
  ) age -= 1
  return age
}

export function createClaimId() {
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  return `HMS-${Date.now()}-${random}`
}

export function createClaimFromEncounter({ patient, consultation, labOrders = [], prescriptions = [], fields }) {
  const { surname, otherNames } = splitName(patient.name)
  const serviceDate = (consultation.updatedAt || consultation.createdAt || '').slice(0, 10)
  const diagnoses = (consultation.diagnoses || []).map(({ gdrgCode, icd10, diagnosis }) => ({ gdrgCode, icd10, diagnosis }))
  const investigations = labOrders
    .filter((order) => order.status === 'Result ready')
    .map((order) => ({
      serviceDate: order.claimServiceDate || serviceDate,
      gdrgCode: order.claimGdrgCode || '',
      description: order.testName || '',
    }))
  const medicines = prescriptions
    .filter((prescription) => prescription.status === 'Dispensed')
    .map((prescription) => ({
      medicineCode: prescription.medicineCode || '',
      description: prescription.medication || '',
      dispensedQty: Number(prescription.dispensedQty ?? prescription.quantity),
      serviceDate: prescription.serviceDate || serviceDate,
      nhisCovered: Number.isFinite(prescription.billing?.nhisCovered) ? prescription.billing.nhisCovered : null,
      prescription: {
        dose: prescription.prescription?.dose || prescription.dose || '',
        frequency: prescription.prescription?.frequency || prescription.frequency || '',
        duration: prescription.prescription?.duration || prescription.duration || '',
        unparsed: prescription.prescription?.unparsed || '',
      },
    }))

  return {
    claimID: fields.claimID,
    claimCheckCode: fields.claimCheckCode.trim(),
    memberNo: fields.memberNo.trim(),
    surname,
    otherNames,
    dateOfBirth: patient.dob,
    gender: patient.sex === 'Male' ? 'M' : patient.sex === 'Female' ? 'F' : '',
    hospitalRecNo: fields.hospitalRecNo.trim(),
    isDependant: fields.isDependant,
    typeOfService: fields.typeOfService,
    includesPharmacy: medicines.length ? '1' : '0',
    dateOfService: fields.typeOfService === 'IPD'
      ? [fields.admissionDate || '', fields.dischargeDate || '']
      : serviceDate ? [serviceDate] : [],
    investigation: investigations,
    procedure: [],
    diagnosis: diagnoses,
    medicine: medicines,
    principalGDRG: fields.principalGDRG || '',
  }
}

export function validateClaim(claim) {
  const errors = []
  const warnings = []
  const addError = (field, message) => errors.push({ field, message })
  const addWarning = (field, message) => warnings.push({ field, message })

  if (!claim.claimID) addError('claimID', 'A globally unique claim ID is required.')
  if (!claim.memberNo) addError('memberNo', 'Enter the NHIS member number.')
  else if (!memberNumberPattern.test(claim.memberNo)) addError('memberNo', 'Member number must contain exactly 8 or 10 digits.')
  if (!claim.surname) addError('surname', 'Patient surname is required.')
  if (!claim.otherNames) addError('otherNames', 'Patient other names are required.')
  if (!claim.hospitalRecNo) addError('hospitalRecNo', 'Hospital record number is required.')
  if (!isValidDate(claim.dateOfBirth)) addError('dateOfBirth', 'Date of birth must be a real YYYY-MM-DD date.')
  if (!yesNo.includes(claim.isDependant)) addError('isDependant', 'Select whether the patient is a dependant (0 or 1).')
  if (!serviceTypes.includes(claim.typeOfService)) addError('typeOfService', 'Select a supported service type.')
  if (!Array.isArray(claim.dateOfService) || !claim.dateOfService.length) {
    addError('dateOfService', 'At least one service date is required.')
  } else {
    claim.dateOfService.forEach((value, index) => {
      if (!isValidDate(value)) addError(`dateOfService[${index}]`, 'Service date must be a real YYYY-MM-DD date.')
    })
    if (claim.typeOfService === 'IPD' && claim.dateOfService.length < 2) {
      addError('dateOfService', 'IPD claims require both admission and discharge dates.')
    }
  }
  const ageReferenceDate = (claim.dateOfService || []).find(isValidDate)
  const patientAge = ageReferenceDate ? ageOnDate(claim.dateOfBirth, ageReferenceDate) : null
  if (claim.dateOfBirth && ageReferenceDate && claim.dateOfBirth > ageReferenceDate) {
    addError('dateOfBirth', 'Date of birth cannot be after the claim service date.')
  }
  if (claim.claimCheckCode && !/^\d{5}$/.test(claim.claimCheckCode)) {
    addError('claimCheckCode', 'Claims check code must contain 5 digits.')
  }
  if (claim.gender && !['M', 'F'].includes(claim.gender)) addError('gender', 'Gender must be M or F.')
  if (claim.isUnbundled && !yesNo.includes(claim.isUnbundled)) addError('isUnbundled', 'isUnbundled must be 0 or 1.')
  if (claim.includesPharmacy && !yesNo.includes(claim.includesPharmacy)) addError('includesPharmacy', 'includesPharmacy must be 0 or 1.')
  if (claim.typeOfAttendance && !attendanceTypes.includes(claim.typeOfAttendance)) addError('typeOfAttendance', 'Choose a supported attendance type.')
  if (claim.serviceOutcome && !serviceOutcomes.includes(claim.serviceOutcome)) addError('serviceOutcome', 'Choose a supported service outcome.')
  ;(claim.specialtyAttended || []).forEach((value, index) => {
    if (!specialties.includes(value)) addError(`specialtyAttended[${index}]`, 'Choose a supported specialty.')
  })

  if (claim.typeOfService !== 'DIA' && !(claim.diagnosis || []).length) {
    addError('diagnosis', 'At least one coded diagnosis is required for OPD, IPD, and PHC claims.')
  }
  if (claim.typeOfService === 'DIA' && !(claim.investigation || []).length) {
    addError('investigation', 'At least one investigation is required for DIA claims.')
  }

  ;(claim.diagnosis || []).forEach((item, index) => {
    if (!item.gdrgCode) addError(`diagnosis[${index}].gdrgCode`, 'Diagnosis GDRG code is required.')
    else if (!gdrgPattern.test(item.gdrgCode)) addWarning(`diagnosis[${index}].gdrgCode`, 'GDRG format is unusual; check against the official billing master.')
    if (patientAge !== null && /^MEDI/i.test(item.gdrgCode || '') && patientAge < 12) {
      addError(`diagnosis[${index}].gdrgCode`, 'MEDI diagnosis codes apply to patients aged 12 or older on the service date.')
    }
    if (patientAge !== null && /^PAED/i.test(item.gdrgCode || '') && patientAge >= 12) {
      addError(`diagnosis[${index}].gdrgCode`, 'PAED diagnosis codes apply only to patients under 12 on the service date.')
    }
    if (!item.icd10) addError(`diagnosis[${index}].icd10`, 'ICD-10 code is required.')
    else if (!icd10Pattern.test(item.icd10)) addError(`diagnosis[${index}].icd10`, 'ICD-10 code format is invalid.')
    if (!item.diagnosis?.trim()) addError(`diagnosis[${index}].diagnosis`, 'Diagnosis description is required.')
  })

  ;(claim.investigation || []).forEach((item, index) => {
    if (!isValidDate(item.serviceDate)) addError(`investigation[${index}].serviceDate`, 'Investigation date must be a real YYYY-MM-DD date.')
    if (!item.gdrgCode) addError(`investigation[${index}].gdrgCode`, 'Investigation GDRG code is required.')
    else if (!gdrgPattern.test(item.gdrgCode)) addWarning(`investigation[${index}].gdrgCode`, 'GDRG format is unusual; check against the official billing master.')
  })

  ;(claim.procedure || []).forEach((item, index) => {
    if (!isValidDate(item.serviceDate)) addError(`procedure[${index}].serviceDate`, 'Procedure date must be a real YYYY-MM-DD date.')
    if (!item.gdrgCode) addError(`procedure[${index}].gdrgCode`, 'Procedure GDRG code is required.')
    const procedureAge = ageOnDate(claim.dateOfBirth, item.serviceDate)
    if (procedureAge !== null && /A$/i.test(item.gdrgCode || '') && procedureAge < 12) {
      addError(`procedure[${index}].gdrgCode`, 'Adult procedure codes apply to patients aged 12 or older on the procedure date.')
    }
    if (procedureAge !== null && /C$/i.test(item.gdrgCode || '') && procedureAge >= 12) {
      addError(`procedure[${index}].gdrgCode`, 'Child procedure codes apply only to patients under 12 on the procedure date.')
    }
    if (!item.icd10 || !icd10Pattern.test(item.icd10)) addError(`procedure[${index}].icd10`, 'A valid ICD-10 code is required.')
    if (!item.diagnosis?.trim()) addError(`procedure[${index}].diagnosis`, 'Procedure diagnosis is required.')
  })

  ;(claim.medicine || []).forEach((item, index) => {
    if (!item.medicineCode) addError(`medicine[${index}].medicineCode`, 'Medicine code is required.')
    if (!Number.isInteger(item.dispensedQty) || item.dispensedQty < 1) addError(`medicine[${index}].dispensedQty`, 'Dispensed quantity must be a positive whole number.')
    if (!isValidDate(item.serviceDate)) addError(`medicine[${index}].serviceDate`, 'Medicine service date must be a real YYYY-MM-DD date.')
    const prescription = item.prescription
    if (!prescription || (!(prescription.dose && prescription.frequency) && !prescription.unparsed)) {
      addError(`medicine[${index}].prescription`, 'A structured dose and frequency or an unparsed prescription is required.')
    }
  })

  const usedGdrgs = [
    ...(claim.procedure || []).map((item) => item.gdrgCode),
    ...(claim.diagnosis || []).map((item) => item.gdrgCode),
    ...(claim.investigation || []).map((item) => item.gdrgCode),
  ].filter(Boolean)
  if (claim.principalGDRG && !usedGdrgs.includes(claim.principalGDRG)) {
    addError('principalGDRG', 'Principal GDRG must match a GDRG used in this claim.')
  } else if (claim.typeOfService === 'IPD' && new Set(usedGdrgs).size > 1 && !claim.principalGDRG) {
    addError('principalGDRG', 'Principal GDRG is required for an IPD claim with multiple GDRGs.')
  }

  if (usedGdrgs.length || (claim.diagnosis || []).length) {
    addWarning('codeMasters', 'Validation checks the supplied schema and code format only; official NHIA/NHIS code master membership is not verified.')
  }
  return { errors, warnings }
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function textElement(tag, value) {
  return value === undefined || value === null || value === ''
    ? ''
    : `<${tag}>${escapeXml(value)}</${tag}>`
}

export function buildClaimXml(claim) {
  const scalarFields = [
    'claimID',
    'claimCheckCode',
    'preAuthorizationCodes',
    'physicianID',
    'memberNo',
    'surname',
    'otherNames',
    'dateOfBirth',
    'gender',
    'hospitalRecNo',
    'isDependant',
    'typeOfService',
    'isUnbundled',
    'includesPharmacy',
    'typeOfAttendance',
    'serviceOutcome',
  ]
  const scalarXml = scalarFields.map((field) => textElement(field, claim[field])).join('')
  const dateXml = (claim.dateOfService || []).map((value) => textElement('dateOfService', value)).join('')
  const specialtyXml = (claim.specialtyAttended || []).map((value) => textElement('specialtyAttended', value)).join('')
  const investigationXml = (claim.investigation || []).map((item) => `<investigation>${textElement('serviceDate', item.serviceDate)}${textElement('gdrgCode', item.gdrgCode)}</investigation>`).join('')
  const procedureXml = (claim.procedure || []).map((item) => `<procedure>${textElement('serviceDate', item.serviceDate)}${textElement('gdrgCode', item.gdrgCode)}${textElement('icd10', item.icd10)}${textElement('diagnosis', item.diagnosis)}</procedure>`).join('')
  const diagnosisXml = (claim.diagnosis || []).map((item) => `<diagnosis>${textElement('gdrgCode', item.gdrgCode)}${textElement('icd10', item.icd10)}${textElement('diagnosis', item.diagnosis)}</diagnosis>`).join('')
  const medicineXml = (claim.medicine || []).map((item) => {
    const prescription = item.prescription || {}
    const prescriptionXml = [
      textElement('dose', prescription.dose),
      textElement('frequency', prescription.frequency),
      textElement('duration', prescription.duration),
      textElement('unparsed', prescription.unparsed),
    ].join('')
    return `<medicine>${textElement('medicineCode', item.medicineCode)}${textElement('dispensedQty', item.dispensedQty)}${textElement('serviceDate', item.serviceDate)}<prescription>${prescriptionXml}</prescription></medicine>`
  }).join('')
  const principalXml = textElement('principalGDRG', claim.principalGDRG)
  const referralXml = claim.referralInfo
    ? `<referralInfo>${textElement('claimCheckCode', claim.referralInfo.claimCheckCode)}${textElement('facilityID', claim.referralInfo.facilityID)}${textElement('facilityName', claim.referralInfo.facilityName)}</referralInfo>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>\n<claims>\n  <claim>${scalarXml}${dateXml}${specialtyXml}${investigationXml}${procedureXml}${diagnosisXml}${medicineXml}${principalXml}${referralXml}</claim>\n</claims>`
}

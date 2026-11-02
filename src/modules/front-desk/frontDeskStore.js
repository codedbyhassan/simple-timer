import { getDemoPatients } from '../patients/patientStore.js'
import { createBrowserStore } from '../shared/browserStore.js'

const today = () => new Date().toISOString().slice(0, 10)

function seedAppointments() {
  const patients = getDemoPatients()
  /** @type {Array<[number, string, string, string, string]>} */
  const assignments = [
    [0, '08:30', 'General practice', 'Dr. K. Mensah', 'With clinician'],
    [1, '08:45', 'Outpatient', 'Dr. A. Owusu', 'In triage'],
    [2, '09:00', 'Paediatrics', 'Dr. E. Addo', 'Checked in'],
    [3, '09:15', 'General practice', 'Dr. K. Mensah', 'Checked in'],
    [4, '09:30', 'Cardiology', 'Dr. A. Owusu', 'Scheduled'],
    [5, '09:45', 'General practice', 'Dr. K. Mensah', 'Scheduled'],
    [6, '10:00', 'Paediatrics', 'Dr. E. Addo', 'Scheduled'],
    [7, '10:15', 'Outpatient', 'Dr. A. Owusu', 'Scheduled'],
    [8, '10:30', 'General practice', 'Dr. K. Mensah', 'Scheduled'],
    [9, '11:00', 'Cardiology', 'Dr. A. Owusu', 'Scheduled'],
    [10, '11:30', 'Outpatient', 'Dr. E. Addo', 'Scheduled'],
    [11, '13:00', 'General practice', 'Dr. K. Mensah', 'Scheduled'],
  ]

  return assignments.map(([patientIndex, time, department, clinician, status], index) => {
    const patient = patients[patientIndex]
    return {
      id: `APT-${String(2600 + index)}`,
      patientId: patient.id,
      patientName: patient.name,
      phone: patient.phone,
      time,
      date: today(),
      department,
      clinician,
      visitType: index % 3 === 0 ? 'Follow-up' : 'General consultation',
      status,
      checkedInAt: ['With clinician', 'In triage', 'Checked in'].includes(status) ? time : '',
      source: 'Sample appointment',
    }
  })
}

const appointmentStore = createBrowserStore({
  key: 'appointments',
  seed: seedAppointments,
  validate: (value) => Array.isArray(value) && value.every((appointment) =>
    appointment && typeof appointment.id === 'string' && typeof appointment.patientId === 'string',
  ),
})

export function getAppointments() {
  return appointmentStore.getSnapshot()
}

export function updateAppointments(updater) {
  appointmentStore.update(updater)
}

export function subscribeToAppointments(listener) {
  return appointmentStore.subscribe(listener)
}

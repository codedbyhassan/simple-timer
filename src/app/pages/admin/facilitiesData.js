export const ADMIN_DEPARTMENTS = [
  { name: 'Emergency', activity: 86, visits: 42, state: 'Busy', tone: 'warning', wards: 1, lead: 'Emergency services' },
  { name: 'Outpatient', activity: 68, visits: 128, state: 'On track', tone: 'success', wards: 1, lead: 'Outpatient services' },
  { name: 'Maternity', activity: 54, visits: 31, state: 'On track', tone: 'success', wards: 1, lead: 'Maternity services' },
  { name: 'Laboratory', activity: 77, visits: 96, state: 'Busy', tone: 'warning', wards: 0, lead: 'Diagnostics' },
  { name: 'Inpatient', activity: 72, visits: 41, state: 'On track', tone: 'success', wards: 5, lead: 'Inpatient care' },
]

export const ADMIN_WARDS = [
  { name: 'Emergency observation', department: 'Emergency', capacity: 24, occupied: 19, status: 'Open' },
  { name: 'Outpatient recovery', department: 'Outpatient', capacity: 20, occupied: 12, status: 'Open' },
  { name: 'Maternity', department: 'Maternity', capacity: 56, occupied: 41, status: 'Open' },
  { name: 'Medical A', department: 'Inpatient', capacity: 48, occupied: 36, status: 'Open' },
  { name: 'Medical B', department: 'Inpatient', capacity: 48, occupied: 34, status: 'Open' },
  { name: 'Surgical', department: 'Inpatient', capacity: 64, occupied: 49, status: 'Open' },
  { name: 'Paediatrics', department: 'Inpatient', capacity: 42, occupied: 28, status: 'Open' },
  { name: 'Intensive care', department: 'Inpatient', capacity: 24, occupied: 19, status: 'Near capacity' },
]

export const ADMIN_BEDS = ADMIN_WARDS.flatMap((ward) => {
  const prefix = ward.name.split(/\s+/).map((part) => part.slice(0, 3).toUpperCase()).join('-')
  return Array.from({ length: ward.capacity }, (_, index) => ({
    name: `${prefix}-${String(index + 1).padStart(2, '0')}`,
    ward: ward.name,
    type: ward.name === 'Intensive care' ? 'Critical care' : ward.name === 'Paediatrics' ? 'Paediatric' : 'Standard',
    status: index < ward.occupied ? 'Occupied' : 'Available',
    since: index < ward.occupied ? (index % 2 ? 'Yesterday' : 'Today') : '—',
  }))
})

export const ADMIN_BED_TOTALS = ADMIN_WARDS.reduce((totals, ward) => ({
  capacity: totals.capacity + ward.capacity,
  occupied: totals.occupied + ward.occupied,
}), { capacity: 0, occupied: 0 })

import { describe, expect, test } from 'bun:test'
import { alreadyCharged, bedDayCharge, billableBedDays, consultationCharge, findPrice } from './charges.js'

const data = { cashier: { prices: [{ name: 'OPD Consultation', amount: 50 }, { name: 'General ward bed', category: 'Inpatient', amount: 120 }] } }

describe('automatic charges', () => {
  test('a stay under 24 hours bills one bed day', () => {
    expect(billableBedDays('2026-01-01T08:00:00Z', '2026-01-01T20:00:00Z')).toBe(1)
  })
  test('a stay of 2 days and 1 hour bills three bed days', () => {
    expect(billableBedDays('2026-01-01T08:00:00Z', '2026-01-03T09:00:00Z')).toBe(3)
  })
  test('bed charge multiplies the catalogue bed rate by days', () => {
    const charge = bedDayCharge(data, { patientId: 'P1', admittedAt: '2026-01-01T08:00:00Z', dischargedAt: '2026-01-03T09:00:00Z', reference: 'ADM1' })
    expect(charge.billed).toBe(360)
    expect(charge.status).toBe('Unpaid')
  })
  test('consultation charge uses the catalogue consultation price', () => {
    expect(consultationCharge(data, { id: 'E1', patientId: 'P1' }).billed).toBe(50)
  })
  test('missing catalogue price falls back to zero', () => {
    expect(findPrice([], ['consultation'])).toBe(0)
  })
  test('duplicate charges are detected', () => {
    expect(alreadyCharged([{ source: 'Consultation', orderId: 'E1' }], 'Consultation', 'E1')).toBe(true)
  })
})

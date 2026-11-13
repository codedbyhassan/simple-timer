// Automatic charge posting shared by every clinical workspace.
// Prices come from the admin service catalogue (data.cashier.prices).

const DAY_MS = 86_400_000

export function findPrice(prices, keywords, fallback = 0) {
  const list = Array.isArray(prices) ? prices : []
  const words = keywords.map((word) => word.toLowerCase())
  const match = list.find((item) => {
    const text = `${item.name || ''} ${item.category || ''} ${item.code || ''}`.toLowerCase()
    return words.some((word) => text.includes(word))
  })
  const amount = Number(match?.amount ?? match?.price ?? fallback)
  return Number.isFinite(amount) ? amount : fallback
}

// Every started 24-hour period counts as one bed day, minimum one day.
export function billableBedDays(admittedAt, dischargedAt) {
  const start = new Date(admittedAt).getTime()
  const end = new Date(dischargedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1
  return Math.max(1, Math.ceil((end - start) / DAY_MS))
}

const invoiceId = () => `INV-${globalThis.crypto?.randomUUID?.().slice(0, 8).toUpperCase() || Math.random().toString(36).slice(2, 10).toUpperCase()}`

export function makeCharge({ patientId, description, billed, source, reference, at }) {
  return {
    id: invoiceId(),
    patientId,
    date: (at || new Date().toISOString()).slice(0, 10),
    description,
    billed: Number(Number(billed || 0).toFixed(2)),
    paid: 0,
    method: '—',
    status: 'Unpaid',
    source,
    orderId: reference,
  }
}

export function consultationCharge(data, encounter, at) {
  const fee = findPrice(data.cashier?.prices, ['consultation', 'opd'])
  return makeCharge({ patientId: encounter.patientId, description: `Consultation · ${encounter.department || 'OPD'}`, billed: fee, source: 'Consultation', reference: encounter.id, at })
}

export function bedDayCharge(data, { patientId, admittedAt, dischargedAt, wardName, reference }) {
  const rate = findPrice(data.cashier?.prices, ['bed', 'ward', 'admission'])
  const days = billableBedDays(admittedAt, dischargedAt)
  return makeCharge({ patientId, description: `Bed stay · ${wardName || 'Ward'} · ${days} day${days === 1 ? '' : 's'} @ GHS ${rate.toFixed(2)}`, billed: rate * days, source: 'Inpatient', reference, at: dischargedAt })
}

// Prevents posting the same charge twice for one encounter or admission.
export const alreadyCharged = (payments, source, reference) => (payments || []).some((item) => item.source === source && item.orderId === reference)

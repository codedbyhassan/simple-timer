const localDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const TODAY = localDate(new Date())
export const TOMORROW = localDate(new Date(Date.now() + 86_400_000))

// A new local installation starts empty. Records are created by staff through the workflows.
export const RECEPTION_SEED = {
  patients: [],
  appointments: [],
  queue: [],
  payments: [],
  documents: [],
}

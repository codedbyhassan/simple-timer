import { useCallback, useEffect, useState } from 'react'
import { DOCTOR_SEED } from './doctorData.js'

const STORAGE_KEY = 'hms.reception.workspace.v1'
const isWorkspace = (value) => value && typeof value === 'object'
  && Array.isArray(value.patients) && Array.isArray(value.queue)
  && Array.isArray(value.appointments) && Array.isArray(value.payments) && Array.isArray(value.documents)
const isDoctorData = (value) => value && typeof value === 'object'
  && Array.isArray(value.drafts) && Array.isArray(value.activity)

function readWorkspace() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === null) return { data: DOCTOR_SEED, error: '' }
    const parsed = JSON.parse(saved)
    if (!isWorkspace(parsed)) throw new Error('Saved hospital workspace data is not in the expected format.')
    return {
      data: {
        ...DOCTOR_SEED,
        ...parsed,
        doctor: isDoctorData(parsed.doctor) ? { ...DOCTOR_SEED.doctor, ...parsed.doctor, reviewedResults: parsed.doctor.reviewedResults || [] } : DOCTOR_SEED.doctor,
      },
      error: '',
    }
  } catch (error) {
    return { data: DOCTOR_SEED, error: error instanceof Error ? error.message : 'Unable to load Doctor workspace data.' }
  }
}

export default function useDoctorWorkspace() {
  const [initial] = useState(readWorkspace)
  const [data, setData] = useState(initial.data)
  const [error, setError] = useState(initial.error)

  useEffect(() => {
    const refresh = () => {
      const current = readWorkspace()
      setData(current.data)
      setError(current.error)
    }
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('hms:workspace-updated', refresh)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('hms:workspace-updated', refresh)
    }
  }, [])

  const commit = useCallback((next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setData(next)
      setError('')
      window.dispatchEvent(new Event('hms:workspace-updated'))
      return true
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save Doctor changes on this device.')
      return false
    }
  }, [])

  return { data, error, commit }
}

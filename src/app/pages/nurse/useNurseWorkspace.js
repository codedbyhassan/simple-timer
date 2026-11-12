import { useCallback, useEffect, useState } from 'react'
import { NURSE_SEED } from './nurseData.js'

const STORAGE_KEY = 'hms.reception.workspace.v1'
const isWorkspace = (value) => value && typeof value === 'object'
  && Array.isArray(value.patients) && Array.isArray(value.queue)
  && Array.isArray(value.appointments) && Array.isArray(value.payments) && Array.isArray(value.documents)
const isNurseData = (value) => value && typeof value === 'object'
  && Array.isArray(value.wards) && Array.isArray(value.beds) && Array.isArray(value.tasks)
  && Array.isArray(value.admissions) && Array.isArray(value.discharges) && Array.isArray(value.activity)

function readWorkspace() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === null) return { data: NURSE_SEED, error: '' }
    const parsed = JSON.parse(saved)
    if (!isWorkspace(parsed)) throw new Error('Saved hospital workspace data is not in the expected format.')
    return {
      data: { ...NURSE_SEED, ...parsed, nurse: isNurseData(parsed.nurse) ? parsed.nurse : NURSE_SEED.nurse },
      error: '',
    }
  } catch (error) {
    return { data: NURSE_SEED, error: error instanceof Error ? error.message : 'Unable to load nursing workspace data.' }
  }
}

export default function useNurseWorkspace() {
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
      setError(saveError instanceof Error ? saveError.message : 'Unable to save nursing changes on this device.')
      return false
    }
  }, [])

  return { data, error, commit }
}

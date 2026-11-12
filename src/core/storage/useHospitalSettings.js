import { useEffect, useState } from 'react'
import { readDocument, subscribeToDocument } from './localDatabase.js'

export const HOSPITAL_SETTINGS_DEFAULTS = [
  { id: 'patient_wait_warning', group: 'Patient flow', label: 'Waiting-time warning', description: 'Flag patients who wait longer than this threshold.', value: '25', unit: 'minutes', type: 'number' },
  { id: 'bed_occupancy_warning', group: 'Capacity', label: 'High bed occupancy', description: 'Notify management when ward occupancy reaches this level.', value: '85', unit: '%', type: 'number' },
  { id: 'lab_turnaround_target', group: 'Laboratory', label: 'Standard lab turnaround target', description: 'Default target used in lab performance reports.', value: '150', unit: 'minutes', type: 'number' },
  { id: 'nhis_expiry_warning', group: 'Claims', label: 'Insurance expiry warning', description: 'Show a warning before a patient’s cover expires.', value: '60', unit: 'days', type: 'number' },
  { id: 'low_stock_alerts', group: 'Inventory', label: 'Low-stock alerts', description: 'Show stock alerts when inventory reaches reorder level.', value: true, type: 'toggle' },
]

const DEFAULT_VALUES = Object.fromEntries(HOSPITAL_SETTINGS_DEFAULTS.map((item) => [item.id, item.value]))

export default function useHospitalSettings() {
  const [settings, setSettings] = useState(DEFAULT_VALUES)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let alive = true
    const refresh = async () => {
      try {
        const stored = await readDocument('admin.settings')
        if (alive) setSettings({ ...DEFAULT_VALUES, ...(stored && typeof stored === 'object' ? stored : {}) })
      } catch {
        // Defaults remain available when the local settings document cannot be read.
      } finally {
        if (alive) setLoaded(true)
      }
    }
    refresh()
    const unsubscribe = subscribeToDocument('admin.settings', refresh)
    return () => { alive = false; unsubscribe() }
  }, [])
  return { settings, loaded }
}

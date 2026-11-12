import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon, PageHeader, StatusBadge } from '@ui'
import { ADMIN_BEDS, ADMIN_BED_TOTALS, ADMIN_DEPARTMENTS, ADMIN_WARDS } from './facilitiesData.js'
import './admin styles/facilities.css'

const TABS = [
  { id: 'departments', label: 'Departments', count: ADMIN_DEPARTMENTS.length },
  { id: 'wards', label: 'Wards', count: ADMIN_WARDS.length },
  { id: 'beds', label: 'Beds', count: ADMIN_BEDS.length },
]

const toneForStatus = (status) => {
  if (status === 'Occupied' || status === 'Near capacity') return 'warning'
  if (status === 'Cleaning' || status === 'Maintenance') return 'critical'
  if (status === 'Available' || status === 'Open' || status === 'On track') return 'success'
  return 'neutral'
}

function Table({ headers, children }) {
  return (
    <div className="hms-facilities__table-wrap">
      <table className="hms-facilities__table">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function DepartmentRows({ rows }) {
  return rows.map((department) => (
    <tr key={department.name}>
      <td><span className="hms-facilities__primary">{department.name}</span><span className="hms-facilities__secondary">{department.lead}</span></td>
      <td>{department.wards}</td>
      <td>{department.visits}</td>
      <td>
        <div className="hms-facilities__activity">
          <div className="hms-facilities__track"><span style={{ width: `${department.activity}%` }} /></div>
          <span>{department.activity}%</span>
        </div>
      </td>
      <td><StatusBadge tone={toneForStatus(department.state)}>{department.state}</StatusBadge></td>
    </tr>
  ))
}

function WardRows({ rows }) {
  return rows.map((ward) => {
    const available = ward.capacity - ward.occupied
    const occupancy = Math.round((ward.occupied / ward.capacity) * 100)
    return (
      <tr key={ward.name}>
        <td><span className="hms-facilities__primary">{ward.name}</span></td>
        <td>{ward.department}</td>
        <td>{ward.capacity}</td>
        <td>{ward.occupied}</td>
        <td>{available}</td>
        <td>
          <div className="hms-facilities__occupancy">
            <div className="hms-facilities__track"><span style={{ width: `${occupancy}%` }} /></div>
            <span>{occupancy}%</span>
          </div>
        </td>
        <td><StatusBadge tone={toneForStatus(ward.status)}>{ward.status}</StatusBadge></td>
      </tr>
    )
  })
}

function BedRows({ rows }) {
  return rows.map((bed) => (
    <tr key={bed.name}>
      <td><span className="hms-facilities__primary">{bed.name}</span></td>
      <td>{bed.ward}</td>
      <td>{bed.type}</td>
      <td><StatusBadge tone={toneForStatus(bed.status)}>{bed.status}</StatusBadge></td>
      <td>{bed.since}</td>
    </tr>
  ))
}

export default function FacilitiesPage({ menu }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('view')
  const [tab, setTab] = useState(TABS.some((item) => item.id === requestedTab) ? requestedTab : 'departments')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  const source = tab === 'departments' ? ADMIN_DEPARTMENTS : tab === 'wards' ? ADMIN_WARDS : ADMIN_BEDS
  const rows = useMemo(() => source.filter((item) => {
    const text = Object.values(item).join(' ').toLowerCase()
    const matchesQuery = text.includes(query.trim().toLowerCase())
    const itemStatus = tab === 'departments' ? item.state : tab === 'wards' ? item.status : item.status
    return matchesQuery && (status === 'all' || itemStatus === status)
  }), [query, source, status, tab])

  const occupancy = Math.round((ADMIN_BED_TOTALS.occupied / ADMIN_BED_TOTALS.capacity) * 100)
  const tabName = TABS.find((item) => item.id === tab)?.label.toLowerCase()

  return (
    <>
      <PageHeader title={menu.label} description={menu.summary} />

      <div className="hms-facilities">
        <section className="hms-facilities__capacity" aria-label="Facility bed capacity">
          <div className="hms-facilities__capacity-copy">
            <span className="hms-facilities__eyebrow">Current capacity</span>
            <h2>Bed occupancy</h2>
            <p>{ADMIN_BED_TOTALS.occupied} occupied of {ADMIN_BED_TOTALS.capacity} total beds</p>
          </div>
          <div className="hms-facilities__capacity-score">{occupancy}<span>%</span></div>
          <div className="hms-facilities__capacity-bar" role="img" aria-label={`${occupancy}% of beds occupied`}>
            <span style={{ width: `${occupancy}%` }} />
          </div>
          <div className="hms-facilities__capacity-legend">
            <span><i className="is-occupied" /> Occupied <strong>{ADMIN_BED_TOTALS.occupied}</strong></span>
            <span><i className="is-available" /> Available <strong>{ADMIN_BED_TOTALS.capacity - ADMIN_BED_TOTALS.occupied}</strong></span>
          </div>
        </section>

        <section className="hms-facilities__directory" aria-label="Facility directory">
          <div className="hms-facilities__tabs" role="group" aria-label="Facility records">
            {TABS.map((item) => (
              <button
                type="button"
                aria-pressed={tab === item.id}
                className={`hms-facilities__tab${tab === item.id ? ' is-active' : ''}`}
                key={item.id}
                onClick={() => { setTab(item.id); setStatus('all'); setSearchParams({ view: item.id }) }}
              >
                {item.label}<span>{item.count}</span>
              </button>
            ))}
          </div>

          <div className="hms-facilities__toolbar">
            <label className="hms-facilities__search">
              <Icon name="search" size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tabName}`} aria-label={`Search ${tabName}`} />
              {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="x" size={14} /></button> : null}
            </label>
            <label className="hms-facilities__filter">
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
                <option value="all">All statuses</option>
                {(tab === 'departments' ? ['Busy', 'On track'] : tab === 'wards' ? ['Open', 'Near capacity'] : ['Occupied', 'Available']).map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
            </label>
            <span className="hms-facilities__result-count">{rows.length} {rows.length === 1 ? 'result' : 'results'}</span>
          </div>

          {tab === 'departments' ? (
            <Table headers={['Department', 'Wards', 'Visits today', 'Activity', 'Status']}>
              <DepartmentRows rows={rows} />
            </Table>
          ) : null}
          {tab === 'wards' ? (
            <Table headers={['Ward', 'Department', 'Beds', 'Occupied', 'Available', 'Occupancy', 'Status']}>
              <WardRows rows={rows} />
            </Table>
          ) : null}
          {tab === 'beds' ? (
            <Table headers={['Bed ID', 'Ward', 'Bed type', 'Status', 'Since']}>
              <BedRows rows={rows} />
            </Table>
          ) : null}

          {rows.length === 0 ? (
            <div className="hms-facilities__empty">
              <Icon name="search" size={20} />
              <strong>No matching {tabName}</strong>
              <span>Try changing the search or status filter.</span>
            </div>
          ) : null}
        </section>
      </div>
    </>
  )
}

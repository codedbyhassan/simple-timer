import { Link } from 'react-router-dom'
import { ChartCard, Icon, PageHeader, PillBarChart, StatusBadge } from '@ui'
import { ADMIN_BED_TOTALS, ADMIN_DEPARTMENTS } from './facilitiesData.js'
import './admin styles/managementdashboard.css'

const attention = [
  { title: 'Refund approvals', detail: '3 requests waiting for review', icon: 'creditCard', tone: 'warning' },
  { title: 'Inventory adjustments', detail: '2 changes need a second approver', icon: 'packageBox', tone: 'warning' },
  { title: 'Critical lab results', detail: '1 result awaiting acknowledgement', icon: 'alertTriangle', tone: 'critical' },
]

const activity = [
  { title: 'Role permissions reviewed', detail: 'Hospital administrator · 10:42', icon: 'keyRound' },
  { title: 'Ward capacity updated', detail: 'Facilities · 09:18', icon: 'bed' },
  { title: 'Monthly report generated', detail: 'Finance · 08:55', icon: 'barChart' },
]

export default function ManagementDashboardPage({ menu }) {
  const occupancy = Math.round((ADMIN_BED_TOTALS.occupied / ADMIN_BED_TOTALS.capacity) * 100)

  return (
    <>
      <PageHeader title={menu.label} description={menu.summary} />

      <div className="hms-admin-dashboard">
        <section className="hms-admin-dashboard__snapshot" aria-label="Today's hospital snapshot">
          <div className="hms-admin-dashboard__snapshot-head">
            <div>
              <p className="hms-admin-dashboard__eyebrow">Friday, 6 November 2026</p>
              <h2>Hospital at a glance</h2>
            </div>
            <StatusBadge tone="success">Services operational</StatusBadge>
          </div>
          <div className="hms-admin-dashboard__figures">
            <div><span>Patients seen</span><strong>146</strong><small>today</small></div>
            <div><span>Appointments</span><strong>84</strong><small>scheduled today</small></div>
            <div><span>Beds occupied</span><strong>{ADMIN_BED_TOTALS.occupied} <small>/ {ADMIN_BED_TOTALS.capacity}</small></strong><small>{occupancy}% occupancy</small></div>
            <div><span>Open incidents</span><strong>7</strong><small>2 require follow-up</small></div>
          </div>
        </section>

        <div className="hms-admin-dashboard__body">
          <div className="hms-admin-dashboard__main">
            <ChartCard eyebrow="Hospital operations" title="Weekly patient activity">
              <PillBarChart
                label="Patients seen by day this week"
                unit="patients"
                height={184}
                data={[
                  { label: 'Mon', value: 128 },
                  { label: 'Tue', value: 154 },
                  { label: 'Wed', value: 139 },
                  { label: 'Thu', value: 139 },
                  { label: 'Fri', value: 146 },
                  { label: 'Sat', value: 0 },
                  { label: 'Sun', value: 0 },
                ]}
              />
            </ChartCard>

            <ChartCard eyebrow="Service delivery" title="Department activity">
              <div className="hms-admin-dashboard__departments">
                {ADMIN_DEPARTMENTS.map((department) => (
                  <div className="hms-admin-dashboard__department" key={department.name}>
                    <div className="hms-admin-dashboard__department-label">
                      <Link to="/admin/facilities?view=departments">{department.name}</Link>
                      <span>{department.visits} visits</span>
                    </div>
                    <div className="hms-admin-dashboard__track" aria-label={`${department.name} activity ${department.activity}%`}>
                      <span style={{ width: `${department.activity}%` }} />
                    </div>
                    <StatusBadge tone={department.tone}>{department.state}</StatusBadge>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <aside className="hms-admin-dashboard__side">
            <ChartCard eyebrow="Leadership attention" title="Needs review">
              <ul className="hms-admin-dashboard__attention">
                {attention.map((item) => (
                  <li key={item.title}>
                    <span className={`hms-admin-dashboard__item-icon is-${item.tone}`}><Icon name={item.icon} size={17} /></span>
                    <span className="hms-admin-dashboard__item-copy">
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <Icon name="chevronRight" size={16} />
                  </li>
                ))}
              </ul>
            </ChartCard>

            <ChartCard eyebrow="Administration" title="Recent activity">
              <ul className="hms-admin-dashboard__activity">
                {activity.map((item) => (
                  <li key={item.title}>
                    <span className="hms-admin-dashboard__activity-icon"><Icon name={item.icon} size={16} /></span>
                    <span className="hms-admin-dashboard__item-copy">
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </ChartCard>

            <Link to="/admin/facilities?view=wards" className="hms-admin-dashboard__occupancy">
              <div className="hms-admin-dashboard__occupancy-head">
                <span className="hms-admin-dashboard__occupancy-icon"><Icon name="bed" size={18} /></span>
                <span><strong>Bed occupancy</strong><small>All wards</small></span>
                <b>{occupancy}%</b>
              </div>
              <div className="hms-admin-dashboard__track"><span style={{ width: `${occupancy}%` }} /></div>
              <div className="hms-admin-dashboard__occupancy-foot"><span>{ADMIN_BED_TOTALS.occupied} occupied</span><span>{ADMIN_BED_TOTALS.capacity - ADMIN_BED_TOTALS.occupied} available</span></div>
            </Link>
          </aside>
        </div>
      </div>
    </>
  )
}

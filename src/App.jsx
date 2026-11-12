import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider, ToastProvider } from '@ui'
import { AuthProvider, GuestRoute, ProtectedRoute } from '@core/auth'
import { AccessProvider } from '@core/access/AccessProvider.jsx'
import { WORKSPACES, workspaceHome } from '@core/access/navigation.js'
import { NotificationsProvider } from '@core/notifications/NotificationsProvider.jsx'
import { SignInPage } from '@modules/auth'
import AppLayout from './app/AppLayout.jsx'
import ManagementDashboardPage from './app/pages/admin/ManagementDashboardPage.jsx'
import HospitalProfilePage from './app/pages/admin/HospitalProfilePage.jsx'
import FacilitiesPage from './app/pages/admin/FacilitiesPage.jsx'
import AccessManagementPage from './app/pages/admin/AccessManagementPage.jsx'
import UserDetailPage from './app/pages/admin/UserDetailPage.jsx'
import AdminMenuStub from './app/pages/admin/AdminMenuStub.jsx'
import AdminOperationsPage from './app/pages/admin/AdminOperationsPage.jsx'
import AdminRecordDetailPage from './app/pages/admin/AdminRecordDetailPage.jsx'
import ScrollToTop from './app/ScrollToTop.jsx'
import MenuStub from './app/pages/MenuStub.jsx'
import Guarded from './app/pages/Guarded.jsx'
import HomeRedirect from './app/pages/HomeRedirect.jsx'
import ProfilePage from './app/pages/ProfilePage.jsx'
import SettingsPage from './app/pages/SettingsPage.jsx'
import DesignSystemPage from './app/pages/DesignSystemPage.jsx'
import SearchPage from './app/pages/SearchPage.jsx'
import ReceptionWorkspacePage from './app/pages/reception/ReceptionWorkspacePage.jsx'
import PatientRecordPage from './app/pages/reception/PatientRecordPage.jsx'
import NurseWorkspacePage from './app/pages/nurse/NurseWorkspacePage.jsx'
import PharmacyWorkspacePage from './app/pages/pharmacy/PharmacyWorkspacePage.jsx'
import LabWorkspacePage from './app/pages/lab/LabWorkspacePage.jsx'
import DoctorWorkspacePage from './app/pages/doctor/DoctorWorkspacePage.jsx'
import CashierWorkspacePage from './app/pages/cashier/CashierWorkspacePage.jsx'
import ClaimsWorkspacePage from './app/pages/claims/ClaimsWorkspacePage.jsx'

const Router = __HMS_TARGET__ === 'electron' ? HashRouter : BrowserRouter
const adminWorkspace = WORKSPACES.find((workspace) => workspace.id === 'admin')
const adminUsersMenu = adminWorkspace?.menus.find((menu) => menu.slug === 'users')
const adminOperationsSlugs = ['catalogue', 'mappings', 'settings', 'reports', 'refunds', 'inventory', 'audit', 'backup']
const adminDetailSlugs = ['catalogue', 'mappings', 'reports', 'refunds', 'inventory', 'backup']
const receptionWorkspace = WORKSPACES.find((workspace) => workspace.id === 'reception')
const receptionPatientsMenu = receptionWorkspace?.menus.find((menu) => menu.slug === 'patients')

function SignedInArea() {
  return (
    <ProtectedRoute>
      <AccessProvider>
        <NotificationsProvider>
          <AppLayout />
        </NotificationsProvider>
      </AccessProvider>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <ScrollToTop />
          <AuthProvider>
            <Routes>
              <Route path="/signin" element={<GuestRoute><SignInPage /></GuestRoute>} />
              <Route element={<SignedInArea />}>
                <Route index element={<HomeRedirect />} />
                {WORKSPACES.flatMap((ws) => [
                  <Route key={`${ws.id}-index`} path={`/${ws.slug}`} element={<Navigate to={workspaceHome(ws)} replace />} />,
                  ...ws.menus.map((menu) => (
                    <Route
                      key={`${ws.id}-${menu.slug}`}
                      path={`/${ws.slug}/${menu.slug}`}
                      element={<Guarded workspace={ws} menu={menu}>{ws.id === 'reception' ? <ReceptionWorkspacePage menu={menu} /> : ws.id === 'nurse' ? <NurseWorkspacePage menu={menu} /> : ws.id === 'pharmacy' ? <PharmacyWorkspacePage menu={menu} /> : ws.id === 'laboratory' ? <LabWorkspacePage menu={menu} /> : ws.id === 'doctor' ? <DoctorWorkspacePage menu={menu} /> : ws.id === 'cashier' ? <CashierWorkspacePage menu={menu} /> : ws.id === 'claims' ? <ClaimsWorkspacePage menu={menu} /> : ws.id !== 'admin' ? <MenuStub menu={menu} /> : menu.slug === 'overview' ? <ManagementDashboardPage menu={menu} /> : menu.slug === 'profile' ? <HospitalProfilePage menu={menu} /> : menu.slug === 'facilities' ? <FacilitiesPage menu={menu} /> : menu.slug === 'users' ? <AccessManagementPage menu={menu} /> : adminOperationsSlugs.includes(menu.slug) ? <AdminOperationsPage menu={menu} /> : <AdminMenuStub menu={menu} />}</Guarded>}
                    />
                  )),
                ])}
                {adminWorkspace ? adminDetailSlugs.map((slug) => {
                  const menu = adminWorkspace.menus.find((item) => item.slug === slug)
                  return menu ? <Route key={`admin-${slug}-detail`} path={`/admin/${slug}/:recordId`} element={<Guarded workspace={adminWorkspace} menu={menu}><AdminRecordDetailPage menu={menu} module={slug} /></Guarded>} /> : null
                }) : null}
                {adminWorkspace && adminUsersMenu ? <Route path="/admin/users/:userId" element={<Guarded workspace={adminWorkspace} menu={adminUsersMenu}><UserDetailPage /></Guarded>} /> : null}
                {receptionWorkspace && receptionPatientsMenu ? <Route path="/reception/patients/:patientId" element={<Guarded workspace={receptionWorkspace} menu={receptionPatientsMenu}><PatientRecordPage /></Guarded>} /> : null}
                <Route path="/search" element={<SearchPage />} />
                <Route path="/patient/:id" element={<PatientRecordPage />} />
                <Route path="/design-system" element={<DesignSystemPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </AuthProvider>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  )
}

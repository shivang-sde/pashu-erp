import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }       from './hooks/useAuth.jsx'
import ProtectedRoute         from './routes/ProtectedRoute.jsx'
import { DashboardLayout }    from './components/layout/DashboardLayout.jsx'

import LoginPage              from './pages/auth/LoginPage.jsx'
import ForgotPasswordPage     from './pages/auth/ForgotPasswordPage.jsx'
import StateAdminDashboard    from './pages/dashboard/StateAdminDashboard.jsx'
import HospitalsPage          from './pages/dashboard/HospitalsPage.jsx'
import DoctorsPage            from './pages/dashboard/DoctorsPage.jsx'
import AnimalsPage            from './pages/dashboard/AnimalsPage.jsx'
import AppointmentsPage       from './pages/dashboard/AppointmentsPage.jsx'
import PharmacyPage           from './pages/dashboard/PharmacyPage.jsx'
import InventoryPage          from './pages/dashboard/InventoryPage.jsx'
import BillingPage            from './pages/dashboard/BillingPage.jsx'
import ReportsPage            from './pages/dashboard/ReportsPage.jsx'
import UsersPage              from './pages/dashboard/UsersPage.jsx'
import BulkImportPage         from './pages/dashboard/BulkImportPage.jsx'
import PrintCenterPage        from './pages/dashboard/PrintCenterPage.jsx'
import DoctorDashboard        from './pages/dashboard/DoctorDashboard.jsx'
import HospitalAdminDashboard from './pages/dashboard/HospitalAdminDashboard.jsx'
import ReceptionistDashboard  from './pages/dashboard/ReceptionistDashboard.jsx'
import PharmacistDashboard    from './pages/dashboard/PharmacistDashboard.jsx'
import NotificationsPage      from './pages/dashboard/NotificationsPage.jsx'
import EmailSettingsPage      from './pages/dashboard/EmailSettingsPage.jsx'
import PrescriptionsPage      from './pages/dashboard/PrescriptionsPage.jsx'
import ComingSoon             from './pages/dashboard/ComingSoon.jsx'

const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center px-4 font-body bg-pashu-bg">
    <div className="text-center space-y-3">
      <div className="text-5xl">🚫</div>
      <h2 className="font-display text-2xl font-bold text-slate-800">Access Denied</h2>
      <p className="text-slate-500 text-sm">You don't have permission to view this page.</p>
      <a href="/auth/login" className="text-primary-700 text-sm font-medium hover:underline">← Back to login</a>
    </div>
  </div>
)

const ALL_ADMINS = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN']
const MEDICAL    = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST']
const PHARMA_MOD = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','PHARMACIST','DOCTOR']
const BILLING_R  = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','RECEPTIONIST','DOCTOR']
const REPORTS_R  = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','PHARMACIST']
const PRINT_R    = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','RECEPTIONIST','PHARMACIST','DOCTOR']
const ALL_ROLES  = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST']

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"                     element={<Navigate to="/auth/login" replace/>}/>
          <Route path="/auth/login"           element={<LoginPage/>}/>
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage/>}/>
          <Route path="/unauthorized"         element={<Unauthorized/>}/>

          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout/></ProtectedRoute>}>
            <Route path="state"          element={<ProtectedRoute allowedRoles={['STATE_ADMIN']}><StateAdminDashboard/></ProtectedRoute>}/>
            <Route path="district"       element={<ProtectedRoute allowedRoles={['DISTRICT_ADMIN']}><StateAdminDashboard/></ProtectedRoute>}/>
            <Route path="hospital"       element={<ProtectedRoute allowedRoles={['HOSPITAL_ADMIN']}><HospitalAdminDashboard/></ProtectedRoute>}/>
            <Route path="doctor"         element={<ProtectedRoute allowedRoles={['DOCTOR']}><DoctorDashboard/></ProtectedRoute>}/>
            <Route path="pharmacist-home"element={<ProtectedRoute allowedRoles={['PHARMACIST']}><PharmacistDashboard/></ProtectedRoute>}/>
            <Route path="reception"      element={<ProtectedRoute allowedRoles={['RECEPTIONIST']}><ReceptionistDashboard/></ProtectedRoute>}/>

            <Route path="hospitals"      element={<ProtectedRoute allowedRoles={ALL_ADMINS}><HospitalsPage/></ProtectedRoute>}/>
            <Route path="doctors"        element={<ProtectedRoute allowedRoles={ALL_ADMINS}><DoctorsPage/></ProtectedRoute>}/>
            <Route path="patients"       element={<ProtectedRoute allowedRoles={MEDICAL}><AnimalsPage/></ProtectedRoute>}/>
            <Route path="appointments"   element={<ProtectedRoute allowedRoles={MEDICAL}><AppointmentsPage/></ProtectedRoute>}/>
            <Route path="pharmacy"       element={<ProtectedRoute allowedRoles={PHARMA_MOD}><PharmacyPage/></ProtectedRoute>}/>
            <Route path="inventory"      element={<ProtectedRoute allowedRoles={PHARMA_MOD}><InventoryPage/></ProtectedRoute>}/>
            <Route path="billing"        element={<ProtectedRoute allowedRoles={BILLING_R}><BillingPage/></ProtectedRoute>}/>
            <Route path="reports"        element={<ProtectedRoute allowedRoles={REPORTS_R}><ReportsPage/></ProtectedRoute>}/>
            <Route path="users"          element={<ProtectedRoute allowedRoles={ALL_ADMINS}><UsersPage/></ProtectedRoute>}/>
            <Route path="bulk"           element={<ProtectedRoute allowedRoles={ALL_ADMINS}><BulkImportPage/></ProtectedRoute>}/>
            <Route path="print"          element={<ProtectedRoute allowedRoles={PRINT_R}><PrintCenterPage/></ProtectedRoute>}/>
            <Route path="notifications"  element={<ProtectedRoute allowedRoles={ALL_ROLES}><NotificationsPage/></ProtectedRoute>}/>
            <Route path="email"          element={<ProtectedRoute allowedRoles={['STATE_ADMIN']}><EmailSettingsPage/></ProtectedRoute>}/>
            <Route path="prescriptions"   element={<ProtectedRoute allowedRoles={['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST']}><PrescriptionsPage/></ProtectedRoute>}/>
          </Route>

          <Route path="*" element={<Navigate to="/auth/login" replace/>}/>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

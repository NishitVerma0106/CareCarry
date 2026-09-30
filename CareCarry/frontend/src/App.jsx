import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './routes/ProtectedRoutes';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Patient
import PatientDashboard from './pages/patient/Dashboard';
import CareCarryID from './pages/patient/CareCarryID';
import MedicalTimeline from './pages/patient/MedicalTimeline';
import MedicalReports from './pages/patient/MedicalReports';
import Prescriptions from './pages/patient/Prescriptions';
import Consultations from './pages/patient/Consultations';
import PatientProfile from './pages/patient/Profile';
import AccessHistory from './pages/patient/AccessHistory';

// Doctor
import DoctorDashboard from './pages/doctor/Dashboard';
import PatientClinicalView from './pages/doctor/PatientClinicalView';
import DoctorProfile from './pages/doctor/Profile';

// Hospital
import HospitalDashboard from './pages/hospital/Dashboard';
import QRScannerPage from './pages/hospital/QRScannerPage';
import PatientLookup from './pages/hospital/PatientLookup';
import EncounterDetail from './pages/hospital/EncounterDetail';
import ReportUpload from './pages/hospital/ReportUpload';
import HospitalProfile from './pages/hospital/Profile';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import DoctorVerification from './pages/admin/DoctorVerification';
import HospitalVerification from './pages/admin/HospitalVerification';
import UserManagement from './pages/admin/UserManagement';
import AuditLogs from './pages/admin/AuditLogs';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontFamily: 'Inter, sans-serif',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#f9fafb' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#f9fafb' } },
          }}
        />

        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* ─── Patient Routes ─────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/carecard" element={<CareCarryID />} />
            <Route path="/patient/carecarry-id" element={<CareCarryID />} />
            <Route path="/patient/timeline" element={<MedicalTimeline />} />
            <Route path="/patient/reports" element={<MedicalReports />} />
            <Route path="/patient/prescriptions" element={<Prescriptions />} />
            <Route path="/patient/consultations" element={<Consultations />} />
            <Route path="/patient/profile" element={<PatientProfile />} />
            <Route path="/patient/access" element={<AccessHistory />} />
            <Route path="/patient/access-history" element={<AccessHistory />} />
          </Route>

          {/* ─── Doctor Routes ──────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/queue" element={<DoctorDashboard />} />
            <Route path="/doctor/encounters/:id" element={<PatientClinicalView />} />
            <Route path="/doctor/patient/:patientId" element={<PatientClinicalView />} />
            <Route path="/doctor/profile" element={<DoctorProfile />} />
          </Route>

          {/* ─── Hospital Staff Routes ──────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['hospital_staff']} />}>
            <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
            <Route path="/hospital_staff/dashboard" element={<Navigate to="/hospital/dashboard" replace />} />
            <Route path="/hospital/scanner" element={<QRScannerPage />} />
            <Route path="/hospital/lookup" element={<PatientLookup />} />
            <Route path="/hospital/encounters" element={<HospitalDashboard />} />
            <Route path="/hospital/encounters/:id" element={<EncounterDetail />} />
            <Route path="/hospital/upload" element={<ReportUpload />} />
            <Route path="/hospital/profile" element={<HospitalProfile />} />
          </Route>

          {/* ─── Admin Routes ───────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/doctors" element={<DoctorVerification />} />
            <Route path="/admin/hospitals" element={<HospitalVerification />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/audit-logs" element={<AuditLogs />} />
          </Route>

          {/* Fallback 404 */}
          <Route path="*" element={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0f1a', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: '4rem' }}>404</div>
              <h2 style={{ color: '#f9fafb', fontFamily: 'Space Grotesk' }}>Page Not Found</h2>
              <a href="/login" style={{ color: '#818cf8' }}>← Go to Login</a>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

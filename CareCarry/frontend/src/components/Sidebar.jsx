import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, User, QrCode, Clock, FileText, Pill,
  Shield, LogOut, Users, Hospital, Stethoscope, ClipboardList,
  Upload, BarChart3, CheckCircle, AlertCircle, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

const navConfig = {
  patient: [
    { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patient/carecarry-id', icon: QrCode, label: 'CareCarry ID' },
    { to: '/patient/timeline', icon: Clock, label: 'Medical Timeline' },
    { to: '/patient/consultations', icon: Stethoscope, label: 'Consultations' },
    { to: '/patient/prescriptions', icon: Pill, label: 'Prescriptions' },
    { to: '/patient/reports', icon: FileText, label: 'Reports' },
    { to: '/patient/profile', icon: User, label: 'My Profile' },
    { to: '/patient/access-history', icon: Shield, label: 'Access & Consent' },
  ],
  doctor: [
    { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctor/queue', icon: Users, label: 'Patient Queue' },
    { to: '/doctor/profile', icon: User, label: 'My Profile' },
  ],
  hospital_staff: [
    { to: '/hospital/dashboard', icon: LayoutDashboard, label: 'Command Center' },
    { to: '/hospital/scanner', icon: QrCode, label: 'Scan CareCarry QR' },
    { to: '/hospital/lookup', icon: Users, label: 'Patient Reception' },
    { to: '/hospital/encounters', icon: Hospital, label: 'Encounters & Queue' },
    { to: '/hospital/upload', icon: Upload, label: 'Upload Report' },
    { to: '/hospital/profile', icon: User, label: 'Hospital Profile' },
  ],
  admin: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/doctors', icon: Stethoscope, label: 'Doctor Verification' },
    { to: '/admin/hospitals', icon: Hospital, label: 'Hospital Verification' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
  ],
};

const roleColors = {
  patient: '#10b981',
  doctor: '#3b82f6',
  hospital_staff: '#f59e0b',
  admin: '#ec4899',
};

const roleLabels = {
  patient: 'Patient Portal',
  doctor: 'Doctor Portal',
  hospital_staff: 'Hospital Portal',
  admin: 'Admin Portal',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const links = navConfig[user?.role] || [];
  const color = roleColors[user?.role] || 'var(--cc-primary)';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">CareCarry</div>
        <div className="sidebar-logo-sub" style={{ color }}>
          {roleLabels[user?.role]}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Navigation</div>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{
          padding: '12px 12px',
          borderRadius: 'var(--cc-radius)',
          background: 'var(--cc-surface-2)',
          marginBottom: '10px',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cc-text)' }}>
            {user?.firstName} {user?.lastName}
          </div>
          <div style={{
            fontSize: '0.72rem',
            marginTop: '2px',
            padding: '2px 8px',
            borderRadius: 'var(--cc-radius-full)',
            background: `${color}20`,
            color,
            display: 'inline-block',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {user?.role?.replace('_', ' ')}
          </div>
        </div>

        <button onClick={handleLogout} className="sidebar-link" style={{ color: '#ef4444' }}>
          <LogOut className="icon" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getDashboardPath = (role) => (role === 'hospital_staff' ? '/hospital/dashboard' : `/${role}/dashboard`);

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" style={{ width: 36, height: 36, borderColor: 'rgba(99,102,241,0.2)', borderTopColor: '#818cf8' }} />
        <p style={{ color: 'var(--cc-text-muted)', fontSize: '0.875rem' }}>Loading CareCarry...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
};

export const PublicRoute = () => {
  const { user } = useAuth();
  if (user) return <Navigate to={getDashboardPath(user.role)} replace />;
  return <Outlet />;
};

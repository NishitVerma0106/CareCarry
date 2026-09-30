import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { Hospital, User, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HospitalProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getMe()
      .then((res) => setProfile(res.data.data))
      .catch(() => toast.error('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Hospital Staff Profile" />
        <div className="page-content">
          <div className="page-header">
            <div className="page-title">Hospital Staff Identity</div>
            <p className="page-subtitle">Your credentials, associated healthcare facility, and authorization status</p>
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.4rem'
                }}>
                  {profile?.firstName?.[0] || 'S'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                    {profile?.firstName} {profile?.lastName}
                  </h3>
                  <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                    {profile?.email}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span className="badge badge-success">
                      <ShieldCheck size={12} /> Verified Hospital Staff
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.9rem' }}>
                <div style={{ background: 'var(--cc-surface-2)', padding: '12px 16px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Staff ID</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>#{profile?.staffId || profile?.userId}</div>
                </div>

                <div style={{ background: 'var(--cc-surface-2)', padding: '12px 16px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Role & Permissions</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>Medical Records Officer</div>
                </div>

                <div style={{ background: 'var(--cc-surface-2)', padding: '12px 16px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Associated Facility</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>ABC Government Hospital</div>
                </div>

                <div style={{ background: 'var(--cc-surface-2)', padding: '12px 16px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Registration Status</div>
                  <div style={{ fontWeight: 700, color: '#10b981', marginTop: 4 }}>Active & Authorized</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

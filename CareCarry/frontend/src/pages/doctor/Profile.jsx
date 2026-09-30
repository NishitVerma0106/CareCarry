import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { Stethoscope, ShieldCheck, Hospital, Award } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DoctorProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getMe()
      .then((res) => setProfile(res.data.data))
      .catch(() => toast.error('Failed to load doctor profile.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Doctor Clinical Profile" />
        <div className="page-content">
          <div className="page-header">
            <div className="page-title">Doctor Credentials & Licensing</div>
            <p className="page-subtitle">Your medical license, verified credentials, and hospital affiliation</p>
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.4rem'
                }}>
                  Dr
                </div>
                <div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                    Dr. {profile?.firstName} {profile?.lastName}
                  </h3>
                  <div style={{ color: '#60a5fa', fontSize: '0.9rem', marginTop: 4 }}>
                    {profile?.specialization || 'General Medicine'}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span className="badge badge-success">
                      <ShieldCheck size={12} /> Verified Practicing Physician
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.9rem' }}>
                <div style={{ background: 'var(--cc-surface-2)', padding: '12px 16px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Medical License</div>
                  <div style={{ fontWeight: 700, marginTop: 4, fontFamily: 'Space Grotesk', letterSpacing: '1px' }}>
                    {profile?.licenseNumber || 'MH-DOC-123456'}
                  </div>
                </div>

                <div style={{ background: 'var(--cc-surface-2)', padding: '12px 16px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Specialization</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>
                    {profile?.specialization || 'General Medicine'}
                  </div>
                </div>

                <div style={{ background: 'var(--cc-surface-2)', padding: '12px 16px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Affiliated Hospital</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>ABC Government Hospital</div>
                </div>

                <div style={{ background: 'var(--cc-surface-2)', padding: '12px 16px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Clinical Authority</div>
                  <div style={{ fontWeight: 700, color: '#10b981', marginTop: 4 }}>Full Clinical Privileges</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { adminService } from '../../services';
import { CheckCircle, XCircle, Pause, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function DoctorVerification() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await adminService.getPendingDoctors();
      setDoctors(res.data.data);
    } catch {
      toast.error('Failed to load pending doctors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handle = async (id, action) => {
    try {
      if (action === 'suspend') {
        await adminService.suspendDoctor(id);
        toast.success('Doctor suspended.');
      } else {
        await adminService.verifyDoctor(id, action);
        toast.success(`Doctor ${action} successfully.`);
      }
      setDoctors((prev) => prev.filter((d) => d.doctor_id !== id));
    } catch {
      toast.error('Action failed.');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Doctor Verification" />
        <div className="page-content">
          <div className="page-header">
            <div className="page-header-top">
              <div>
                <div className="page-title">Doctor Verification</div>
                <p className="page-subtitle">Review and verify pending doctor registrations</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={fetch} id="refresh-doctors">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : doctors.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
              {doctors.map((doc) => (
                <div key={doc.doctor_id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1.1rem', color: 'white',
                    }}>
                      {doc.first_name?.[0]}{doc.last_name?.[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>Dr. {doc.first_name} {doc.last_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--cc-text-muted)' }}>{doc.email}</div>
                    </div>
                    <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>Pending</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    {[
                      { label: 'Specialization', value: doc.specialization || '—' },
                      { label: 'License No.', value: doc.license_number || '—' },
                      { label: 'Phone', value: doc.phone || '—' },
                      { label: 'Registered', value: format(new Date(doc.created_at), 'dd MMM yyyy') },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: '8px 10px', background: 'var(--cc-surface-2)', borderRadius: 8 }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--cc-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button id={`verify-doc-${doc.doctor_id}`} className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => handle(doc.doctor_id, 'verified')}>
                      <CheckCircle size={14} /> Verify
                    </button>
                    <button id={`reject-doc-${doc.doctor_id}`} className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handle(doc.doctor_id, 'rejected')}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">No pending verifications</div>
              <div className="empty-state-desc">All doctor registrations are up to date.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

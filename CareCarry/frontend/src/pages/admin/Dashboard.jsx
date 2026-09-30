import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { adminService } from '../../services';
import { Users, Stethoscope, Hospital, Activity, ClipboardList, TrendingUp, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, doctorsRes, logsRes] = await Promise.all([
          adminService.getStatistics(),
          adminService.getPendingDoctors(),
          adminService.getAuditLogs({ limit: 10 }),
        ]);
        setStats(statsRes.data.data);
        setPendingDoctors(doctorsRes.data.data);
        setAuditLogs(logsRes.data.data.logs);
      } catch {
        toast.error('Failed to load admin data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleVerifyDoctor = async (id, status) => {
    try {
      await adminService.verifyDoctor(id, status);
      toast.success(`Doctor ${status} successfully.`);
      setPendingDoctors((prev) => prev.filter((d) => d.doctor_id !== id));
    } catch {
      toast.error('Action failed.');
    }
  };

  const statCards = stats ? [
    { label: 'Total Patients', value: stats.totalPatients, color: '#10b981', icon: Users },
    { label: 'Doctors', value: stats.totalDoctors, color: '#3b82f6', icon: Stethoscope },
    { label: 'Hospitals', value: stats.totalHospitals, color: '#f59e0b', icon: Hospital },
    { label: 'Encounters', value: stats.totalEncounters, color: '#6366f1', icon: Activity },
    { label: 'Pending Doctors', value: stats.pendingDoctors, color: '#ef4444', icon: AlertCircle },
    { label: 'Reports Uploaded', value: stats.totalReports, color: '#8b5cf6', icon: ClipboardList },
  ] : [];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Admin Dashboard" />
        <div className="page-content">
          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <div className="animate-fade-in">
              {/* Header */}
              <div className="page-header">
                <div className="page-title">Platform Overview</div>
                <p className="page-subtitle">Monitor CareCarry activity and manage platform governance</p>
              </div>

              {/* Stats Grid */}
              <div className="stat-grid" style={{ marginBottom: 28 }}>
                {statCards.map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="stat-card">
                    <div className="stat-icon" style={{ background: `${color}20` }}>
                      <Icon size={22} color={color} />
                    </div>
                    <div className="stat-info">
                      <div className="label">{label}</div>
                      <div className="value">{value ?? '—'}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Pending Doctor Verifications */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Pending Doctor Verification</h3>
                    {stats?.pendingDoctors > 0 && (
                      <span className="badge badge-error">{stats.pendingDoctors} pending</span>
                    )}
                  </div>

                  {pendingDoctors.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {pendingDoctors.map((doc) => (
                        <div key={doc.doctor_id} style={{
                          padding: '14px 16px',
                          background: 'var(--cc-surface-2)',
                          borderRadius: 'var(--cc-radius)',
                          border: '1px solid var(--cc-border)',
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>
                            Dr. {doc.first_name} {doc.last_name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--cc-text-muted)', marginBottom: 10 }}>
                            {doc.specialization} · License: {doc.license_number}
                            <br />{doc.email}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              id={`verify-doctor-${doc.doctor_id}`}
                              className="btn btn-success btn-sm"
                              onClick={() => handleVerifyDoctor(doc.doctor_id, 'verified')}
                            >
                              <CheckCircle size={14} /> Verify
                            </button>
                            <button
                              id={`reject-doctor-${doc.doctor_id}`}
                              className="btn btn-danger btn-sm"
                              onClick={() => handleVerifyDoctor(doc.doctor_id, 'rejected')}
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: '32px 0' }}>
                      <div style={{ fontSize: '2rem' }}>✅</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cc-text)', marginTop: 8 }}>All caught up!</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>No pending verifications.</div>
                    </div>
                  )}
                </div>

                {/* Recent Audit Log */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Recent Audit Activity</h3>
                    <span className="badge badge-neutral">Last 10</span>
                  </div>

                  {auditLogs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {auditLogs.map((log) => (
                        <div key={log.log_id} style={{
                          padding: '10px 12px',
                          background: 'var(--cc-surface-2)',
                          borderRadius: 8,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        }}>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cc-text)' }}>
                              {log.action.replace(/_/g, ' ')}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--cc-text-muted)', marginTop: 2 }}>
                              {log.first_name ? `${log.first_name} ${log.last_name}` : log.actor_role}
                              {' · '}{log.actor_role}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--cc-text-subtle)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                            {format(new Date(log.created_at), 'dd MMM HH:mm')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: '32px 0' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--cc-text-muted)' }}>No audit logs yet.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

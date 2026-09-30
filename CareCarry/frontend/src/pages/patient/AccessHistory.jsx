import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { patientService } from '../../services';
import { Shield, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AccessHistory() {
  const [data, setData] = useState({ grants: [], auditLogs: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await patientService.getAccess();
      setData(res.data.data || { grants: [], auditLogs: [] });
    } catch {
      toast.error('Failed to load access history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConsentAction = async (id, status) => {
    try {
      await patientService.updateConsent(id, status);
      toast.success(`Consent ${status} successfully!`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update consent.');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Consent & Access Management" />
        <div className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="page-title">Consent & Access Control</div>
              <p className="page-subtitle">Control who has access to your health record and inspect audit logs</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchData}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Privacy banner */}
          <div className="alert alert-info" style={{ marginBottom: 24 }}>
            <Shield size={20} />
            <div>
              <strong>Patient-Centric Data Governance: </strong>
              Your records are strictly protected. Healthcare providers can only access authorized encounters or clinical summaries. All accesses and actions are permanently audited below.
            </div>
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Access Grants Section */}
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>Clinical Access Grants</h3>

                {data.grants?.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--cc-surface-2)', borderBottom: '1px solid var(--cc-border)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px' }}>Practitioner / Hospital</th>
                          <th style={{ padding: '10px 14px' }}>Role</th>
                          <th style={{ padding: '10px 14px' }}>Scope</th>
                          <th style={{ padding: '10px 14px' }}>Requested At</th>
                          <th style={{ padding: '10px 14px' }}>Status</th>
                          <th style={{ padding: '10px 14px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.grants.map((g) => (
                          <tr key={g.grant_id} style={{ borderBottom: '1px solid var(--cc-border)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                              {g.first_name} {g.last_name}
                            </td>
                            <td style={{ padding: '10px 14px', textTransform: 'capitalize' }}>
                              {g.grantee_role?.replace('_', ' ')}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span className="badge badge-neutral">{g.scope}</span>
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--cc-text-muted)' }}>
                              {format(new Date(g.requested_at), 'dd MMM yyyy HH:mm')}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span className={`badge badge-${g.status === 'approved' ? 'success' : g.status === 'pending' ? 'warning' : 'danger'}`}>
                                {g.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {g.status === 'pending' && (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleConsentAction(g.grant_id, 'approved')}
                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleConsentAction(g.grant_id, 'rejected')}
                                    style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#ef4444' }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                              {g.status === 'approved' && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleConsentAction(g.grant_id, 'revoked')}
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#ef4444' }}
                                >
                                  Revoke
                                </button>
                              )}
                              {(g.status === 'rejected' || g.status === 'revoked') && (
                                <span style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem' }}>Closed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.875rem', padding: '12px 0' }}>
                    No special access grant requests pending. Encounters created by verified hospital staff are bound by institutional authorization.
                  </div>
                )}
              </div>

              {/* Audit Logs Trail */}
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>Audit Trail for Your Records</h3>
                <p style={{ color: 'var(--cc-text-muted)', fontSize: '0.825rem', marginBottom: 14 }}>
                  Every view, search, upload, or clinical recording related to your profile is immutably logged.
                </p>

                {data.auditLogs?.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--cc-surface-2)', borderBottom: '1px solid var(--cc-border)', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px' }}>Timestamp</th>
                          <th style={{ padding: '8px 12px' }}>Action</th>
                          <th style={{ padding: '8px 12px' }}>Actor Role</th>
                          <th style={{ padding: '8px 12px' }}>Actor</th>
                          <th style={{ padding: '8px 12px' }}>IP Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.auditLogs.map((log) => (
                          <tr key={log.log_id} style={{ borderBottom: '1px solid var(--cc-border)' }}>
                            <td style={{ padding: '8px 12px', color: 'var(--cc-text-muted)' }}>
                              {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss')}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--cc-text)' }}>
                              {log.action}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}>
                                {log.actor_role}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: 'var(--cc-text-muted)' }}>
                              {log.first_name ? `${log.first_name} ${log.last_name}` : 'System'}
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--cc-text-muted)', fontSize: '0.78rem' }}>
                              {log.ip_address || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.85rem' }}>No audit records yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

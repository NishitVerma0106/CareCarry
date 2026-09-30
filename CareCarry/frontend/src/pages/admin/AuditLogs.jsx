import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { adminService } from '../../services';
import { format } from 'date-fns';
import { Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  USER_REGISTERED: 'badge-success',
  USER_LOGIN: 'badge-info',
  USER_LOGOUT: 'badge-neutral',
  CONSULTATION_CREATED: 'badge-primary',
  DIAGNOSIS_CREATED: 'badge-primary',
  PRESCRIPTION_CREATED: 'badge-primary',
  REPORT_UPLOADED: 'badge-warning',
  PATIENT_LOOKUP: 'badge-info',
  ENCOUNTER_CREATED: 'badge-warning',
  VIEW_CLINICAL_SUMMARY: 'badge-info',
  QR_GENERATED: 'badge-primary',
  DOCTOR_VERIFIED: 'badge-success',
  DOCTOR_REJECTED: 'badge-error',
  DOCTOR_SUSPENDED: 'badge-error',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', role: '', page: 1, limit: 20 });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAuditLogs(filters);
      setLogs(res.data.data.logs);
      setTotal(res.data.data.total);
    } catch {
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [filters.page]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Audit Logs" />
        <div className="page-content">
          <div className="page-header">
            <div className="page-header-top">
              <div>
                <div className="page-title">Audit Logs</div>
                <p className="page-subtitle">{total} total records</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                <label className="form-label">Filter by Action</label>
                <input
                  id="audit-filter-action"
                  className="form-input"
                  placeholder="e.g. CONSULTATION_CREATED"
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
                <label className="form-label">Filter by Role</label>
                <select id="audit-filter-role" className="form-input" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
                  <option value="">All Roles</option>
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="hospital_staff">Hospital Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button id="audit-search" className="btn btn-primary" onClick={fetchLogs} style={{ marginBottom: 0 }}>
                <Search size={16} /> Search
              </button>
            </div>
          </div>

          {/* Logs Table */}
          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Role</th>
                      <th>Patient</th>
                      <th>IP</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.log_id}>
                        <td style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem' }}>#{log.log_id}</td>
                        <td>
                          <span className={`badge ${ACTION_COLORS[log.action] || 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {log.first_name ? `${log.first_name} ${log.last_name}` : '—'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--cc-text-muted)' }}>{log.email}</div>
                        </td>
                        <td>
                          <span className="badge badge-neutral">{log.actor_role}</span>
                        </td>
                        <td style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem' }}>
                          {log.patient_id ? `#${log.patient_id}` : '—'}
                        </td>
                        <td style={{ color: 'var(--cc-text-muted)', fontSize: '0.75rem' }}>
                          {log.ip_address || '—'}
                        </td>
                        <td style={{ color: 'var(--cc-text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                >
                  ← Previous
                </button>
                <span style={{ padding: '6px 16px', color: 'var(--cc-text-muted)', fontSize: '0.875rem' }}>
                  Page {filters.page} of {Math.ceil(total / filters.limit)}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={filters.page >= Math.ceil(total / filters.limit)}
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

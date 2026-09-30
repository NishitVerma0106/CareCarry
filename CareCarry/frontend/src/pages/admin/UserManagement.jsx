import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { adminService } from '../../services';
import { Users, Search, Shield, Ban, CheckCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllUsers({ role: roleFilter || undefined });
      setUsers(res.data.data || []);
    } catch {
      toast.error('Failed to load users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleToggle = async (userId) => {
    try {
      const res = await adminService.toggleUserActive(userId);
      toast.success(res.data.message || 'User status updated.');
      fetchUsers();
    } catch {
      toast.error('Failed to change user status.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const ccId = (u.carecarry_id || '').toLowerCase();
    return name.includes(q) || email.includes(q) || ccId.includes(q);
  });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="User Governance & Management" />
        <div className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="page-title">Platform Users Directory</div>
              <p className="page-subtitle">Manage patient, doctor, and hospital staff accounts and control platform access</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchUsers}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Search & Filters */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                <input
                  id="user-search"
                  className="form-input"
                  placeholder="Search by name, email, or CareCarry ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                id="role-filter"
                className="form-input"
                style={{ width: 180 }}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="patient">Patients</option>
                <option value="doctor">Doctors</option>
                <option value="hospital_staff">Hospital Staff</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="card">
            {loading ? (
              <div className="page-loader"><div className="spinner" /></div>
            ) : filteredUsers.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--cc-surface-2)', borderBottom: '1px solid var(--cc-border)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px' }}>User</th>
                      <th style={{ padding: '12px 14px' }}>Role</th>
                      <th style={{ padding: '12px 14px' }}>Identity / ID</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px' }}>Joined Date</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.user_id} style={{ borderBottom: '1px solid var(--cc-border)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)' }}>{u.email}</div>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <span className={`badge badge-${u.role === 'admin' ? 'neutral' : u.role === 'doctor' ? 'primary' : u.role === 'patient' ? 'success' : 'warning'}`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px', fontFamily: 'Space Grotesk', fontSize: '0.85rem' }}>
                          {u.carecarry_id ? (
                            <span style={{ color: '#818cf8', fontWeight: 700 }}>{u.carecarry_id}</span>
                          ) : u.license_number ? (
                            <span>{u.license_number}</span>
                          ) : (
                            <span style={{ color: 'var(--cc-text-muted)' }}>—</span>
                          )}
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <span className={`badge badge-${u.is_active ? 'success' : 'danger'}`}>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px', color: 'var(--cc-text-muted)' }}>
                          {format(new Date(u.created_at), 'dd MMM yyyy')}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {u.role !== 'admin' && (
                            <button
                              id={`toggle-user-${u.user_id}`}
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleToggle(u.user_id)}
                              style={{ color: u.is_active ? '#ef4444' : '#10b981' }}
                            >
                              {u.is_active ? <><Ban size={13} /> Suspend</> : <><CheckCircle size={13} /> Activate</>}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <div className="empty-state-title">No users match your criteria</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

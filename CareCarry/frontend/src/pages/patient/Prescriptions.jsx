import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { patientService } from '../../services';
import { Pill, Calendar, Stethoscope, Hospital, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientService.getPrescriptions()
      .then((res) => setPrescriptions(res.data.data || []))
      .catch(() => toast.error('Failed to load prescriptions.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="My Prescriptions" />
        <div className="page-content">
          <div className="page-header">
            <div className="page-title">Doctor Prescriptions</div>
            <p className="page-subtitle">All medications prescribed by attending doctors across visits</p>
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : prescriptions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {prescriptions.map((rx) => (
                <div key={rx.prescription_id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Stethoscope size={18} color="#3b82f6" />
                        <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                          Dr. {rx.doctor_first} {rx.doctor_last}
                        </span>
                        {rx.specialization && (
                          <span className="badge badge-primary">{rx.specialization}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--cc-text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Hospital size={13} /> {rx.hospital_name || 'Hospital Visit'}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={13} /> {format(new Date(rx.created_at || rx.visit_date), 'dd MMMM yyyy')}
                        </span>
                      </div>
                    </div>

                    {rx.diagnosis && (
                      <div style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        color: '#ef4444',
                        fontWeight: 600,
                      }}>
                        Diagnosis: {rx.diagnosis}
                      </div>
                    )}
                  </div>

                  {/* Medicines table */}
                  <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--cc-surface-2)', borderBottom: '1px solid var(--cc-border)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px' }}>Medicine</th>
                          <th style={{ padding: '10px 14px' }}>Dosage</th>
                          <th style={{ padding: '10px 14px' }}>Frequency</th>
                          <th style={{ padding: '10px 14px' }}>Duration</th>
                          <th style={{ padding: '10px 14px' }}>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rx.items?.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--cc-border)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--cc-text)' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <Pill size={14} color="#10b981" /> {item.medicine_name}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--cc-text-muted)' }}>{item.dosage || '—'}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--cc-text-muted)' }}>{item.frequency || '—'}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--cc-text-muted)' }}>{item.duration || '—'}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--cc-text-muted)' }}>{item.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {rx.instructions && (
                    <div style={{
                      padding: '12px 16px',
                      background: 'var(--cc-surface-2)',
                      borderRadius: 'var(--cc-radius)',
                      fontSize: '0.85rem',
                      color: 'var(--cc-text-muted)',
                    }}>
                      <strong style={{ color: 'var(--cc-text)' }}>Doctor's Instructions: </strong>
                      {rx.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💊</div>
              <div className="empty-state-title">No prescriptions found</div>
              <div className="empty-state-desc">When doctors record prescriptions during hospital encounters, they will appear here.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

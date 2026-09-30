import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { patientService } from '../../services';
import { Stethoscope, Calendar, Hospital, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Consultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientService.getConsultations()
      .then((res) => setConsultations(res.data.data || []))
      .catch(() => toast.error('Failed to load consultations.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="My Consultations" />
        <div className="page-content">
          <div className="page-header">
            <div className="page-title">Doctor Consultations</div>
            <p className="page-subtitle">Clinical notes, observations, diagnoses, and follow-up guidance</p>
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : consultations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {consultations.map((c) => (
                <div key={c.consultation_id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Stethoscope size={20} color="#3b82f6" />
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                          Dr. {c.doctor_first} {c.doctor_last}
                        </span>
                        {c.specialization && (
                          <span className="badge badge-primary">{c.specialization}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--cc-text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Hospital size={13} /> {c.hospital_name || 'Hospital Encounter'}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={13} /> {format(new Date(c.created_at || c.visit_date), 'dd MMMM yyyy HH:mm')}
                        </span>
                      </div>
                    </div>

                    {c.diagnosis && (
                      <div style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontSize: '0.85rem',
                        color: '#ef4444',
                        fontWeight: 700,
                      }}>
                        Diagnosis: {c.diagnosis}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                    {c.symptoms && (
                      <div style={{ background: 'var(--cc-surface-2)', padding: '12px 16px', borderRadius: 'var(--cc-radius)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cc-text-muted)', marginBottom: 4 }}>
                          Chief Complaints & Symptoms
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--cc-text)' }}>{c.symptoms}</div>
                      </div>
                    )}

                    {c.clinical_notes && (
                      <div style={{ background: 'var(--cc-surface-2)', padding: '12px 16px', borderRadius: 'var(--cc-radius)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cc-text-muted)', marginBottom: 4 }}>
                          Clinical Examination & Observations
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--cc-text)' }}>{c.clinical_notes}</div>
                      </div>
                    )}

                    {c.follow_up && (
                      <div style={{
                        padding: '12px 16px',
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: 'var(--cc-radius)',
                        color: '#f59e0b',
                        fontSize: '0.85rem',
                      }}>
                        <strong>📅 Follow-up Instructions: </strong> {c.follow_up}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🩺</div>
              <div className="empty-state-title">No consultations recorded yet</div>
              <div className="empty-state-desc">Your clinical records will appear here as doctors examine you during visits.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

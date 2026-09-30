import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { patientService } from '../../services';
import { format } from 'date-fns';
import { Hospital, Stethoscope, Pill, FileText, ChevronDown, ChevronUp, Download, ExternalLink, Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function TimelineCard({ item }) {
  const [expanded, setExpanded] = useState(false);

  // If item is a standalone patient uploaded report
  if (item.type === 'report') {
    return (
      <div className="timeline-item">
        <div className="timeline-dot" style={{ borderColor: '#6366f1', background: '#818cf8' }} />
        <div className="timeline-date">
          {format(new Date(item.date || item.uploaded_at), 'dd MMMM yyyy')}
        </div>
        <div className="timeline-card" style={{ borderLeft: '3px solid #6366f1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <FileText size={18} color="#818cf8" />
                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{item.title || item.file_name}</span>
                <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}>
                  {item.document_type?.replace('_', ' ')}
                </span>
              </div>
              <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem' }}>
                {item.hospital_name || 'Patient Self-Upload'} · Uploaded on {format(new Date(item.uploaded_at), 'dd MMM yyyy HH:mm')}
              </div>
            </div>

            <a
              href={item.secure_file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              <ExternalLink size={14} /> View Document
            </a>
          </div>

          {item.description && (
            <p style={{ fontSize: '0.85rem', color: 'var(--cc-text-muted)', marginTop: 10, background: 'var(--cc-surface-2)', padding: '8px 12px', borderRadius: 8 }}>
              {item.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Hospital Encounter
  return (
    <div className="timeline-item">
      <div className="timeline-dot" style={{ borderColor: '#f59e0b', background: '#fbbf24' }} />
      <div className="timeline-date">
        {format(new Date(item.visit_date || item.date), 'dd MMMM yyyy')}
      </div>
      <div className="timeline-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <Hospital size={18} color="#f59e0b" />
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{item.hospital_name || 'Hospital Visit'}</span>

              {item.token_number && (
                <span style={{
                  fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '0.8rem',
                  padding: '2px 8px', borderRadius: 4,
                  background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.3)',
                }}>
                  {item.token_number}
                </span>
              )}

              {item.department && (
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px',
                  borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                }}>
                  {item.department}
                </span>
              )}

              <span className={`badge badge-${item.status === 'completed' ? 'success' : item.queue_status === 'in_consultation' ? 'info' : 'warning'}`}>
                {item.queue_status || item.status}
              </span>
            </div>
            <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.825rem' }}>
              Encounter #{item.encounter_id} · {item.visit_type} {item.doctor_first ? `· Dr. ${item.doctor_first} ${item.doctor_last} (${item.specialization || 'Attending'})` : ''}
            </div>
            {item.notes && (
              <div style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)', marginTop: 4 }}>
                <strong>Reason: </strong> {item.notes}
              </div>
            )}
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setExpanded(!expanded)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {expanded ? 'Hide Details' : 'View Full Details'}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Badges preview */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {item.consultations?.length > 0 && (
            <span className="badge badge-primary">
              <Stethoscope size={11} /> {item.consultations.length} Consultation
            </span>
          )}
          {item.labOrders?.length > 0 && (
            <span className="badge badge-secondary" style={{ color: '#c084fc' }}>
              🧪 {item.labOrders.length} Lab Test(s)
            </span>
          )}
          {item.reports?.length > 0 && (
            <span className="badge badge-warning">
              <FileText size={11} /> {item.reports.length} Document(s)
            </span>
          )}
          {item.discharge_summary && (
            <span className="badge badge-success">
              ✓ Discharged
            </span>
          )}
        </div>

        {/* Expanded View */}
        {expanded && (
          <div style={{ marginTop: 20, borderTop: '1px solid var(--cc-border)', paddingTop: 16 }}>
            {/* OFFICIAL DISCHARGE SUMMARY */}
            {item.discharge_summary && (
              <div style={{
                marginBottom: 18, padding: '14px 16px', borderRadius: 'var(--cc-radius)',
                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} /> Official Hospital Discharge Summary
                  </div>
                  {item.discharge_date && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)' }}>
                      {format(new Date(item.discharge_date), 'dd MMM yyyy HH:mm')}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#f3f4f6', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                  {item.discharge_summary}
                </div>
              </div>
            )}

            {/* Consultations */}
            {item.consultations?.map((c) => (
              <div key={c.consultation_id} style={{ marginBottom: 20, background: 'var(--cc-surface-2)', padding: '16px', borderRadius: 'var(--cc-radius)' }}>
                <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: 12, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Stethoscope size={16} /> Clinical Consultation
                </div>

                {c.symptoms && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--cc-text-muted)', textTransform: 'uppercase' }}>Symptoms & Complaints</div>
                    <p style={{ fontSize: '0.875rem', marginTop: 3 }}>{c.symptoms}</p>
                  </div>
                )}

                {c.clinical_notes && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--cc-text-muted)', textTransform: 'uppercase' }}>Clinical Examination Notes</div>
                    <p style={{ fontSize: '0.875rem', marginTop: 3 }}>{c.clinical_notes}</p>
                  </div>
                )}

                {c.diagnosis && (
                  <div style={{ marginBottom: 12, background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Diagnosis</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fca5a5', marginTop: 2 }}>{c.diagnosis}</div>
                    {c.remarks && <div style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)', marginTop: 2 }}>Remarks: {c.remarks}</div>}
                  </div>
                )}

                {/* Prescription and medicines */}
                {(c.prescription_items?.length > 0 || c.instructions) && (
                  <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Pill size={14} /> Prescribed Medication
                    </div>

                    {c.prescription_items?.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                        {c.prescription_items.map((pi, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--cc-surface)', borderRadius: 6, fontSize: '0.825rem' }}>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--cc-text)' }}>{pi.medicine_name}</span>
                              <span style={{ color: 'var(--cc-text-muted)', marginLeft: 8 }}>{pi.dosage} · {pi.frequency} · {pi.duration}</span>
                            </div>
                            <span className={`badge badge-${pi.status === 'DISPENSED' ? 'success' : 'warning'}`} style={{ fontSize: '0.7rem' }}>
                              {pi.status || 'PENDING'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {c.instructions && (
                      <p style={{ fontSize: '0.825rem', color: 'var(--cc-text-muted)', fontStyle: 'italic' }}>
                        Instructions: {c.instructions}
                      </p>
                    )}
                  </div>
                )}

                {c.follow_up && (
                  <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: '0.8rem', color: '#f59e0b', marginTop: 10 }}>
                    📅 <strong>Follow-up: </strong> {c.follow_up}
                  </div>
                )}
              </div>
            ))}

            {/* Laboratory Investigations */}
            {item.labOrders?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, color: '#c084fc', marginBottom: 10, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🧪 Laboratory Investigations Ordered
                </div>
                {item.labOrders.map((lo) => (
                  <div key={lo.order_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{lo.test_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)' }}>
                        Status: <span style={{ color: lo.status === 'COMPLETED' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{lo.status}</span>
                      </div>
                    </div>
                    {lo.secure_file_url && (
                      <a href={lo.secure_file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                        <ExternalLink size={13} /> View Result
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Encounter Reports */}
            {item.reports?.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 10, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={15} /> Hospital Encounter Documents
                </div>
                {item.reports.map((r) => (
                  <div key={r.report_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.title || r.file_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)' }}>
                        <span className="badge badge-neutral" style={{ marginRight: 6 }}>{r.document_type}</span>
                        {r.file_name}
                      </div>
                    </div>
                    <a href={r.secure_file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                      <ExternalLink size={13} /> View
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MedicalTimeline() {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTimeline = () => {
    setLoading(true);
    patientService.getTimeline()
      .then((res) => setTimeline(res.data.data || []))
      .catch(() => toast.error('Failed to load timeline.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Longitudinal Medical Timeline" />
        <div className="page-content">
          <div className="page-header">
            <div className="page-title">Medical Timeline</div>
            <p className="page-subtitle">Your longitudinal health journey: hospital visits, clinical notes, prescriptions, and reports</p>
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : timeline.length > 0 ? (
            <div className="animate-fade-in timeline">
              {timeline.map((item, idx) => (
                <TimelineCard key={item.id || idx} item={item} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🏥</div>
              <div className="empty-state-title">No timeline records yet</div>
              <div className="empty-state-desc">
                When you visit an authorized hospital or upload your own lab reports, your longitudinal health timeline will appear here.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

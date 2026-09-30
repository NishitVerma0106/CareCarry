import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { doctorService } from '../../services';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Stethoscope, Clock, ChevronRight, Activity, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function DoctorDashboard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchQueue = () => {
    setLoading(true);
    doctorService.getQueue()
      .then((res) => setQueue(res.data.data || []))
      .catch(() => toast.error('Failed to load patient queue.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleStartConsultation = async (patient) => {
    try {
      await doctorService.updateEncounterStatus(patient.encounter_id, 'in_consultation');
      navigate(`/doctor/patient/${patient.patient_id}?encounterId=${patient.encounter_id}`);
    } catch {
      navigate(`/doctor/patient/${patient.patient_id}?encounterId=${patient.encounter_id}`);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Doctor Clinical Queue" />
        <div className="page-content">
          <div className="page-header">
            <div className="page-header-top">
              <div>
                <div className="page-title">Assigned Clinical Queue</div>
                <p className="page-subtitle">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
              </div>
              <div className="badge badge-info" style={{ fontSize: '0.875rem', padding: '8px 16px' }}>
                <Users size={14} /> {queue.length} Encounters
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="stat-grid" style={{ marginBottom: 28 }}>
            {[
              { label: "Today's Queue", value: queue.length, color: '#3b82f6', icon: Users },
              { label: 'Waiting', value: queue.filter((q) => q.queue_status === 'waiting').length, color: '#ef4444', icon: Clock },
              { label: 'In Consultation', value: queue.filter((q) => q.queue_status === 'in_consultation').length, color: '#60a5fa', icon: Activity },
              { label: 'Completed', value: queue.filter((q) => q.queue_status === 'completed' || q.status === 'completed').length, color: '#10b981', icon: CheckCircle2 },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="stat-card">
                <div className="stat-icon" style={{ background: `${color}20` }}>
                  <Icon size={22} color={color} />
                </div>
                <div className="stat-info">
                  <div className="label">{label}</div>
                  <div className="value">{value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Patient Queue */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>Consultation Queue & Token Routing</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                  Patients routed from hospital triage to your consultation schedule
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={fetchQueue}>Refresh</button>
            </div>

            {loading ? (
              <div className="page-loader"><div className="spinner" /></div>
            ) : queue.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {queue.map((patient) => (
                  <div key={patient.encounter_id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'var(--cc-surface-2)',
                    borderRadius: 'var(--cc-radius)',
                    border: '1px solid var(--cc-border)',
                    transition: 'var(--cc-transition)',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1rem',
                        padding: '8px 12px', borderRadius: 8,
                        background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.3)', minWidth: 84, textAlign: 'center'
                      }}>
                        {patient.token_number || `TK-${patient.encounter_id}`}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f9fafb', marginBottom: 2 }}>
                          {patient.first_name} {patient.last_name}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', color: '#10b981', fontFamily: 'Space Grotesk', fontWeight: 700, letterSpacing: '1px' }}>
                            {patient.carecarry_id}
                          </span>
                          <span className={`badge badge-${
                            patient.queue_status === 'completed' || patient.status === 'completed'
                              ? 'success'
                              : patient.queue_status === 'in_consultation'
                              ? 'info'
                              : 'warning'
                          }`}>
                            {patient.queue_status || patient.status}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: 4,
                            background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                            fontSize: '0.75rem', fontWeight: 600,
                          }}>
                            {patient.department || 'General Medicine'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--cc-text-muted)', marginTop: 4 }}>
                          Chief Complaint: {patient.reason || 'General Clinical Review'} · Visit: {patient.visit_type}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleStartConsultation(patient)}
                        id={`view-patient-${patient.patient_id}`}
                        className="btn btn-primary btn-sm"
                      >
                        <Stethoscope size={14} />
                        {patient.queue_status === 'in_consultation' ? 'Resume Consultation' : 'Attend Patient'}
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🩺</div>
                <div className="empty-state-title">No patients in queue</div>
                <div className="empty-state-desc">Your patient queue will appear here as soon as reception assigns encounters to you.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { hospitalService } from '../../services';
import {
  Search, UserCheck, PlusCircle, QrCode, CheckCircle2,
  Stethoscope, Clock, Activity, ArrowRight, ShieldCheck, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

const DEPARTMENTS = [
  'General Medicine',
  'Cardiology',
  'Orthopedics & Trauma',
  'Pediatrics & Child Care',
  'Neurology',
  'Emergency & Urgent Care',
  'Dermatology',
  'Pulmonology',
];

export default function PatientLookup() {
  const [searchParams] = useSearchParams();
  const initialDept = searchParams.get('department') || 'General Medicine';

  const [mode, setMode] = useState('id'); // 'id' | 'qr'
  const [carecarryId, setCarecarryId] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);

  // Encounter creation state
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [department, setDepartment] = useState(initialDept);
  const [visitType, setVisitType] = useState('OPD');
  const [reason, setReason] = useState('General Consultation');
  const [creatingEncounter, setCreatingEncounter] = useState(false);
  const [createdEncounterData, setCreatedEncounterData] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    hospitalService.getDoctors()
      .then((res) => {
        setDoctors(res.data.data || []);
        if (res.data.data?.length > 0) {
          setDoctorId(res.data.data[0].doctor_id);
        }
      })
      .catch(() => {});
  }, []);

  const lookup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPatient(null);
    setCreatedEncounterData(null);
    try {
      const payload = mode === 'id' ? { carecarry_id: carecarryId } : { qr_token: qrToken };
      const res = await hospitalService.lookupPatient(payload);
      const p = res.data.data.patient || res.data.data;
      setPatient(p);
      toast.success('Patient identified successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Patient not found.');
    } finally {
      setLoading(false);
    }
  };

  const createEncounter = async () => {
    if (!patient) return;
    setCreatingEncounter(true);
    try {
      const res = await hospitalService.createEncounter({
        patient_id: patient.patientId || patient.patient_id,
        doctor_id: doctorId || null,
        department,
        visit_type: visitType,
        reason,
        visit_date: new Date().toISOString(),
      });
      const data = res.data.data;
      setCreatedEncounterData(data);
      toast.success(`Patient routed to ${department}! Queue Token: ${data.tokenNumber || data.token_number}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create encounter.');
    } finally {
      setCreatingEncounter(false);
    }
  };

  const resetForm = () => {
    setPatient(null);
    setCreatedEncounterData(null);
    setCarecarryId('');
    setQrToken('');
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Patient Intake & Queue Registration" />
        <div className="page-content">
          <div className="page-header" style={{ maxWidth: 680, margin: '0 auto 24px' }}>
            <div className="page-title">Patient Reception & Clinical Triage</div>
            <p className="page-subtitle">
              Verify patient CareCarry identity, assign hospital department & route to doctor queue with queue token
            </p>
          </div>

          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            {/* SUCCESS BANNER: TOKEN ISSUED */}
            {createdEncounterData && (
              <div className="card animate-fade-in" style={{
                marginBottom: 24,
                border: '1px solid rgba(16,185,129,0.4)',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.02))',
                textAlign: 'center',
                padding: '32px 24px',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(16,185,129,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <CheckCircle2 size={32} color="#10b981" />
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#10b981' }}>
                  Encounter #{createdEncounterData.encounterId || createdEncounterData.encounter_id} Registered · Status: {createdEncounterData.status}
                </div>

                <div style={{ margin: '14px 0 6px' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--cc-text-muted)' }}>Assigned Queue Token</span>
                  <div style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    color: '#f59e0b',
                    letterSpacing: '2px',
                    textShadow: '0 0 20px rgba(245,158,11,0.3)',
                  }}>
                    {createdEncounterData.tokenNumber || createdEncounterData.token_number}
                  </div>
                </div>

                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px', borderRadius: 'var(--cc-radius-full)',
                  background: 'var(--cc-surface-2)', marginBottom: 20,
                  fontSize: '0.85rem'
                }}>
                  <span style={{ color: 'var(--cc-text-muted)' }}>Department:</span>
                  <strong style={{ color: '#818cf8' }}>{createdEncounterData.department}</strong>
                  <span style={{ color: 'var(--cc-border)' }}>•</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Queue: Waiting</span>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link
                    to={`/hospital/encounters/${createdEncounterData.encounterId || createdEncounterData.encounter_id}`}
                    className="btn btn-primary"
                  >
                    Open Clinical Encounter <ArrowRight size={16} />
                  </Link>

                  <Link to="/hospital/dashboard" className="btn btn-secondary">
                    View Command Center Queue
                  </Link>

                  <button className="btn btn-ghost" onClick={resetForm}>
                    Intake Another Patient
                  </button>
                </div>
              </div>
            )}

            {!createdEncounterData && (
              <>
                {/* Mode Toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--cc-surface)', padding: 4, borderRadius: 'var(--cc-radius)' }}>
                  <button
                    id="lookup-by-id"
                    className={`btn ${mode === 'id' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1 }}
                    onClick={() => setMode('id')}
                  >
                    <Search size={16} /> CareCarry ID Lookup
                  </button>
                  <button
                    id="lookup-by-qr"
                    className={`btn ${mode === 'qr' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1 }}
                    onClick={() => setMode('qr')}
                  >
                    <QrCode size={16} /> QR Token Verification
                  </button>
                </div>

                {/* Lookup Form */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <form onSubmit={lookup}>
                    {mode === 'id' ? (
                      <div className="form-group">
                        <label className="form-label" htmlFor="carecarry-id-input">Patient CareCarry ID</label>
                        <input
                          id="carecarry-id-input"
                          className="form-input"
                          placeholder="CC-XXXXXXXX"
                          value={carecarryId}
                          onChange={(e) => setCarecarryId(e.target.value.toUpperCase())}
                          required
                          style={{ fontFamily: 'Space Grotesk', fontWeight: 700, letterSpacing: '2px', fontSize: '1.1rem' }}
                        />
                      </div>
                    ) : (
                      <div className="form-group">
                        <label className="form-label" htmlFor="qr-token-input">QR Token (from dynamic QR)</label>
                        <input
                          id="qr-token-input"
                          className="form-input"
                          placeholder="QR-XXXXXXXXXXXXXXXX"
                          value={qrToken}
                          onChange={(e) => setQrToken(e.target.value)}
                          required
                        />
                      </div>
                    )}
                    <button type="submit" id="lookup-submit" className="btn btn-primary btn-full" disabled={loading}>
                      {loading ? <div className="spinner" /> : <><Search size={16} /> Resolve & Verify Identity</>}
                    </button>
                  </form>
                </div>

                {/* Patient Result & Encounter Routing Form */}
                {patient && (
                  <div className="animate-fade-in">
                    <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '1.1rem', color: 'white',
                        }}>
                          {patient.first_name?.[0] || patient.name?.[0]}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                              {patient.name || `${patient.first_name} ${patient.last_name}`}
                            </span>
                            <span className="badge badge-success"><UserCheck size={11} /> Verified</span>
                          </div>
                          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, color: '#10b981', letterSpacing: '2px', fontSize: '0.95rem', marginTop: 2 }}>
                            {patient.carecarryId || patient.carecarry_id}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.875rem' }}>
                        {[
                          { label: 'Phone', value: patient.phone || '—' },
                          { label: 'Gender', value: patient.gender || '—' },
                          { label: 'Blood Group', value: patient.blood_group || patient.bloodGroup || '—' },
                          { label: 'DOB', value: patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : '—' },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ padding: '8px 12px', background: 'var(--cc-surface-2)', borderRadius: 8 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--cc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
                            <div style={{ fontWeight: 600 }}>{value}</div>
                          </div>
                        ))}
                      </div>

                      {patient.allergies && (
                        <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.8rem', color: '#fca5a5' }}>
                          ⚠️ <strong>Allergies:</strong> {patient.allergies}
                        </div>
                      )}
                    </div>

                    {/* Create Encounter Form */}
                    <div className="card">
                      <h3 className="card-title" style={{ marginBottom: 16 }}>Clinical Routing & Token Assignment</h3>

                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Clinical Department</label>
                          <select
                            className="form-input"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                          >
                            {DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="encounter-type">Visit Type</label>
                          <select id="encounter-type" className="form-input" value={visitType} onChange={(e) => setVisitType(e.target.value)}>
                            <option value="OPD">OPD (Outpatient)</option>
                            <option value="IPD">IPD (Inpatient)</option>
                            <option value="Emergency">Emergency / Urgent</option>
                            <option value="Laboratory">Laboratory Diagnostics</option>
                            <option value="Imaging">Radiology / Imaging</option>
                            <option value="Follow-up">Follow-up Review</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="doctor-id-input">Assign Attending Physician</label>
                        <select id="doctor-id-input" className="form-input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                          <option value="">No Doctor Assigned (Triage Pool)</option>
                          {doctors.map((d) => (
                            <option key={d.doctor_id} value={d.doctor_id}>
                              Dr. {d.first_name} {d.last_name} — {d.specialization}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="encounter-reason">Reason for Visit / Triage Chief Complaint</label>
                        <input
                          id="encounter-reason"
                          className="form-input"
                          placeholder="e.g. Chest pain evaluation, recurrent cough, high fever"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </div>

                      <button id="create-encounter-btn" className="btn btn-success btn-full" onClick={createEncounter} disabled={creatingEncounter}>
                        {creatingEncounter ? <div className="spinner" /> : <><PlusCircle size={16} /> Generate Queue Token & Route to Doctor</>}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

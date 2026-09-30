import { useState, useRef, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { hospitalService } from '../../services';
import { QrCode, Search, UserCheck, PlusCircle, CheckCircle, AlertTriangle, ArrowRight, Camera, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function QRScannerPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [department, setDepartment] = useState('General Medicine');
  const [visitType, setVisitType] = useState('OPD');
  const [visitReason, setVisitReason] = useState('General Consultation');
  const [creating, setCreating] = useState(false);
  const [createdData, setCreatedData] = useState(null);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    hospitalService.getDoctors()
      .then((res) => {
        setDoctors(res.data.data || []);
        if (res.data.data?.length > 0) {
          setSelectedDoctor(res.data.data[0].doctor_id);
        }
      })
      .catch(() => {});
  }, []);

  const handleResolve = async (tokenOrId) => {
    const val = (tokenOrId || tokenInput).trim();
    if (!val) {
      toast.error('Please enter a CareCarry ID or QR token.');
      return;
    }

    setLoading(true);
    setPatient(null);
    setCreatedData(null);

    try {
      let payload = {};
      if (val.startsWith('CC-')) {
        payload = { carecarryId: val };
      } else {
        payload = { token: val };
      }

      const res = await hospitalService.resolvePatient(payload);
      const p = res.data.data.patient || res.data.data;
      setPatient(p);
      toast.success('Patient identified successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Patient identification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEncounter = async (e) => {
    e.preventDefault();
    if (!patient) return;

    setCreating(true);
    try {
      const res = await hospitalService.createEncounter({
        patientId: patient.patientId || patient.patient_id,
        doctorId: selectedDoctor || null,
        department,
        visitType,
        reason: visitReason,
        date: new Date().toISOString(),
      });

      const data = res.data.data;
      setCreatedData(data);
      toast.success(`Encounter #${data.encounterId || data.encounter_id} registered! Token: ${data.tokenNumber || data.token_number}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create encounter.');
    } finally {
      setCreating(false);
    }
  };

  const handleSimulateScan = () => {
    setIsSimulatingCamera(true);
    setTimeout(() => {
      setIsSimulatingCamera(false);
      setTokenInput('CC-7K3QX9AB');
      handleResolve('CC-7K3QX9AB');
    }, 1200);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Hospital QR Scanner & Patient Reception" />
        <div className="page-content">
          <div className="page-header" style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="page-title">Hospital Patient Triage & QR Scanner</div>
            <p className="page-subtitle">
              Scan patient's digital QR CareCard or enter CareCarry ID to retrieve identity and initiate an encounter
            </p>
          </div>

          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            {/* Scanner Viewport Box */}
            <div className="card" style={{ textAlign: 'center', padding: '32px 24px', marginBottom: 24, position: 'relative' }}>
              <div style={{
                width: 240, height: 240, margin: '0 auto 20px',
                border: '2px dashed var(--cc-primary)', borderRadius: 20,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(99,102,241,0.04)', position: 'relative', overflow: 'hidden'
              }}>
                {isSimulatingCamera ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div className="spinner" style={{ width: 36, height: 36 }} />
                    <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>Scanning QR CareCard...</div>
                  </div>
                ) : (
                  <>
                    <QrCode size={64} color="var(--cc-primary)" style={{ opacity: 0.8, marginBottom: 8 }} />
                    <div style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                      Aim camera at patient QR CareCard
                    </div>
                  </>
                )}

                {/* Simulated laser scan line animation */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: 2, background: '#10b981',
                  boxShadow: '0 0 10px #10b981', top: '50%',
                  animation: 'pulse 1.5s infinite',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  type="button"
                  id="simulate-scan-btn"
                  className="btn btn-primary"
                  onClick={handleSimulateScan}
                  disabled={isSimulatingCamera || loading}
                >
                  <Camera size={16} /> Scan Demo Patient QR (CC-7K3QX9AB)
                </button>
              </div>
            </div>

            {/* Manual input */}
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 className="card-title" style={{ marginBottom: 14 }}>Or Enter CareCarry ID / Token Manually</h3>
              <form onSubmit={(e) => { e.preventDefault(); handleResolve(); }} style={{ display: 'flex', gap: 10 }}>
                <input
                  id="scanner-manual-input"
                  className="form-input"
                  placeholder="e.g. CC-7K3QX9AB or QR-..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  style={{ fontFamily: 'Space Grotesk', fontWeight: 700, letterSpacing: '1px' }}
                />
                <button type="submit" id="scanner-resolve-btn" className="btn btn-primary" disabled={loading}>
                  {loading ? <div className="spinner" /> : <><Search size={16} /> Resolve</>}
                </button>
              </form>
            </div>

            {/* Resolved Patient Card */}
            {patient && (
              <div className="card animate-fade-in" style={{ border: '2px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.03)', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem'
                    }}>
                      {patient.name?.[0] || 'P'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{patient.name}</span>
                        <span className="badge badge-success"><UserCheck size={12} /> Verified</span>
                      </div>
                      <div style={{ fontFamily: 'Space Grotesk', color: '#10b981', fontWeight: 700, letterSpacing: '2px', fontSize: '0.95rem', marginTop: 2 }}>
                        {patient.carecarryId || patient.carecarry_id}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: '0.85rem', marginBottom: 20 }}>
                  <div style={{ background: 'var(--cc-surface-2)', padding: '8px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase' }}>DOB</div>
                    <div style={{ fontWeight: 600, marginTop: 2 }}>{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '—'}</div>
                  </div>
                  <div style={{ background: 'var(--cc-surface-2)', padding: '8px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase' }}>Gender</div>
                    <div style={{ fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>{patient.gender || '—'}</div>
                  </div>
                  <div style={{ background: 'var(--cc-surface-2)', padding: '8px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase' }}>Blood Group</div>
                    <div style={{ fontWeight: 600, marginTop: 2, color: '#f87171' }}>{patient.bloodGroup || '—'}</div>
                  </div>
                </div>

                {/* SUCCESS CONFIRMATION BANNER */}
                {createdData ? (
                  <div style={{
                    marginTop: 20, padding: 24, borderRadius: 'var(--cc-radius)',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.03))',
                    border: '1px solid rgba(16,185,129,0.4)', textAlign: 'center'
                  }}>
                    <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f3f4f6' }}>
                      Encounter #{createdData.encounterId || createdData.encounter_id} Registered!
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--cc-text-muted)', marginTop: 4 }}>
                      Patient routed to <strong>{createdData.department}</strong>
                    </div>

                    <div style={{ margin: '14px 0' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>Assigned Queue Token</span>
                      <div style={{
                        fontFamily: 'Space Grotesk', fontSize: '2.5rem', fontWeight: 900,
                        color: '#f59e0b', letterSpacing: '2px'
                      }}>
                        {createdData.tokenNumber || createdData.token_number}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/hospital/encounters/${createdData.encounterId || createdData.encounter_id}`)}
                      >
                        Open Encounter Details <ArrowRight size={14} />
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/hospital/dashboard')}
                      >
                        Command Center
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => { setPatient(null); setCreatedData(null); setTokenInput(''); }}
                      >
                        Scan Next
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Create Encounter Form */
                  <form onSubmit={handleCreateEncounter} style={{ borderTop: '1px solid var(--cc-border)', paddingTop: 16 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PlusCircle size={16} color="#6366f1" /> Route Patient & Generate Queue Token
                    </h4>

                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label" htmlFor="encounter-dept">Clinical Department</label>
                        <select
                          id="encounter-dept"
                          className="form-input"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                        >
                          <option value="General Medicine">General Medicine</option>
                          <option value="Cardiology">Cardiology</option>
                          <option value="Orthopedics & Trauma">Orthopedics & Trauma</option>
                          <option value="Pediatrics & Child Care">Pediatrics & Child Care</option>
                          <option value="Neurology">Neurology</option>
                          <option value="Emergency & Urgent Care">Emergency & Urgent Care</option>
                          <option value="Dermatology">Dermatology</option>
                          <option value="Pulmonology">Pulmonology</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="encounter-visittype">Visit Type</label>
                        <select
                          id="encounter-visittype"
                          className="form-input"
                          value={visitType}
                          onChange={(e) => setVisitType(e.target.value)}
                        >
                          <option value="OPD">OPD (Outpatient)</option>
                          <option value="IPD">IPD (Inpatient)</option>
                          <option value="Emergency">Emergency Triage</option>
                          <option value="Laboratory">Laboratory Walk-in</option>
                          <option value="Imaging">Radiology / Imaging</option>
                          <option value="Follow-up">Follow-up Visit</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="encounter-doctor">Assign Attending Doctor</label>
                      <select
                        id="encounter-doctor"
                        className="form-input"
                        value={selectedDoctor}
                        onChange={(e) => setSelectedDoctor(e.target.value)}
                      >
                        <option value="">No Doctor (Triage / Lab only)</option>
                        {doctors.map((d) => (
                          <option key={d.doctor_id} value={d.doctor_id}>
                            Dr. {d.first_name} {d.last_name} ({d.specialization})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="encounter-reason">Reason for Visit / Chief Complaints</label>
                      <input
                        id="encounter-reason"
                        className="form-input"
                        placeholder="e.g. High fever for 3 days, body pain"
                        value={visitReason}
                        onChange={(e) => setVisitReason(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      id="submit-create-encounter"
                      className="btn btn-primary btn-full btn-lg"
                      disabled={creating}
                    >
                      {creating ? <div className="spinner" /> : <><PlusCircle size={18} /> Generate Queue Token & Route to Doctor</>}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

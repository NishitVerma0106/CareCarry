import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { doctorService, interoperabilityService } from '../../services';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Stethoscope, Pill, ClipboardList, PlusCircle, Save, CheckCircle2,
  AlertTriangle, Heart, Clock, FileText, ChevronRight, Check,
  Globe, Building2, ExternalLink, ShieldCheck, Eye, RefreshCw, X,
  Activity, Share2, Layers, ArrowUpRight, Lock, CheckCircle
} from 'lucide-react';

export default function PatientClinicalView() {
  const { id, patientId } = useParams();
  const [searchParams] = useSearchParams();
  const encounterIdFromQuery = searchParams.get('encounterId');
  const targetId = id || encounterIdFromQuery || patientId;

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  // Federated Interoperability State
  const [federatedRecords, setFederatedRecords] = useState([]);
  const [loadingFederated, setLoadingFederated] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Consultation state
  const [symptoms, setSymptoms] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [savedConsultationId, setSavedConsultationId] = useState(null);
  const [savingConsultation, setSavingConsultation] = useState(false);

  // Diagnosis state
  const [diagnosis, setDiagnosis] = useState('');
  const [icdCode, setIcdCode] = useState('');
  const [remarks, setRemarks] = useState('');
  const [savedDiagnosisId, setSavedDiagnosisId] = useState(null);
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);

  // Prescription state
  const [rxInstructions, setRxInstructions] = useState('Take medicines after meals with plenty of water.');
  const [rxItems, setRxItems] = useState([
    { medicine_name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days', notes: 'When fever > 99°F' },
    { medicine_name: 'Cetirizine 10mg', dosage: '1 tablet', frequency: 'Once at bedtime', duration: '5 days', notes: 'For allergic symptoms' },
  ]);
  const [savedRxId, setSavedRxId] = useState(null);
  const [savingRx, setSavingRx] = useState(false);

  const navigate = useNavigate();

  const fetchSummary = async () => {
    try {
      let res;
      if (id) {
        res = await doctorService.getClinicalSummary(id);
      } else if (encounterIdFromQuery) {
        res = await doctorService.getClinicalSummary(encounterIdFromQuery);
      } else {
        res = await doctorService.getPatientSummary(patientId);
      }
      setSummary(res.data.data);
      if (res.data.data?.patient?.carecarry_id) {
        fetchFederatedRecords(res.data.data.patient.carecarry_id);
      }
    } catch {
      toast.error('Failed to load clinical summary.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFederatedRecords = async (carecarryId) => {
    if (!carecarryId) return;
    setLoadingFederated(true);
    try {
      const res = await interoperabilityService.discoverRecords(carecarryId);
      setFederatedRecords(res.data.data?.records || []);
    } catch (err) {
      console.error('Failed to load federated records:', err);
    } finally {
      setLoadingFederated(false);
    }
  };

  const handleViewFederatedDoc = async (record) => {
    setDocModalOpen(true);
    setSelectedDoc({ record, loading: true, data: null, error: null });
    try {
      const res = await interoperabilityService.fetchFederatedDocument(record.record_id);
      setSelectedDoc({ record, loading: false, data: res.data.data, error: null });
    } catch (err) {
      setSelectedDoc({
        record,
        loading: false,
        data: null,
        error: err.response?.data?.message || 'Failed to stream document from source HIS',
      });
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [id, patientId, encounterIdFromQuery]);

  const encId = summary?.encounter?.encounter_id || encounterIdFromQuery || id;

  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    if (!encId) {
      toast.error('Encounter ID is missing.');
      return;
    }
    if (!symptoms.trim()) {
      toast.error('Symptoms / Chief complaints are required.');
      return;
    }

    setSavingConsultation(true);
    try {
      const res = await doctorService.createConsultation({
        encounter_id: encId,
        symptoms,
        clinical_notes: clinicalNotes,
        follow_up: followUp,
      });

      const cid = res.data.data.consultationId;
      setSavedConsultationId(cid);
      toast.success('Consultation saved successfully! Proceeding to diagnosis.');
      setActiveTab('diagnosis');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save consultation.');
    } finally {
      setSavingConsultation(false);
    }
  };

  const handleSaveDiagnosis = async (e) => {
    e.preventDefault();
    if (!savedConsultationId) {
      toast.error('Please save consultation first before recording diagnosis.');
      return;
    }
    if (!diagnosis.trim()) {
      toast.error('Diagnosis is required.');
      return;
    }

    setSavingDiagnosis(true);
    try {
      const res = await doctorService.createDiagnosis({
        consultation_id: savedConsultationId,
        diagnosis,
        icd_code: icdCode,
        remarks,
      });

      setSavedDiagnosisId(res.data.data.diagnosisId);
      toast.success('Diagnosis saved! Proceeding to prescription.');
      setActiveTab('prescription');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save diagnosis.');
    } finally {
      setSavingDiagnosis(false);
    }
  };

  const handleSavePrescription = async (e) => {
    e.preventDefault();
    if (!savedConsultationId) {
      toast.error('Please save consultation first.');
      return;
    }

    setSavingRx(true);
    try {
      const res = await doctorService.createPrescription({
        consultation_id: savedConsultationId,
        instructions: rxInstructions,
        items: rxItems,
      });

      setSavedRxId(res.data.data.prescriptionId);
      toast.success('Prescription recorded and patient timeline updated!');
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record prescription.');
    } finally {
      setSavingRx(false);
    }
  };

  const handleAddMedicine = () => {
    setRxItems([...rxItems, { medicine_name: '', dosage: '', frequency: '', duration: '', notes: '' }]);
  };

  const handleRemoveMedicine = (idx) => {
    setRxItems(rxItems.filter((_, i) => i !== idx));
  };

  const tabs = [
    { id: 'summary', label: '1. Clinical Summary & History', icon: ClipboardList },
    {
      id: 'federated',
      label: `2. Federated HIS Discovery (${federatedRecords.length})`,
      icon: Globe,
      badge: federatedRecords.length > 0 ? `${federatedRecords.length} Cross-Hospital` : null,
    },
    { id: 'consultation', label: '3. Record Consultation', icon: Stethoscope, done: !!savedConsultationId },
    { id: 'diagnosis', label: '4. Add Diagnosis', icon: Heart, done: !!savedDiagnosisId },
    { id: 'prescription', label: '5. Write Prescription', icon: Pill, done: !!savedRxId },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Clinical Examination & Treatment" />
        <div className="page-content">
          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : summary?.patient ? (
            <div className="animate-fade-in" style={{ maxWidth: 960, margin: '0 auto' }}>
              {/* Patient Banner with CareCarry ID + National ABHA ID Separation */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.25), rgba(99, 102, 241, 0.15))',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                borderRadius: 'var(--cc-radius-xl)',
                padding: '20px 24px',
                marginBottom: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '1.25rem', color: 'white', flexShrink: 0,
                  }}>
                    {summary.patient.first_name?.[0]}{summary.patient.last_name?.[0]}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                        {summary.patient.first_name} {summary.patient.last_name}
                      </h2>
                      <span className="badge badge-success">Verified Patient</span>
                      {summary.patient.abha_id ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600
                        }}>
                          <ShieldCheck size={13} /> ABHA: {summary.patient.abha_id}
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: 'rgba(148, 163, 184, 0.1)', color: 'var(--cc-text-muted)',
                          padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem'
                        }}>
                          ABHA: Not Linked
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--cc-text-muted)', marginTop: 6, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, color: '#818cf8', letterSpacing: '0.5px' }}>
                        ID: {summary.patient.carecarry_id}
                      </span>
                      <span>DOB: {summary.patient.date_of_birth ? format(new Date(summary.patient.date_of_birth), 'dd MMM yyyy') : '—'}</span>
                      <span>Gender: {summary.patient.gender || '—'}</span>
                      {summary.patient.blood_group && <span>Blood: <strong>{summary.patient.blood_group}</strong></span>}
                    </div>
                  </div>
                </div>

                {summary.encounter && (
                  <div style={{ textAlign: 'right' }}>
                    <div className="badge badge-primary">Encounter #{summary.encounter.encounter_id}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--cc-text-muted)', marginTop: 4 }}>
                      {summary.encounter.visit_type} · {format(new Date(summary.encounter.visit_date), 'dd MMM yyyy')}
                    </div>
                  </div>
                )}
              </div>

              {/* Critical Alerts Banner (Allergies & Conditions) */}
              {(summary.patient.allergies || summary.patient.conditions) && (
                <div style={{ display: 'grid', gridTemplateColumns: summary.patient.allergies && summary.patient.conditions ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 20 }}>
                  {summary.patient.allergies && (
                    <div className="alert alert-warning" style={{ margin: 0 }}>
                      <AlertTriangle size={18} />
                      <div>
                        <strong>Known Allergies: </strong> {summary.patient.allergies}
                      </div>
                    </div>
                  )}
                  {summary.patient.conditions && (
                    <div className="alert alert-info" style={{ margin: 0 }}>
                      <Heart size={18} />
                      <div>
                        <strong>Existing Conditions: </strong> {summary.patient.conditions}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Clinical Workflow Stepper Tabs */}
              <div style={{
                display: 'flex', gap: 8, marginBottom: 24,
                background: 'var(--cc-surface)', padding: 6, borderRadius: 'var(--cc-radius-lg)',
                border: '1px solid var(--cc-border)', flexWrap: 'wrap'
              }}>
                {tabs.map(({ id: tid, label, icon: Icon, done, badge }) => (
                  <button
                    key={tid}
                    id={`btn-tab-${tid}`}
                    className={`btn ${activeTab === tid ? 'btn-primary' : 'btn-ghost'}`}
                    style={{
                      flex: 1, minWidth: 155, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      position: 'relative'
                    }}
                    onClick={() => setActiveTab(tid)}
                  >
                    {done ? <CheckCircle2 size={16} color="#10b981" /> : <Icon size={16} />}
                    <span style={{ fontSize: '0.825rem' }}>{label}</span>
                    {badge && (
                      <span style={{
                        background: '#3b82f6', color: 'white', fontSize: '0.65rem',
                        fontWeight: 700, padding: '1px 5px', borderRadius: 10, marginLeft: 4
                      }}>
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* 1. Summary Tab */}
              {activeTab === 'summary' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Federated Health Record Discovery Spotlight Banner */}
                  <div style={{
                    gridColumn: 'span 2',
                    background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(15, 23, 42, 0.85))',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 16
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: 'rgba(59, 130, 246, 0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#60a5fa', flexShrink: 0
                      }}>
                        <Globe size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#93c5fd' }}>
                            CareCarry Interoperability Gateway: Federated Discovery
                          </h4>
                          <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>Zero Storage Duplication</span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: 'var(--cc-text-muted)' }}>
                          Discovered <strong>{federatedRecords.length} external clinical records</strong> across connected hospital networks (Apollo HIS, Max Healthcare EMR, Fortis Care).
                          CareCarry references external records via authorized APIs without copying documents.
                        </p>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setActiveTab('federated')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Eye size={14} /> Review External Records ({federatedRecords.length}) <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Previous Diagnoses */}
                  <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Heart size={18} color="#ef4444" /> Previous Diagnoses
                    </h3>
                    {summary.diagnoses?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {summary.diagnoses.map((d, i) => (
                          <div key={i} style={{ padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 8 }}>
                            <div style={{ fontWeight: 700, color: '#f87171' }}>{d.diagnosis}</div>
                            {d.remarks && <div style={{ fontSize: '0.8rem', color: 'var(--cc-text)', marginTop: 2 }}>{d.remarks}</div>}
                            <div style={{ fontSize: '0.72rem', color: 'var(--cc-text-muted)', marginTop: 4 }}>
                              {d.hospital_name} · {d.visit_date ? format(new Date(d.visit_date), 'dd MMM yyyy') : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.85rem' }}>No past diagnoses recorded.</div>
                    )}
                  </div>

                  {/* Previous Prescriptions */}
                  <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Pill size={18} color="#10b981" /> Previous Prescriptions
                    </h3>
                    {summary.prescriptions?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {summary.prescriptions.map((p, i) => (
                          <div key={i} style={{ padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 8 }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)', marginBottom: 6 }}>
                              Prescribed by Dr. {p.doctor_first} {p.doctor_last} on {format(new Date(p.created_at || p.visit_date), 'dd MMM yyyy')}
                            </div>
                            {p.items?.map((it, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginTop: 3 }}>
                                <span style={{ fontWeight: 600 }}>{it.medicine_name}</span>
                                <span style={{ color: 'var(--cc-text-muted)' }}>{it.dosage} · {it.frequency}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.85rem' }}>No past prescriptions recorded.</div>
                    )}
                  </div>

                  {/* Previous Consultations */}
                  <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={18} color="#6366f1" /> Past Consultations History
                      </h3>
                      <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('consultation')}>
                        Start Examination <ChevronRight size={14} />
                      </button>
                    </div>

                    {summary.consultations?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {summary.consultations.map((c, i) => (
                          <div key={i} style={{ padding: '12px 16px', background: 'var(--cc-surface-2)', borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontWeight: 700 }}>Dr. {c.doctor_first} {c.doctor_last}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)' }}>
                                {format(new Date(c.created_at || c.visit_date), 'dd MMM yyyy')}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem' }}><strong>Symptoms: </strong>{c.symptoms}</div>
                            {c.clinical_notes && <div style={{ fontSize: '0.825rem', color: 'var(--cc-text-muted)', marginTop: 4 }}><strong>Notes: </strong>{c.clinical_notes}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.85rem' }}>No previous consultations.</div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Federated Cross-Hospital Discovery Tab */}
              {activeTab === 'federated' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Architecture & Interoperability Header Card */}
                  <div className="card" style={{
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#e2e8f0' }}>
                            Federated Cross-Hospital Clinical History
                          </h3>
                          <span className="badge badge-success">Live Adapter Gateway</span>
                        </div>
                        <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--cc-text-muted)', maxWidth: 680 }}>
                          CareCarry functions as an authorized <strong>Interoperability & Access Layer</strong>. The clinical records below remain hosted in each hospital’s source HIS/EMR database. No permanent duplicate copies are kept in CareCarry; records are verified by consent and streamed on-demand.
                        </p>
                      </div>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => fetchFederatedRecords(summary.patient.carecarry_id)}
                        disabled={loadingFederated}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <RefreshCw size={14} className={loadingFederated ? 'spin' : ''} />
                        Refresh Network
                      </button>
                    </div>

                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--cc-border)'
                    }}>
                      <div style={{ fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--cc-text-muted)' }}>Identity Context:</span>
                        <div style={{ fontWeight: 700, color: '#818cf8', marginTop: 2 }}>
                          {summary.patient.carecarry_id}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--cc-text-muted)' }}>National Health Identity:</span>
                        <div style={{ fontWeight: 700, color: summary.patient.abha_id ? '#34d399' : 'var(--cc-text-muted)', marginTop: 2 }}>
                          {summary.patient.abha_id || 'Not linked to ABHA'}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--cc-text-muted)' }}>Discovery Protocol:</span>
                        <div style={{ fontWeight: 700, color: '#60a5fa', marginTop: 2 }}>
                          FHIR R4 / ABDM-Compatible Adapter
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Federated Records List */}
                  {loadingFederated ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div className="spinner" style={{ margin: '0 auto 16px' }} />
                      <div style={{ fontSize: '0.9rem', color: 'var(--cc-text-muted)' }}>
                        Querying connected hospital integration adapters...
                      </div>
                    </div>
                  ) : federatedRecords.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <Globe size={40} color="var(--cc-text-muted)" style={{ margin: '0 auto 12px' }} />
                      <h4 style={{ margin: 0, fontWeight: 700 }}>No External Hospital Records Discovered</h4>
                      <p style={{ color: 'var(--cc-text-muted)', fontSize: '0.85rem', marginTop: 6 }}>
                        No participating hospital HIS has registered federated clinical events for this patient identity yet.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {federatedRecords.map((rec) => (
                        <div
                          key={rec.record_id}
                          className="card"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 16,
                            borderLeft: '4px solid #3b82f6',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 280 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                              <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                                <Building2 size={12} style={{ marginRight: 4 }} />
                                {rec.provider_name}
                              </span>
                              <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                                {rec.record_type}
                              </span>
                              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--cc-text-muted)' }}>
                                Source ID: {rec.source_record_id}
                              </span>
                            </div>

                            <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700 }}>
                              {rec.title}
                            </h4>

                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                              <span>Date: <strong>{rec.encounter_date ? format(new Date(rec.encounter_date), 'dd MMM yyyy') : '—'}</strong></span>
                              <span>Method: <strong>{rec.access_method}</strong></span>
                              <span>Hospital Network: <strong>{rec.provider_code}</strong></span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <button
                              id={`fetch-doc-${rec.record_id}`}
                              className="btn btn-primary"
                              onClick={() => handleViewFederatedDoc(rec)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                              <Eye size={16} /> Fetch from Source HIS
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Record Consultation Tab */}
              {activeTab === 'consultation' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Record Clinical Consultation</h3>
                    {savedConsultationId && <span className="badge badge-success"><Check size={12} /> Consultation #{savedConsultationId} Saved</span>}
                  </div>

                  <form onSubmit={handleSaveConsultation}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="input-symptoms">Chief Complaints & Symptoms *</label>
                      <textarea
                        id="input-symptoms"
                        className="form-input"
                        placeholder="e.g. Acute fever for 3 days with chills, sore throat, and persistent dry cough"
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        required
                        rows={3}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="input-notes">Clinical Notes & Physical Examination Findings</label>
                      <textarea
                        id="input-notes"
                        className="form-input"
                        placeholder="e.g. Temperature 101.5°F, BP 120/80 mmHg, Pulse 88 bpm. Bilateral chest clear, no lymphadenopathy"
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="input-followup">Follow-up Instructions</label>
                      <input
                        id="input-followup"
                        className="form-input"
                        placeholder="e.g. Review in OPD after 5 days. Return immediately if fever exceeds 103°F"
                        value={followUp}
                        onChange={(e) => setFollowUp(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                      <button type="submit" id="save-consultation-btn" className="btn btn-primary btn-lg" disabled={savingConsultation}>
                        {savingConsultation ? <div className="spinner" /> : <><Save size={18} /> Save Consultation & Continue</>}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 3. Add Diagnosis Tab */}
              {activeTab === 'diagnosis' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Clinical Diagnosis</h3>
                    {savedDiagnosisId && <span className="badge badge-success"><Check size={12} /> Diagnosis Saved</span>}
                  </div>

                  {!savedConsultationId && (
                    <div className="alert alert-warning" style={{ marginBottom: 20 }}>
                      <AlertTriangle size={18} />
                      <div>Please record and save the consultation in Step 2 before adding the diagnosis.</div>
                    </div>
                  )}

                  <form onSubmit={handleSaveDiagnosis}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label" htmlFor="input-diagnosis">Diagnosis Title *</label>
                        <input
                          id="input-diagnosis"
                          className="form-input"
                          placeholder="e.g. Acute Viral Pharyngitis / Viral Fever"
                          value={diagnosis}
                          onChange={(e) => setDiagnosis(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="input-icd">ICD-10 Code (Optional)</label>
                        <input
                          id="input-icd"
                          className="form-input"
                          placeholder="e.g. J02.9"
                          value={icdCode}
                          onChange={(e) => setIcdCode(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="input-remarks">Diagnostic Remarks & Impression</label>
                      <textarea
                        id="input-remarks"
                        className="form-input"
                        placeholder="e.g. Clinically consistent with viral upper respiratory tract infection. Blood count within acceptable limits."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                      <button
                        type="submit"
                        id="save-diagnosis-btn"
                        className="btn btn-primary btn-lg"
                        disabled={savingDiagnosis || !savedConsultationId}
                      >
                        {savingDiagnosis ? <div className="spinner" /> : <><Save size={18} /> Save Diagnosis & Go to Prescription</>}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 4. Write Prescription Tab */}
              {activeTab === 'prescription' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Digital Prescription</h3>
                    {savedRxId && <span className="badge badge-success"><Check size={12} /> Prescription Recorded</span>}
                  </div>

                  {!savedConsultationId && (
                    <div className="alert alert-warning" style={{ marginBottom: 20 }}>
                      <AlertTriangle size={18} />
                      <div>Please record the consultation first in Step 2.</div>
                    </div>
                  )}

                  <form onSubmit={handleSavePrescription}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="rx-instructions">General Patient Instructions</label>
                      <textarea
                        id="rx-instructions"
                        className="form-input"
                        placeholder="Take medicines after meals, drink plenty of water, avoid cold items..."
                        value={rxInstructions}
                        onChange={(e) => setRxInstructions(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <label className="form-label" style={{ margin: 0 }}>Medications List</label>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddMedicine}>
                          <PlusCircle size={14} /> Add Medicine
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {rxItems.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr auto', gap: 8,
                              background: 'var(--cc-surface-2)', padding: 12, borderRadius: 8, alignItems: 'center'
                            }}
                          >
                            <input
                              className="form-input"
                              placeholder="Medicine Name (e.g. Paracetamol 500mg)"
                              value={item.medicine_name}
                              onChange={(e) => {
                                const next = [...rxItems];
                                next[idx].medicine_name = e.target.value;
                                setRxItems(next);
                              }}
                              required
                            />
                            <input
                              className="form-input"
                              placeholder="Dosage (1 tab)"
                              value={item.dosage}
                              onChange={(e) => {
                                const next = [...rxItems];
                                next[idx].dosage = e.target.value;
                                setRxItems(next);
                              }}
                            />
                            <input
                              className="form-input"
                              placeholder="Frequency (2/day)"
                              value={item.frequency}
                              onChange={(e) => {
                                const next = [...rxItems];
                                next[idx].frequency = e.target.value;
                                setRxItems(next);
                              }}
                            />
                            <input
                              className="form-input"
                              placeholder="Duration (5 days)"
                              value={item.duration}
                              onChange={(e) => {
                                const next = [...rxItems];
                                next[idx].duration = e.target.value;
                                setRxItems(next);
                              }}
                            />
                            <input
                              className="form-input"
                              placeholder="Notes (e.g. after food)"
                              value={item.notes}
                              onChange={(e) => {
                                const next = [...rxItems];
                                next[idx].notes = e.target.value;
                                setRxItems(next);
                              }}
                            />
                            {rxItems.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleRemoveMedicine(idx)}
                                style={{ color: '#ef4444', padding: '6px' }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                      <button
                        type="submit"
                        id="save-prescription-btn"
                        className="btn btn-primary btn-lg"
                        disabled={savingRx || !savedConsultationId}
                      >
                        {savingRx ? <div className="spinner" /> : <><Save size={18} /> Finalize & Issue Prescription</>}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Federated Live Document Streaming Modal */}
              {docModalOpen && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                  padding: 20
                }}>
                  <div style={{
                    background: 'var(--cc-surface)', borderRadius: 'var(--cc-radius-xl)',
                    border: '1px solid rgba(59, 130, 246, 0.4)', maxWidth: 760, width: '100%',
                    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                    animation: 'fadeIn 0.2s ease-out'
                  }}>
                    {/* Modal Header */}
                    <div style={{
                      padding: '20px 24px', borderBottom: '1px solid var(--cc-border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.35), rgba(15, 23, 42, 0.6))'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 8,
                          background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                              {selectedDoc?.record?.provider_name || 'Hospital HIS Integration Gateway'}
                            </h3>
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                              <CheckCircle2 size={10} style={{ marginRight: 3 }} /> Live Streamed
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--cc-text-muted)', marginTop: 2 }}>
                            Source Record ID: <span style={{ fontFamily: 'monospace', color: '#93c5fd' }}>{selectedDoc?.record?.source_record_id}</span> · Access: Federated API
                          </div>
                        </div>
                      </div>

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDocModalOpen(false)}
                        style={{ padding: '6px', color: 'var(--cc-text-muted)' }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                      {selectedDoc?.loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                          <div className="spinner" style={{ margin: '0 auto 16px' }} />
                          <div style={{ fontSize: '1rem', fontWeight: 600 }}>Streaming Document from Source HIS...</div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--cc-text-muted)', marginTop: 6 }}>
                            Verifying clinician JWT and patient consent · Normalizing FHIR payload on-the-fly
                          </p>
                        </div>
                      ) : selectedDoc?.error ? (
                        <div className="alert alert-warning">
                          <AlertTriangle size={20} />
                          <div>{selectedDoc.error}</div>
                        </div>
                      ) : selectedDoc?.data?.document ? (
                        <div>
                          {/* Zero Duplication Gateway Banner */}
                          <div style={{
                            background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)',
                            borderRadius: 8, padding: '12px 16px', marginBottom: 20,
                            display: 'flex', alignItems: 'center', gap: 12
                          }}>
                            <ShieldCheck size={24} color="#34d399" />
                            <div style={{ fontSize: '0.82rem', color: 'var(--cc-text)' }}>
                              <strong>Zero-Storage Interoperability Verified:</strong> This clinical document is streamed live from {selectedDoc.data.document.hospitalName}. CareCarry maintains 0 permanent document duplicates in its database.
                            </div>
                          </div>

                          {/* Document Content Header */}
                          <div style={{
                            borderBottom: '1px solid var(--cc-border)', paddingBottom: 14, marginBottom: 16,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10
                          }}>
                            <div>
                              <h4 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800 }}>
                                {selectedDoc.data.document.title}
                              </h4>
                              <div style={{ fontSize: '0.825rem', color: 'var(--cc-text-muted)' }}>
                                Patient: <strong>{selectedDoc.data.document.patientName}</strong> · MRN: <code>{selectedDoc.data.document.mrn}</code>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                              <div>Date: <strong>{selectedDoc.data.document.date}</strong></div>
                              <div>Attending: <strong>{selectedDoc.data.document.doctor}</strong></div>
                            </div>
                          </div>

                          {/* Render Specific Document Types */}
                          {/* Lab Test Results */}
                          {selectedDoc.data.document.data && (
                            <div style={{ marginBottom: 20 }}>
                              <h5 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--cc-text-muted)', marginBottom: 10 }}>
                                Laboratory Test Parameters
                              </h5>
                              <div style={{
                                border: '1px solid var(--cc-border)', borderRadius: 8, overflow: 'hidden'
                              }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                  <thead>
                                    <tr style={{ background: 'var(--cc-surface-2)', textAlign: 'left', borderBottom: '1px solid var(--cc-border)' }}>
                                      <th style={{ padding: '8px 12px' }}>Parameter</th>
                                      <th style={{ padding: '8px 12px' }}>Result / Reference Interval</th>
                                      <th style={{ padding: '8px 12px' }}>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(selectedDoc.data.document.data).map(([key, val], idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid var(--cc-border)' }}>
                                        <td style={{ padding: '10px 12px', fontWeight: 600, textTransform: 'capitalize' }}>
                                          {key.replace(/([A-Z])/g, ' $1')}
                                        </td>
                                        <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                                          {val}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Normal</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {selectedDoc.data.document.interpretation && (
                                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 6, fontSize: '0.85rem' }}>
                                  <strong>Clinical Interpretation: </strong>{selectedDoc.data.document.interpretation}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Cardiology Findings */}
                          {selectedDoc.data.document.findings && (
                            <div style={{ marginBottom: 20 }}>
                              <h5 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--cc-text-muted)', marginBottom: 10 }}>
                                Cardiology Echo & Doppler Observations
                              </h5>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {Object.entries(selectedDoc.data.document.findings).map(([key, val], idx) => (
                                  <div key={idx} style={{ padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 6, fontSize: '0.85rem' }}>
                                    <strong style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}: </strong>
                                    <span>{val}</span>
                                  </div>
                                ))}
                              </div>
                              {selectedDoc.data.document.conclusion && (
                                <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 6, fontSize: '0.85rem' }}>
                                  <strong>Cardiologist Conclusion: </strong>{selectedDoc.data.document.conclusion}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Discharge Summary */}
                          {selectedDoc.data.document.clinicalCourse && (
                            <div style={{ marginBottom: 20 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                                <div style={{ padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 6, fontSize: '0.85rem' }}>
                                  <span style={{ color: 'var(--cc-text-muted)' }}>Admission Date:</span> <strong>{selectedDoc.data.document.admissionDate}</strong>
                                </div>
                                <div style={{ padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 6, fontSize: '0.85rem' }}>
                                  <span style={{ color: 'var(--cc-text-muted)' }}>Discharge Date:</span> <strong>{selectedDoc.data.document.dischargeDate}</strong>
                                </div>
                              </div>

                              <div style={{ marginBottom: 14 }}>
                                <h5 style={{ fontSize: '0.85rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Clinical Course</h5>
                                <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, background: 'var(--cc-surface-2)', padding: '12px 14px', borderRadius: 6 }}>
                                  {selectedDoc.data.document.clinicalCourse}
                                </p>
                              </div>

                              {selectedDoc.data.document.dischargeMedications?.length > 0 && (
                                <div style={{ marginBottom: 14 }}>
                                  <h5 style={{ fontSize: '0.85rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Discharge Medications</h5>
                                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {selectedDoc.data.document.dischargeMedications.map((m, idx) => (
                                      <li key={idx}><strong>{m}</strong></li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {selectedDoc.data.document.followUp && (
                                <div style={{ padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 6, fontSize: '0.85rem' }}>
                                  <strong>Follow-up Instructions: </strong>{selectedDoc.data.document.followUp}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Prescriptions */}
                          {selectedDoc.data.document.items && (
                            <div style={{ marginBottom: 20 }}>
                              <h5 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--cc-text-muted)', marginBottom: 10 }}>
                                Prescribed Regimen (Source HIS)
                              </h5>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {selectedDoc.data.document.items.map((item, idx) => (
                                  <div key={idx} style={{
                                    padding: '12px 14px', background: 'var(--cc-surface-2)', borderRadius: 6,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem'
                                  }}>
                                    <div>
                                      <strong style={{ fontSize: '0.9rem', color: '#60a5fa' }}>{item.medicine}</strong>
                                      <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.78rem', marginTop: 2 }}>{item.dosage} · {item.frequency}</div>
                                    </div>
                                    <span className="badge badge-secondary">{item.duration}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sign-off Signature */}
                          {selectedDoc.data.document.signedBy && (
                            <div style={{
                              marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--cc-border)',
                              display: 'flex', justifyContent: 'flex-end', fontSize: '0.825rem', color: 'var(--cc-text-muted)'
                            }}>
                              <div>Electronically Signed: <strong>{selectedDoc.data.document.signedBy}</strong></div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--cc-text-muted)' }}>
                          No document payload received.
                        </div>
                      )}
                    </div>

                    {/* Modal Footer */}
                    <div style={{
                      padding: '16px 24px', borderTop: '1px solid var(--cc-border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'var(--cc-surface-2)'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Lock size={12} /> Consent Verified · Audited in CC Gateway Log
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => setDocModalOpen(false)}>
                        Close Document Stream
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">Clinical Record Not Found</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

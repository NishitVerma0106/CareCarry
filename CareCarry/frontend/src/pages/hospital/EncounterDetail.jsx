import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { hospitalService } from '../../services';
import { format } from 'date-fns';
import {
  Upload, FileText, CheckCircle, ExternalLink, Hospital,
  Stethoscope, User, Calendar, Plus, X, Clock, Activity,
  CheckCircle2, Pill, FlaskConical, AlertTriangle, ArrowRight, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const DOC_TYPES = [
  { value: 'lab_report', label: 'Lab Report / Blood Test' },
  { value: 'xray', label: 'X-Ray' },
  { value: 'mri', label: 'MRI Scan' },
  { value: 'ct_scan', label: 'CT Scan' },
  { value: 'ultrasound', label: 'Ultrasound' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'other', label: 'Other Document' },
];

export default function EncounterDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Upload Modal State
  const [showUpload, setShowUpload] = useState(false);
  const [selectedLabOrderId, setSelectedLabOrderId] = useState(null);
  const [docType, setDocType] = useState('lab_report');
  const [docTitle, setDocTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Lab Order Modal State
  const [showLabOrderModal, setShowLabOrderModal] = useState(false);
  const [newLabTestName, setNewLabTestName] = useState('');
  const [newLabNotes, setNewLabNotes] = useState('');
  const [orderingLab, setOrderingLab] = useState(false);

  // Discharge Modal State
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeForm, setDischargeForm] = useState({
    diagnosis: '',
    treatment: '',
    followUpDate: '',
    notes: '',
  });
  const [submittingDischarge, setSubmittingDischarge] = useState(false);

  const fetchEncounter = async () => {
    try {
      const res = await hospitalService.getEncounter(id);
      setData(res.data.data);
    } catch {
      toast.error('Failed to load encounter details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEncounter();
  }, [id]);

  // Queue Status change
  const handleQueueStatusChange = async (newStatus) => {
    try {
      await hospitalService.updateEncounterStatus(id, newStatus);
      toast.success(`Encounter moved to ${newStatus.replace('_', ' ').toUpperCase()}`);
      fetchEncounter();
    } catch {
      toast.error('Failed to update status.');
    }
  };

  // Upload Document
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);
      formData.append('title', docTitle || file.name);
      formData.append('patient_id', data.encounter.patient_id);
      formData.append('encounter_id', id);
      if (selectedLabOrderId) {
        formData.append('labOrderId', selectedLabOrderId);
      }

      await hospitalService.uploadReport(formData, id);
      toast.success('Document uploaded to Cloudinary and attached to encounter!');
      setShowUpload(false);
      setSelectedLabOrderId(null);
      setFile(null);
      setDocTitle('');
      fetchEncounter();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  // Create Lab Order
  const handleCreateLabOrder = async (e) => {
    e.preventDefault();
    if (!newLabTestName.trim()) {
      toast.error('Test name is required.');
      return;
    }

    setOrderingLab(true);
    try {
      await hospitalService.createLabOrder(id, {
        tests: [newLabTestName.trim()],
        notes: newLabNotes,
      });
      toast.success('Lab test ordered successfully!');
      setShowLabOrderModal(false);
      setNewLabTestName('');
      setNewLabNotes('');
      fetchEncounter();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to order lab test.');
    } finally {
      setOrderingLab(false);
    }
  };

  // Update Lab Order status
  const handleUpdateLabStatus = async (orderId, currentStatus) => {
    const nextStatus = currentStatus === 'ORDERED' ? 'SAMPLE_COLLECTED' : 'COMPLETED';
    try {
      await hospitalService.updateLabOrderStatus(orderId, { status: nextStatus });
      toast.success(`Lab order status updated to ${nextStatus.replace('_', ' ')}`);
      fetchEncounter();
    } catch {
      toast.error('Failed to update lab order.');
    }
  };

  // Dispense Medicine Item
  const handleDispenseMedicine = async (itemId) => {
    try {
      await hospitalService.dispenseMedication(itemId, 'DISPENSED');
      toast.success('Medication item dispensed!');
      fetchEncounter();
    } catch {
      toast.error('Failed to dispense medication.');
    }
  };

  // Open Discharge Modal
  const openDischargeModal = () => {
    const existingDiag = data?.consultations?.[0]?.diagnosis || '';
    setDischargeForm({
      diagnosis: existingDiag,
      treatment: '',
      followUpDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      notes: 'Patient advised rest and medication compliance.',
    });
    setShowDischargeModal(true);
  };

  // Submit Discharge
  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    setSubmittingDischarge(true);
    try {
      await hospitalService.dischargeEncounter(id, dischargeForm);
      toast.success('Encounter discharged and closed successfully!');
      setShowDischargeModal(false);
      fetchEncounter();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discharge encounter.');
    } finally {
      setSubmittingDischarge(false);
    }
  };

  const enc = data?.encounter;
  const isCompleted = enc?.queue_status === 'completed' || enc?.status === 'completed';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={`Encounter #${id}`} />
        <div className="page-content">
          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : data ? (
            <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
              {/* Top Navigation & Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h2 className="page-title" style={{ margin: 0 }}>Encounter #{id}</h2>
                    <span style={{
                      fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '0.95rem',
                      padding: '4px 10px', borderRadius: 6,
                      background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                      border: '1px solid rgba(245,158,11,0.3)', letterSpacing: '1px'
                    }}>
                      {enc.token_number || `TK-${id}`}
                    </span>
                    <span className={`badge badge-${isCompleted ? 'success' : enc.queue_status === 'in_consultation' ? 'info' : 'warning'}`}>
                      {enc.queue_status || enc.status}
                    </span>
                  </div>
                  <p className="page-subtitle" style={{ marginTop: 4 }}>
                    Department: <strong style={{ color: '#818cf8' }}>{enc.department || 'General Medicine'}</strong> · {enc.visit_type} Visit · {format(new Date(enc.visit_date), 'dd MMMM yyyy HH:mm')}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {!isCompleted && (
                    <>
                      {enc.queue_status === 'waiting' && (
                        <button
                          className="btn btn-primary"
                          onClick={() => handleQueueStatusChange('in_consultation')}
                        >
                          <Stethoscope size={15} /> Start Consultation
                        </button>
                      )}

                      <button
                        className="btn btn-success"
                        onClick={openDischargeModal}
                      >
                        <Check size={15} /> Discharge & Close
                      </button>
                    </>
                  )}

                  <button
                    className="btn btn-secondary"
                    onClick={() => { setSelectedLabOrderId(null); setShowUpload(true); }}
                  >
                    <Upload size={15} /> Upload Document
                  </button>
                </div>
              </div>

              {/* Queue Lifecycle Tracker */}
              <div className="card" style={{ padding: '16px 20px', marginBottom: 24, background: 'var(--cc-surface-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                  {[
                    { step: '1', title: 'Check-in & Token', done: true, current: enc.queue_status === 'waiting' },
                    { step: '2', title: 'Physician Consultation', done: enc.queue_status === 'in_consultation' || isCompleted, current: enc.queue_status === 'in_consultation' },
                    { step: '3', title: 'Diagnostics & Pharmacy', done: (data.labOrders?.length > 0 || data.prescriptions?.length > 0) || isCompleted, current: false },
                    { step: '4', title: 'Discharge Summary', done: isCompleted, current: isCompleted },
                  ].map(({ step, title, done, current }, idx, arr) => (
                    <div key={step} style={{ display: 'flex', alignItems: 'center', flex: idx < arr.length - 1 ? 1 : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: done ? '#10b981' : 'var(--cc-surface)',
                          border: current ? '2px solid #38bdf8' : done ? 'none' : '1px solid var(--cc-border)',
                          color: done ? '#fff' : 'var(--cc-text-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '0.85rem'
                        }}>
                          {done ? '✓' : step}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: current ? 700 : done ? 600 : 500, color: current ? '#38bdf8' : done ? '#f3f4f6' : 'var(--cc-text-muted)' }}>
                          {title}
                        </span>
                      </div>
                      {idx < arr.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: done ? '#10b98150' : 'var(--cc-border)', margin: '0 12px' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient & Doctor Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <User size={18} color="#10b981" />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Patient Identity</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                    {enc.patient_first} {enc.patient_last}
                  </div>
                  <div style={{ fontFamily: 'Space Grotesk', color: '#10b981', fontWeight: 700, letterSpacing: '1px', fontSize: '0.9rem', marginTop: 2 }}>
                    {enc.carecarry_id}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)', marginTop: 8 }}>
                    Phone: {enc.patient_phone || '—'} · Blood: <strong style={{ color: '#f87171' }}>{enc.blood_group || '—'}</strong> · Gender: {enc.gender || '—'}
                  </div>
                  {enc.allergies && (
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#fca5a5' }}>
                      ⚠️ Allergies: {enc.allergies}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Stethoscope size={18} color="#3b82f6" />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Attending Physician & Dept</span>
                  </div>
                  {enc.doctor_first ? (
                    <>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                        Dr. {enc.doctor_first} {enc.doctor_last}
                      </div>
                      <div style={{ color: '#60a5fa', fontSize: '0.85rem', marginTop: 2 }}>
                        {enc.specialization} · {enc.department}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)', marginTop: 8 }}>
                        Hospital: {enc.hospital_name || 'ABC Hospital'}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.875rem' }}>
                      No specific doctor assigned. Triage pool in {enc.department}.
                    </div>
                  )}
                </div>
              </div>

              {/* DISCHARGE SUMMARY CARD (if discharged) */}
              {enc.discharge_summary && (
                <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={18} color="#10b981" />
                      <h3 className="card-title" style={{ margin: 0, color: '#10b981' }}>Official Hospital Discharge Summary</h3>
                    </div>
                    {enc.discharge_date && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                        Discharged: {format(new Date(enc.discharge_date), 'dd MMM yyyy HH:mm')}
                      </span>
                    )}
                  </div>
                  <div style={{ whiteSpace: 'pre-line', fontSize: '0.9rem', color: '#f3f4f6', lineHeight: 1.6 }}>
                    {enc.discharge_summary}
                  </div>
                </div>
              )}

              {/* SECTION: LABORATORY INVESTIGATIONS */}
              <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FlaskConical size={18} color="#c084fc" /> Laboratory Diagnostics ({data.labOrders?.length || 0})
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--cc-text-muted)' }}>
                      Lab orders, specimen collection status, and attached diagnostic test results
                    </p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowLabOrderModal(true)}>
                    <Plus size={14} /> Order Lab Test
                  </button>
                </div>

                {!data.labOrders || data.labOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--cc-text-muted)', fontSize: '0.85rem' }}>
                    No lab tests ordered for this encounter yet. Click "Order Lab Test" above.
                  </div>
                ) : (
                  <div className="table-container" style={{ border: 'none' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Test Investigation</th>
                          <th>Status</th>
                          <th>Notes</th>
                          <th>Result Document</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.labOrders.map((lo) => (
                          <tr key={lo.order_id}>
                            <td style={{ fontWeight: 700, color: '#f3f4f6' }}>{lo.test_name}</td>
                            <td>
                              <span className={`badge badge-${lo.status === 'COMPLETED' ? 'success' : lo.status === 'SAMPLE_COLLECTED' ? 'info' : 'warning'}`}>
                                {lo.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>{lo.notes || '—'}</td>
                            <td>
                              {lo.secure_file_url ? (
                                <a
                                  href={lo.secure_file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#38bdf8', fontSize: '0.8rem', textDecoration: 'none' }}
                                >
                                  <FileText size={13} /> {lo.report_title || 'View Report'} <ExternalLink size={11} />
                                </a>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>Awaiting Report</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {lo.status === 'ORDERED' && (
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleUpdateLabStatus(lo.order_id, 'ORDERED')}
                                  >
                                    Draw Sample
                                  </button>
                                )}
                                {!lo.secure_file_url && (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                      setSelectedLabOrderId(lo.order_id);
                                      setDocTitle(`${lo.test_name} Report`);
                                      setDocType('lab_report');
                                      setShowUpload(true);
                                    }}
                                  >
                                    Upload Result
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION: PRESCRIPTIONS & PHARMACY DISPENSE */}
              <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Pill size={18} color="#10b981" /> Prescriptions & Pharmacy Dispense ({data.prescriptions?.length || 0})
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--cc-text-muted)' }}>
                      Physician-prescribed medications with real-time pharmacy dispensing status
                    </p>
                  </div>
                </div>

                {!data.prescriptions || data.prescriptions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--cc-text-muted)', fontSize: '0.85rem' }}>
                    No prescriptions generated yet. Doctor will issue prescription during clinical consultation.
                  </div>
                ) : (
                  data.prescriptions.map((pr) => (
                    <div key={pr.prescription_id} style={{
                      padding: 14, borderRadius: 8, background: 'var(--cc-surface-2)',
                      marginBottom: 12, border: '1px solid var(--cc-border)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                        <div>
                          <strong>Prescription #{pr.prescription_id}</strong> by Dr. {pr.doctor_first} {pr.doctor_last}
                        </div>
                        <span style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem' }}>
                          {format(new Date(pr.created_at), 'dd MMM yyyy HH:mm')}
                        </span>
                      </div>

                      {pr.instructions && (
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: 10 }}>
                          Instructions: {pr.instructions}
                        </div>
                      )}

                      <div className="table-container" style={{ border: 'none', margin: 0, background: 'transparent' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Medicine</th>
                              <th>Dosage</th>
                              <th>Frequency</th>
                              <th>Duration</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(pr.items || []).map((item) => (
                              <tr key={item.item_id}>
                                <td style={{ fontWeight: 700, color: '#f3f4f6' }}>{item.medicine_name}</td>
                                <td>{item.dosage || '—'}</td>
                                <td>{item.frequency || '—'}</td>
                                <td>{item.duration || '—'}</td>
                                <td>
                                  <span className={`badge badge-${item.status === 'DISPENSED' ? 'success' : 'warning'}`}>
                                    {item.status || 'PENDING'}
                                  </span>
                                </td>
                                <td>
                                  {item.status !== 'DISPENSED' ? (
                                    <button
                                      className="btn btn-success btn-sm"
                                      onClick={() => handleDispenseMedicine(item.item_id)}
                                      style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                    >
                                      Dispense
                                    </button>
                                  ) : (
                                    <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
                                      ✓ Dispensed
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* SECTION: CLINICAL CONSULTATIONS */}
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Stethoscope size={18} color="#60a5fa" /> Clinical Notes & Diagnoses ({data.consultations?.length || 0})
                </h3>

                {!data.consultations || data.consultations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--cc-text-muted)', fontSize: '0.85rem' }}>
                    No clinical consultation notes recorded yet.
                  </div>
                ) : (
                  data.consultations.map((c) => (
                    <div key={c.consultation_id} style={{
                      padding: 16, borderRadius: 8, background: 'var(--cc-surface-2)',
                      marginBottom: 12, border: '1px solid var(--cc-border)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontWeight: 700 }}>Consultation #{c.consultation_id}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                          {format(new Date(c.created_at), 'dd MMM yyyy HH:mm')}
                        </span>
                      </div>

                      <div style={{ marginBottom: 8, fontSize: '0.875rem' }}>
                        <strong style={{ color: 'var(--cc-text-muted)' }}>Chief Symptoms: </strong>
                        <span>{c.symptoms}</span>
                      </div>

                      {c.clinical_notes && (
                        <div style={{ marginBottom: 8, fontSize: '0.875rem' }}>
                          <strong style={{ color: 'var(--cc-text-muted)' }}>Clinical Observations: </strong>
                          <span>{c.clinical_notes}</span>
                        </div>
                      )}

                      {c.diagnosis && (
                        <div style={{ padding: '8px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, fontSize: '0.875rem', marginTop: 10 }}>
                          <strong style={{ color: '#93c5fd' }}>Diagnosis: </strong>
                          <span>{c.diagnosis}</span>
                          {c.icd_code && <span style={{ marginLeft: 8, color: 'var(--cc-text-muted)' }}>[ICD: {c.icd_code}]</span>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* SECTION: MEDICAL DOCUMENTS */}
              <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={18} color="#f59e0b" /> Medical Documents Attached to Encounter ({data.reports?.length || 0})
                  </h3>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setSelectedLabOrderId(null); setShowUpload(true); }}
                  >
                    <Upload size={14} /> Upload New
                  </button>
                </div>

                {!data.reports || data.reports.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--cc-text-muted)', fontSize: '0.85rem' }}>
                    No reports attached yet. Click "Upload New" to attach lab tests or imaging scans.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                    {data.reports.map((rep) => (
                      <div key={rep.report_id} style={{
                        padding: 14, borderRadius: 8, background: 'var(--cc-surface-2)',
                        border: '1px solid var(--cc-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <span className="badge badge-secondary">{rep.document_type}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--cc-text-muted)' }}>
                              {format(new Date(rep.uploaded_at), 'dd MMM yyyy')}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f3f4f6', marginBottom: 4 }}>
                            {rep.title || rep.file_name}
                          </div>
                        </div>

                        <a
                          href={rep.secure_file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: 12, justifyContent: 'center' }}
                        >
                          <FileText size={13} /> View on Cloudinary <ExternalLink size={12} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* UPLOAD DOCUMENT MODAL */}
              {showUpload && (
                <div style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 9999, padding: 16, backdropFilter: 'blur(4px)'
                }}>
                  <div className="card animate-fade-in" style={{ maxWidth: 520, width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 className="card-title" style={{ margin: 0 }}>
                        {selectedLabOrderId ? 'Upload Lab Investigation Result' : `Upload Document to Encounter #${id}`}
                      </h3>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowUpload(false)}>
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleUploadSubmit}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="enc-doc-type">Document Classification</label>
                        <select
                          id="enc-doc-type"
                          className="form-input"
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                        >
                          {DOC_TYPES.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="enc-doc-title">Document Title / Clinical Test Name</label>
                        <input
                          id="enc-doc-title"
                          className="form-input"
                          placeholder="e.g. Chest X-Ray PA View, Lipid Profile"
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Select File (PDF, JPG, PNG)</label>
                        <input
                          id="enc-file-input"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="form-input"
                          onChange={(e) => setFile(e.target.files?.[0])}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>
                          Cancel
                        </button>
                        <button type="submit" id="submit-enc-upload" className="btn btn-primary" disabled={uploading}>
                          {uploading ? <div className="spinner" /> : <><Upload size={16} /> Upload to Cloudinary</>}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ORDER LAB TEST MODAL */}
              {showLabOrderModal && (
                <div style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 9999, padding: 16, backdropFilter: 'blur(4px)'
                }}>
                  <div className="card animate-fade-in" style={{ maxWidth: 480, width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 className="card-title" style={{ margin: 0 }}>Order Laboratory Test</h3>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowLabOrderModal(false)}>
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleCreateLabOrder}>
                      <div className="form-group">
                        <label className="form-label">Test Investigation Name</label>
                        <input
                          className="form-input"
                          placeholder="e.g. Complete Blood Count (CBC), Lipid Profile, ECG"
                          value={newLabTestName}
                          onChange={(e) => setNewLabTestName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Clinical Indications / Notes</label>
                        <textarea
                          className="form-input"
                          rows={2}
                          placeholder="e.g. Fasting sample required, urgent pre-op"
                          value={newLabNotes}
                          onChange={(e) => setNewLabNotes(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowLabOrderModal(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={orderingLab}>
                          {orderingLab ? <div className="spinner" /> : <><FlaskConical size={15} /> Send Order to Lab</>}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* DISCHARGE SUMMARY MODAL */}
              {showDischargeModal && (
                <div style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 9999, padding: 16, backdropFilter: 'blur(4px)'
                }}>
                  <div className="card animate-fade-in" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <h3 className="card-title" style={{ margin: 0 }}>Encounter Discharge Summary</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                          Finalize diagnosis, advice, and discharge patient from hospital workflow
                        </p>
                      </div>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowDischargeModal(false)}>
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleDischargeSubmit}>
                      <div className="form-group">
                        <label className="form-label">Primary Diagnosis</label>
                        <input
                          className="form-input"
                          placeholder="e.g. Acute Pharyngitis, Resolving"
                          value={dischargeForm.diagnosis}
                          onChange={(e) => setDischargeForm({ ...dischargeForm, diagnosis: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Treatment Provided</label>
                        <textarea
                          className="form-input"
                          rows={2}
                          placeholder="e.g. Oral antibiotic therapy, hydration, symptomatic antipyretic"
                          value={dischargeForm.treatment}
                          onChange={(e) => setDischargeForm({ ...dischargeForm, treatment: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Follow-up Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={dischargeForm.followUpDate}
                          onChange={(e) => setDischargeForm({ ...dischargeForm, followUpDate: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Discharge Advice</label>
                        <textarea
                          className="form-input"
                          rows={3}
                          value={dischargeForm.notes}
                          onChange={(e) => setDischargeForm({ ...dischargeForm, notes: e.target.value })}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowDischargeModal(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-success" disabled={submittingDischarge}>
                          {submittingDischarge ? <div className="spinner" /> : <><Check size={16} /> Finalize Discharge</>}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

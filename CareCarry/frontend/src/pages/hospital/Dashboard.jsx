import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { hospitalService, interoperabilityService } from '../../services';
import {
  QrCode, Users, Hospital, FileText, RefreshCw, Stethoscope,
  Activity, Clock, CheckCircle2, AlertCircle, PlusCircle,
  Search, Filter, ChevronRight, Pill, FlaskConical, ArrowRight,
  UserCheck, ShieldCheck, Calendar, Phone, Check, ExternalLink, X,
  Globe, Building2, Network, Layers, Lock, Share2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function HospitalDashboard() {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'all' | 'departments' | 'lab' | 'pharmacy' | 'interoperability'
  const [encounters, setEncounters] = useState([]);
  const [stats, setStats] = useState({
    todayPatients: 0,
    waitingCount: 0,
    inConsultationCount: 0,
    completedCount: 0,
    activeDoctors: 0,
    totalReports: 0,
    pendingLabOrders: 0,
  });
  const [departments, setDepartments] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [pharmacyRx, setPharmacyRx] = useState([]);
  const [interopProviders, setInteropProviders] = useState([]);
  const [interopStats, setInteropStats] = useState(null);
  const [testCcId, setTestCcId] = useState('CC-7K3QX9AB');
  const [testDiscoveryResult, setTestDiscoveryResult] = useState(null);
  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Quick Discharge Modal
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [selectedEncounterForDischarge, setSelectedEncounterForDischarge] = useState(null);
  const [dischargeForm, setDischargeForm] = useState({
    diagnosis: '',
    treatment: '',
    followUpDate: '',
    notes: '',
  });
  const [submittingDischarge, setSubmittingDischarge] = useState(false);

  const navigate = useNavigate();

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [encRes, statsRes, deptRes, labRes, rxRes, interopRes, interopStatsRes] = await Promise.all([
        hospitalService.getEncounters(),
        hospitalService.getStats().catch(() => ({ data: { data: {} } })),
        hospitalService.getDepartments().catch(() => ({ data: { data: [] } })),
        hospitalService.getLabOrders().catch(() => ({ data: { data: [] } })),
        hospitalService.getPharmacyPrescriptions().catch(() => ({ data: { data: [] } })),
        interoperabilityService.getProviders().catch(() => ({ data: { data: [] } })),
        interoperabilityService.getStats().catch(() => ({ data: { data: {} } })),
      ]);

      const encList = encRes.data.data || [];
      setEncounters(encList);

      const serverStats = statsRes.data.data || {};
      setStats({
        todayPatients: serverStats.todayPatients ?? encList.length,
        waitingCount: serverStats.waitingCount ?? encList.filter(e => e.queue_status === 'waiting').length,
        inConsultationCount: serverStats.inConsultationCount ?? encList.filter(e => e.queue_status === 'in_consultation').length,
        completedCount: serverStats.completedCount ?? encList.filter(e => e.queue_status === 'completed' || e.status === 'completed').length,
        activeDoctors: serverStats.activeDoctors ?? 3,
        totalReports: serverStats.totalReports ?? encList.reduce((acc, e) => acc + (e.document_count || 0), 0),
        pendingLabOrders: serverStats.pendingLabOrders ?? 0,
      });

      setDepartments(deptRes.data.data || []);
      setLabOrders(labRes.data.data || []);
      setPharmacyRx(rxRes.data.data || []);
      setInteropProviders(interopRes.data.data || []);
      setInteropStats(interopStatsRes.data.data || {});
    } catch (err) {
      toast.error('Failed to refresh hospital data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunTestDiscovery = async (e) => {
    if (e) e.preventDefault();
    if (!testCcId.trim()) return;
    setRunningDiscovery(true);
    try {
      const res = await interoperabilityService.discoverRecords(testCcId.trim());
      setTestDiscoveryResult(res.data.data);
      toast.success(`Discovered ${res.data.data?.totalRecords || 0} federated records across provider network!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Patient not found or no federated records.');
      setTestDiscoveryResult(null);
    } finally {
      setRunningDiscovery(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Update Encounter Status
  const handleUpdateStatus = async (encId, newStatus) => {
    try {
      await hospitalService.updateEncounterStatus(encId, newStatus);
      toast.success(`Encounter #${encId} moved to ${newStatus.replace('_', ' ').toUpperCase()}`);
      loadDashboardData();
    } catch {
      toast.error('Failed to update encounter status.');
    }
  };

  // Open Discharge Modal
  const openDischargeModal = (encounter) => {
    setSelectedEncounterForDischarge(encounter);
    setDischargeForm({
      diagnosis: encounter.diagnosis || '',
      treatment: '',
      followUpDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      notes: 'Patient advised rest, abundant hydration, and to take medications as directed.',
    });
    setDischargeModalOpen(true);
  };

  // Submit Discharge
  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEncounterForDischarge) return;
    setSubmittingDischarge(true);
    try {
      await hospitalService.dischargeEncounter(selectedEncounterForDischarge.encounter_id, dischargeForm);
      toast.success(`Encounter #${selectedEncounterForDischarge.encounter_id} discharged successfully!`);
      setDischargeModalOpen(false);
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discharge encounter.');
    } finally {
      setSubmittingDischarge(false);
    }
  };

  // Sample collection toggle for lab
  const handleLabStatusUpdate = async (orderId, currentStatus) => {
    const nextStatus = currentStatus === 'ORDERED' ? 'SAMPLE_COLLECTED' : 'COMPLETED';
    try {
      await hospitalService.updateLabOrderStatus(orderId, { status: nextStatus });
      toast.success(`Lab Order #${orderId} marked as ${nextStatus.replace('_', ' ')}`);
      loadDashboardData();
    } catch {
      toast.error('Failed to update lab order.');
    }
  };

  // Dispense medicine item
  const handleDispenseItem = async (itemId) => {
    try {
      await hospitalService.dispenseMedication(itemId, 'DISPENSED');
      toast.success('Medication successfully dispensed!');
      loadDashboardData();
    } catch {
      toast.error('Failed to mark medication as dispensed.');
    }
  };

  // Filtering Encounters
  const filteredEncounters = encounters.filter((e) => {
    const matchesSearch =
      !searchTerm ||
      (e.carecarry_id && e.carecarry_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.first_name && e.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.last_name && e.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.token_number && e.token_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      String(e.encounter_id).includes(searchTerm);

    const matchesDept = selectedDept === 'ALL' || e.department === selectedDept;
    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'waiting' && e.queue_status === 'waiting') ||
      (selectedStatus === 'in_consultation' && e.queue_status === 'in_consultation') ||
      (selectedStatus === 'completed' && (e.queue_status === 'completed' || e.status === 'completed'));

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Active Queue (Waiting & In Consultation)
  const activeQueueList = encounters.filter(
    (e) => e.queue_status === 'waiting' || e.queue_status === 'in_consultation'
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Hospital Clinical Command Center" />
        <div className="page-content">
          {/* Header */}
          <div className="page-header" style={{ marginBottom: 24 }}>
            <div className="page-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h1 className="page-title" style={{ margin: 0 }}>Clinical Command Center</h1>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 'var(--cc-radius-full)',
                    background: 'rgba(16,185,129,0.15)', color: '#10b981',
                    fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase'
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.8s infinite' }} />
                    Live Triage Active
                  </span>
                </div>
                <p className="page-subtitle" style={{ marginTop: 4 }}>
                  Real-time patient check-in, token queuing, clinical routing & cross-department coordination
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Link to="/hospital/scanner" className="btn btn-primary" id="btn-quick-scan">
                  <QrCode size={16} /> Scan CareCarry QR
                </Link>
                <Link to="/hospital/lookup" className="btn btn-secondary" id="btn-quick-lookup">
                  <Users size={16} /> New Check-In
                </Link>
                <button className="btn btn-secondary" onClick={loadDashboardData} title="Refresh Live Data" id="refresh-dashboard">
                  <RefreshCw size={15} className={loading ? 'spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <Users size={22} color="#f59e0b" />
              </div>
              <div className="stat-info">
                <div className="label">Today's Check-ins</div>
                <div className="value">{stats.todayPatients}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <Clock size={22} color="#ef4444" />
              </div>
              <div className="stat-info">
                <div className="label">Waiting in Queue</div>
                <div className="value" style={{ color: '#ef4444' }}>{stats.waitingCount}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <Activity size={22} color="#3b82f6" />
              </div>
              <div className="stat-info">
                <div className="label">In Consultation</div>
                <div className="value" style={{ color: '#60a5fa' }}>{stats.inConsultationCount}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <CheckCircle2 size={22} color="#10b981" />
              </div>
              <div className="stat-info">
                <div className="label">Completed Today</div>
                <div className="value" style={{ color: '#10b981' }}>{stats.completedCount}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <Stethoscope size={22} color="#818cf8" />
              </div>
              <div className="stat-info">
                <div className="label">Doctors on Duty</div>
                <div className="value">{stats.activeDoctors}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.15)' }}>
                <FlaskConical size={22} color="#c084fc" />
              </div>
              <div className="stat-info">
                <div className="label">Lab Orders</div>
                <div className="value">{labOrders.length}</div>
              </div>
            </div>
          </div>

          {/* Quick Intake Banners */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
            <Link to="/hospital/scanner" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(245,158,11,0.03))',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 'var(--cc-radius-lg)',
                padding: '20px',
                display: 'flex', alignItems: 'center', gap: 16,
                transition: 'transform 0.2s, border-color 0.2s',
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 12,
                  background: 'rgba(245,158,11,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <QrCode size={26} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f3f4f6' }}>Scan CareCarry QR</div>
                  <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                    Instant identity resolve & encounter token assignment
                  </div>
                </div>
              </div>
            </Link>

            <Link to="/hospital/lookup" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(99,102,241,0.03))',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 'var(--cc-radius-lg)',
                padding: '20px',
                display: 'flex', alignItems: 'center', gap: 16,
                transition: 'transform 0.2s, border-color 0.2s',
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 12,
                  background: 'rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <UserCheck size={26} color="#818cf8" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f3f4f6' }}>CareCarry ID Reception</div>
                  <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                    Verify ID, select Department & assign physician
                  </div>
                </div>
              </div>
            </Link>

            <Link to="/hospital/upload" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.03))',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 'var(--cc-radius-lg)',
                padding: '20px',
                display: 'flex', alignItems: 'center', gap: 16,
                transition: 'transform 0.2s, border-color 0.2s',
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 12,
                  background: 'rgba(16,185,129,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={26} color="#10b981" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f3f4f6' }}>Upload Medical Reports</div>
                  <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                    Attach lab results, imaging & scans to encounter
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Module Navigation Tabs */}
          <div style={{
            display: 'flex', gap: 8, borderBottom: '1px solid var(--cc-border)',
            marginBottom: 20, overflowX: 'auto', paddingBottom: 4
          }}>
            {[
              { id: 'queue', label: 'Live Triage Queue', icon: Clock, count: activeQueueList.length },
              { id: 'all', label: 'All Hospital Encounters', icon: Hospital, count: encounters.length },
              { id: 'departments', label: 'Clinical Departments', icon: Activity, count: departments.length },
              { id: 'lab', label: 'Laboratory Orders Desk', icon: FlaskConical, count: labOrders.length },
              { id: 'pharmacy', label: 'Pharmacy Dispense Queue', icon: Pill, count: pharmacyRx.length },
              { id: 'interoperability', label: 'Interoperability Gateway', icon: Globe, count: interopProviders.length },
            ].map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                id={`tab-${id}`}
                onClick={() => setActiveTab(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: '8px 8px 0 0',
                  background: activeTab === id ? 'var(--cc-surface-2)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === id ? '2px solid #f59e0b' : '2px solid transparent',
                  color: activeTab === id ? '#f9fafb' : 'var(--cc-text-muted)',
                  fontWeight: activeTab === id ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} color={activeTab === id ? '#f59e0b' : 'currentColor'} />
                {label}
                {count !== undefined && (
                  <span style={{
                    fontSize: '0.72rem', padding: '1px 7px', borderRadius: 10,
                    background: activeTab === id ? '#f59e0b25' : 'rgba(255,255,255,0.08)',
                    color: activeTab === id ? '#f59e0b' : 'inherit',
                    fontWeight: 700,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* TAB 1: LIVE TRIAGE QUEUE */}
          {activeTab === 'queue' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 className="card-title" style={{ margin: 0 }}>Active Waiting & Consultation Queue</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                    Patients currently checked in at the hospital awaiting or undergoing doctor consultation
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span className="badge badge-warning">{activeQueueList.filter(e => e.queue_status === 'waiting').length} Waiting</span>
                  <span className="badge badge-info">{activeQueueList.filter(e => e.queue_status === 'in_consultation').length} In Consultation</span>
                </div>
              </div>

              {loading ? (
                <div className="page-loader"><div className="spinner" /></div>
              ) : activeQueueList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--cc-text-muted)' }}>
                  <CheckCircle2 size={42} color="#10b981" style={{ marginBottom: 12 }} />
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f3f4f6' }}>Queue is Clear!</div>
                  <p style={{ fontSize: '0.875rem', marginTop: 4 }}>No patients currently waiting. New check-ins will appear here immediately.</p>
                  <Link to="/hospital/lookup" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                    <PlusCircle size={14} /> Check In Patient
                  </Link>
                </div>
              ) : (
                <div className="table-container" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Queue Token</th>
                        <th>Patient Identity</th>
                        <th>Department</th>
                        <th>Attending Doctor</th>
                        <th>Visit Type</th>
                        <th>Queue Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeQueueList.map((e) => (
                        <tr key={e.encounter_id}>
                          <td>
                            <span style={{
                              fontFamily: 'Space Grotesk, sans-serif',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: 'rgba(245,158,11,0.15)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245,158,11,0.3)',
                              letterSpacing: '1px',
                            }}>
                              {e.token_number || `TK-${String(e.encounter_id).padStart(3, '0')}`}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{e.first_name} {e.last_name}</div>
                            <div style={{ fontFamily: 'Space Grotesk', fontSize: '0.78rem', color: '#10b981', letterSpacing: '1px' }}>
                              {e.carecarry_id}
                            </div>
                          </td>
                          <td>
                            <span style={{
                              padding: '3px 8px', borderRadius: 4,
                              background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                              fontSize: '0.8rem', fontWeight: 600,
                            }}>
                              {e.department || 'General Medicine'}
                            </span>
                          </td>
                          <td>
                            {e.doctor_first ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>Dr. {e.doctor_first} {e.doctor_last}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)' }}>{e.specialization}</div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem' }}>Unassigned</span>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-secondary">{e.visit_type}</span>
                          </td>
                          <td>
                            {e.queue_status === 'waiting' ? (
                              <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={11} /> Waiting
                              </span>
                            ) : (
                              <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Activity size={11} /> In Consultation
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {e.queue_status === 'waiting' && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleUpdateStatus(e.encounter_id, 'in_consultation')}
                                  title="Call patient into doctor room"
                                >
                                  <Stethoscope size={13} /> Call In
                                </button>
                              )}

                              {e.queue_status === 'in_consultation' && (
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => openDischargeModal(e)}
                                  title="Complete & Discharge"
                                >
                                  <Check size={13} /> Discharge
                                </button>
                              )}

                              <Link
                                to={`/hospital/encounters/${e.encounter_id}`}
                                className="btn btn-ghost btn-sm"
                                title="Encounter Details"
                              >
                                View
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL ENCOUNTERS */}
          {activeTab === 'all' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 className="card-title" style={{ margin: 0 }}>All Hospital Encounters</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                    Historical and active patient encounter visits with attached clinical records
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--cc-text-muted)' }} />
                    <input
                      className="form-input"
                      style={{ paddingLeft: 30, fontSize: '0.85rem', width: 200, height: 36 }}
                      placeholder="Search patient / token..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <select
                    className="form-input"
                    style={{ fontSize: '0.85rem', height: 36, width: 160 }}
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>

                  <select
                    className="form-input"
                    style={{ fontSize: '0.85rem', height: 36, width: 140 }}
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="ALL">All Status</option>
                    <option value="waiting">Waiting</option>
                    <option value="in_consultation">In Consultation</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {filteredEncounters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--cc-text-muted)' }}>
                  No encounters found matching your filters.
                </div>
              ) : (
                <div className="table-container" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Encounter #</th>
                        <th>Token</th>
                        <th>Patient</th>
                        <th>CareCarry ID</th>
                        <th>Department</th>
                        <th>Doctor</th>
                        <th>Docs</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEncounters.map((e) => (
                        <tr key={e.encounter_id}>
                          <td style={{ fontWeight: 700, fontFamily: 'Space Grotesk' }}>#{e.encounter_id}</td>
                          <td>
                            <span style={{
                              fontWeight: 700, fontSize: '0.85rem', color: '#f59e0b',
                              fontFamily: 'Space Grotesk'
                            }}>
                              {e.token_number || `TK-${e.encounter_id}`}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{e.first_name} {e.last_name}</td>
                          <td>
                            <span style={{ fontFamily: 'Space Grotesk', color: '#10b981', fontSize: '0.82rem', fontWeight: 700 }}>
                              {e.carecarry_id}
                            </span>
                          </td>
                          <td>{e.department || 'General Medicine'}</td>
                          <td>
                            {e.doctor_first ? `Dr. ${e.doctor_first} ${e.doctor_last}` : '—'}
                          </td>
                          <td>
                            <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <FileText size={11} /> {e.document_count || 0}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${
                              e.queue_status === 'completed' || e.status === 'completed'
                                ? 'success'
                                : e.queue_status === 'in_consultation'
                                ? 'info'
                                : 'warning'
                            }`}>
                              {e.queue_status || e.status}
                            </span>
                          </td>
                          <td>
                            <Link to={`/hospital/encounters/${e.encounter_id}`} className="btn btn-secondary btn-sm">
                              Open Record <ChevronRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLINICAL DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {departments.map((dept) => (
                  <div key={dept.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: '#f9fafb' }}>{dept.name}</h4>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                          fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Space Grotesk'
                        }}>
                          {dept.id}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)', lineHeight: 1.4, margin: '0 0 14px' }}>
                        {dept.description}
                      </p>
                    </div>

                    <div>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                        padding: '10px', background: 'var(--cc-surface-2)', borderRadius: 8, marginBottom: 14
                      }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                            Waiting Queue
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: dept.waitingPatients > 0 ? '#ef4444' : '#10b981' }}>
                            {dept.waitingPatients} patients
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                            Doctors
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#818cf8' }}>
                            {dept.doctorsCount} active
                          </div>
                        </div>
                      </div>

                      <button
                        className="btn btn-secondary btn-full btn-sm"
                        onClick={() => {
                          navigate(`/hospital/lookup?department=${encodeURIComponent(dept.name)}`);
                        }}
                      >
                        <PlusCircle size={14} /> Intake to {dept.name}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LABORATORY DESK */}
          {activeTab === 'lab' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 className="card-title" style={{ margin: 0 }}>Laboratory Investigation Desk</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                    Active laboratory test orders, sample collection tracking, and diagnostic report verification
                  </p>
                </div>
                <span className="badge badge-secondary">{labOrders.length} Total Orders</span>
              </div>

              {labOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--cc-text-muted)' }}>
                  <FlaskConical size={40} color="#a855f7" style={{ marginBottom: 12 }} />
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f3f4f6' }}>No Lab Orders Pending</div>
                  <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Doctors can order investigations from the clinical view, or you can attach lab orders directly inside an encounter.</p>
                </div>
              ) : (
                <div className="table-container" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Token & Encounter</th>
                        <th>Patient</th>
                        <th>Test Investigation</th>
                        <th>Status</th>
                        <th>Attached Result</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labOrders.map((order) => (
                        <tr key={order.order_id}>
                          <td style={{ fontWeight: 700, fontFamily: 'Space Grotesk' }}>#{order.order_id}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.85rem' }}>{order.token_number}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)' }}>Enc #{order.encounter_id}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{order.patient_first} {order.patient_last}</div>
                            <div style={{ fontSize: '0.75rem', color: '#10b981', fontFamily: 'Space Grotesk' }}>{order.carecarry_id}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: '#f3f4f6' }}>
                            {order.test_name}
                            {order.notes && <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)', fontWeight: 400 }}>{order.notes}</div>}
                          </td>
                          <td>
                            <span className={`badge badge-${
                              order.status === 'COMPLETED' ? 'success' : order.status === 'SAMPLE_COLLECTED' ? 'info' : 'warning'
                            }`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            {order.secure_file_url ? (
                              <a
                                href={order.secure_file_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#38bdf8', fontSize: '0.8rem', textDecoration: 'none' }}
                              >
                                <FileText size={13} /> {order.report_title || 'View Report'} <ExternalLink size={11} />
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>Pending result</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {order.status === 'ORDERED' && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleLabStatusUpdate(order.order_id, 'ORDERED')}
                                >
                                  Collect Sample
                                </button>
                              )}
                              <Link
                                to={`/hospital/encounters/${order.encounter_id}`}
                                className="btn btn-ghost btn-sm"
                              >
                                View Encounter
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PHARMACY DISPENSE DESK */}
          {activeTab === 'pharmacy' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 className="card-title" style={{ margin: 0 }}>Hospital Pharmacy Dispense Desk</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                    Prescriptions issued by attending physicians ready for medication issue & verification
                  </p>
                </div>
                <span className="badge badge-secondary">{pharmacyRx.length} Prescriptions</span>
              </div>

              {pharmacyRx.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--cc-text-muted)' }}>
                  <Pill size={40} color="#10b981" style={{ marginBottom: 12 }} />
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f3f4f6' }}>Pharmacy Queue Clean</div>
                  <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Doctor-prescribed medicines will queue up here in real time.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {pharmacyRx.map((rx) => (
                    <div key={rx.prescription_id} style={{
                      padding: 16, borderRadius: 'var(--cc-radius)',
                      background: 'var(--cc-surface-2)', border: '1px solid var(--cc-border)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f9fafb' }}>
                              Prescription #{rx.prescription_id}
                            </span>
                            <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.85rem' }}>
                              Token: {rx.token_number}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)', marginTop: 2 }}>
                            Patient: <strong style={{ color: '#f3f4f6' }}>{rx.patient_first} {rx.patient_last}</strong> ({rx.carecarry_id}) ·
                            Physician: Dr. {rx.doctor_first} {rx.doctor_last}
                          </div>
                        </div>

                        <Link to={`/hospital/encounters/${rx.encounter_id}`} className="btn btn-ghost btn-sm">
                          Encounter #{rx.encounter_id} <ChevronRight size={13} />
                        </Link>
                      </div>

                      {rx.instructions && (
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: 10 }}>
                          Instructions: {rx.instructions}
                        </div>
                      )}

                      <div className="table-container" style={{ margin: 0, border: 'none', background: 'transparent' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Medicine</th>
                              <th>Dosage</th>
                              <th>Frequency</th>
                              <th>Duration</th>
                              <th>Dispense Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(rx.items || []).map((item) => (
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
                                      onClick={() => handleDispenseItem(item.item_id)}
                                      style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                                    >
                                      <Check size={12} /> Dispense
                                    </button>
                                  ) : (
                                    <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
                                      ✓ Issued
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: INTEROPERABILITY GATEWAY HUB */}
          {activeTab === 'interoperability' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Interoperability Gateway Architecture Banner */}
              <div className="card" style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.95))',
                border: '1px solid rgba(59, 130, 246, 0.35)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                        CareCarry Health Data Interoperability Gateway
                      </h3>
                      <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                        4 Nodes Connected
                      </span>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--cc-text-muted)', maxWidth: 740 }}>
                      CareCarry is designed as a <strong>consent-driven health data access and interoperability layer</strong>, not a duplicate EMR database. Participating hospitals and national networks maintain clinical ownership of medical records; CareCarry performs patient identity matching, consent verification, and federated record discovery on-demand.
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)' }}>Interoperability Protocol</div>
                    <div style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 700, fontSize: '0.95rem' }}>
                      FHIR R4 / ABDM v0.5
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--cc-border)'
                }}>
                  <div style={{ padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)' }}>Connected Providers</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6', marginTop: 2 }}>
                      {interopStats?.totalProviders || interopProviders.length || 4} Provider Systems
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)' }}>Active Identity Mappings</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                      {interopStats?.totalMappings || 12} Verified Records
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)' }}>Federated Record References</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#818cf8', marginTop: 2 }}>
                      {interopStats?.totalFederatedRecords || 5} Discoverable
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px', background: 'var(--cc-surface-2)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)' }}>Central Storage Mode</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>
                      Zero Document Duplication
                    </div>
                  </div>
                </div>
              </div>

              {/* Connected Hospital Adapter Nodes */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Network size={18} color="#3b82f6" /> Participating Hospital & Health Network Adapters
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
                  {interopProviders.map((prov) => (
                    <div
                      key={prov.provider_id}
                      style={{
                        background: 'var(--cc-surface-2)', border: '1px solid var(--cc-border)',
                        borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column',
                        justifyContent: 'space-between', gap: 12
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                            {prov.provider_code}
                          </span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: '0.72rem', fontWeight: 600,
                            color: prov.status === 'ACTIVE' ? '#10b981' : '#f59e0b'
                          }}>
                            <span style={{
                              width: 7, height: 7, borderRadius: '50%',
                              background: prov.status === 'ACTIVE' ? '#10b981' : '#f59e0b'
                            }} />
                            {prov.status === 'ACTIVE' ? 'Adapter Online' : 'Sandbox Ready'}
                          </span>
                        </div>

                        <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700 }}>
                          {prov.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                          {prov.description}
                        </p>
                      </div>

                      <div style={{
                        background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: 6,
                        fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', color: 'var(--cc-text-muted)'
                      }}>
                        <span>Adapter: <code>{prov.adapter_type}</code></span>
                        <span>Endpoint: <code>{prov.api_endpoint}</code></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Cross-Hospital Record Discovery Test Console */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Globe size={18} color="#10b981" /> Federated Record Discovery Console (Zero Duplication Test)
                  </h3>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--cc-text-muted)', marginTop: 0, marginBottom: 16 }}>
                  Test how CareCarry dynamically discovers external hospital records without storing copies in MySQL. Input a patient's CareCarry ID to query the connected hospital network adapters in real time.
                </p>

                <form onSubmit={handleRunTestDiscovery} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, minWidth: 260, fontFamily: 'monospace' }}
                    placeholder="Enter CareCarry ID (e.g. CC-7K3QX9AB)"
                    value={testCcId}
                    onChange={(e) => setTestCcId(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setTestCcId('CC-7K3QX9AB')}
                  >
                    Use Demo Patient (CC-7K3QX9AB)
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={runningDiscovery}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    {runningDiscovery ? <div className="spinner" /> : <><Search size={16} /> Query Network Adapters</>}
                  </button>
                </form>

                {/* Discovery Output */}
                {testDiscoveryResult && (
                  <div style={{
                    background: 'var(--cc-surface-2)', border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 8, padding: 18
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                      <div>
                        <span className="badge badge-success" style={{ marginRight: 8 }}>
                          Discovery Successful
                        </span>
                        <strong style={{ fontSize: '0.95rem' }}>
                          Found {testDiscoveryResult.totalRecords} records across {testDiscoveryResult.records?.length > 0 ? 'external hospital systems' : 'network'}
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--cc-text-muted)' }}>
                        Source Data Mode: <strong>Federated / Zero Storage Duplication</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {testDiscoveryResult.records?.map((r, idx) => (
                        <div key={idx} style={{
                          background: 'var(--cc-surface)', padding: 12, borderRadius: 6,
                          border: '1px solid var(--cc-border)', display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', flexWrap: 'wrap', gap: 10
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{r.provider_name}</span>
                              <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>{r.record_type}</span>
                              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--cc-text-muted)' }}>
                                Source ID: {r.source_record_id}
                              </span>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: 4 }}>
                              {r.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)', marginTop: 2 }}>
                              Encounter: {r.encounter_date ? format(new Date(r.encounter_date), 'dd MMM yyyy') : '—'} · Access: {r.access_method}
                            </div>
                          </div>

                          <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                            ✓ Streamable On-Demand
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DISCHARGE SUMMARY MODAL */}
          {dischargeModalOpen && selectedEncounterForDischarge && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
            }}>
              <div className="card" style={{ width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 800 }}>Encounter Discharge Summary</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--cc-text-muted)' }}>
                      Encounter #{selectedEncounterForDischarge.encounter_id} · Patient: {selectedEncounterForDischarge.first_name} {selectedEncounterForDischarge.last_name}
                    </p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDischargeModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleDischargeSubmit}>
                  <div className="form-group">
                    <label className="form-label">Primary Diagnosis</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Acute Bronchitis, Resolving"
                      value={dischargeForm.diagnosis}
                      onChange={(e) => setDischargeForm({ ...dischargeForm, diagnosis: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Treatment Administered / Care Provided</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="e.g. Nebulization given, Antibiotic therapy initiated"
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
                    <label className="form-label">Discharge Advice & Special Instructions</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={dischargeForm.notes}
                      onChange={(e) => setDischargeForm({ ...dischargeForm, notes: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setDischargeModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={submittingDischarge}
                    >
                      {submittingDischarge ? <div className="spinner" /> : <><Check size={16} /> Finalize Discharge & Close Encounter</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

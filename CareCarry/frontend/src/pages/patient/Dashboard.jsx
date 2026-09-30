import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { patientService } from '../../services';
import { QrCode, Clock, FileText, Pill, Shield, ChevronRight, AlertTriangle, Upload, Stethoscope, Hospital } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

export default function PatientDashboard() {
  const [profile, setProfile] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, timelineRes, qrRes] = await Promise.all([
          patientService.getProfile(),
          patientService.getTimeline(),
          patientService.getCareCarryId().catch(() => ({ data: { data: null } })),
        ]);
        setProfile(profileRes.data.data);
        setTimeline(timelineRes.data.data || []);
        setQrData(qrRes.data?.data || null);
      } catch {
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const latestVisit = timeline[0];

  const quickLinks = [
    { to: '/patient/carecarry-id', icon: QrCode, label: 'CareCard & QR', color: '#6366f1', desc: 'Present at hospital reception' },
    { to: '/patient/timeline', icon: Clock, label: 'Medical Timeline', color: '#10b981', desc: 'Longitudinal health history' },
    { to: '/patient/reports', icon: FileText, label: 'Upload & Reports', color: '#f59e0b', desc: 'Upload lab tests & scans' },
    { to: '/patient/prescriptions', icon: Pill, label: 'Prescriptions', color: '#3b82f6', desc: 'Medicines & doctor instructions' },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Patient Dashboard" />
        <div className="page-content">
          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <div className="animate-fade-in">
              {/* Welcome Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(79,70,229,0.18), rgba(6,182,212,0.12))',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 'var(--cc-radius-xl)',
                padding: '28px 32px',
                marginBottom: 24,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent)', borderRadius: '50%' }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 6 }}>
                  Welcome back
                </div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>
                  {profile?.first_name} {profile?.last_name}
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{
                    background: 'rgba(99,102,241,0.2)',
                    border: '1px solid rgba(99,102,241,0.4)',
                    borderRadius: 'var(--cc-radius)',
                    padding: '8px 18px',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    letterSpacing: '2px',
                    color: '#a5b4fc',
                  }}>
                    {profile?.carecarry_id}
                  </div>

                  <Link to="/patient/carecarry-id" className="btn btn-primary btn-sm">
                    <QrCode size={15} /> Show CareCard QR
                  </Link>

                  <Link to="/patient/reports" className="btn btn-secondary btn-sm" id="btn-upload-report">
                    <Upload size={15} /> Upload Medical Report
                  </Link>
                </div>
              </div>

              {/* Allergies Alert */}
              {profile?.allergies && (
                <div className="alert alert-warning" style={{ marginBottom: 24 }}>
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Known Allergies: </strong> {profile.allergies}
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="stat-grid" style={{ marginBottom: 28 }}>
                {quickLinks.map(({ to, icon: Icon, label, color, desc }) => (
                  <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                    <div className="stat-card" style={{ cursor: 'pointer' }}>
                      <div className="stat-icon" style={{ background: `${color}20` }}>
                        <Icon size={22} color={color} />
                      </div>
                      <div className="stat-info">
                        <div className="label">{label}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)', marginTop: 2 }}>{desc}</div>
                      </div>
                      <ChevronRight size={16} color="var(--cc-text-subtle)" style={{ marginLeft: 'auto' }} />
                    </div>
                  </Link>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
                {/* Recent Medical Activity / Latest Visit */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Recent Medical Activity</h3>
                    <Link to="/patient/timeline" className="btn btn-ghost btn-sm">View Timeline →</Link>
                  </div>

                  {latestVisit ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                            {latestVisit.hospital_name || latestVisit.title || 'Health Record'}
                          </div>
                          <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                            {format(new Date(latestVisit.date || latestVisit.visit_date), 'dd MMM yyyy')} · {latestVisit.visit_type || latestVisit.document_type || 'Record'}
                          </div>
                        </div>
                        <span className={`badge badge-${latestVisit.status === 'completed' ? 'success' : 'info'}`}>
                          {latestVisit.status || 'Verified'}
                        </span>
                      </div>

                      {latestVisit.consultations?.[0] && (
                        <div style={{
                          background: 'var(--cc-surface-2)',
                          borderRadius: 'var(--cc-radius)',
                          padding: '14px 16px',
                        }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: 8 }}>
                            Latest Consultation
                          </div>
                          <p style={{ fontSize: '0.875rem', color: 'var(--cc-text)', margin: 0 }}>
                            <strong>Symptoms: </strong> {latestVisit.consultations[0].symptoms}
                          </p>
                          {latestVisit.consultations[0].diagnosis && (
                            <p style={{ fontSize: '0.875rem', color: '#f87171', marginTop: 6, fontWeight: 600 }}>
                              Diagnosis: {latestVisit.consultations[0].diagnosis}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.875rem', padding: '16px 0' }}>
                      No recent hospital encounters recorded. Use "Upload Medical Report" to add existing health records.
                    </div>
                  )}
                </div>

                {/* Mini CareCard QR Preview */}
                <div className="card" style={{ textAlign: 'center' }}>
                  <h3 className="card-title" style={{ marginBottom: 14 }}>Your QR CareCard</h3>
                  {qrData ? (
                    <div>
                      <div style={{
                        background: '#ffffff',
                        padding: 14,
                        borderRadius: 14,
                        display: 'inline-block',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        marginBottom: 12,
                      }}>
                        <QRCodeSVG
                          value={JSON.stringify({ token: qrData.token, carecarryId: qrData.carecarryId })}
                          size={140}
                          level="H"
                        />
                      </div>
                      <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, color: '#818cf8', letterSpacing: '1px' }}>
                        {qrData.carecarryId}
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <Link to="/patient/carecarry-id" className="btn btn-secondary btn-sm">
                          Open Full CareCard
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.85rem' }}>Loading QR...</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

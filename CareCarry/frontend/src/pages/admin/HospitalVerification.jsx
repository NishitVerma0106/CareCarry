import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { adminService } from '../../services';
import { Hospital, CheckCircle, XCircle, RefreshCw, MapPin, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function HospitalVerification() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllHospitals();
      setHospitals(res.data.data || []);
    } catch {
      toast.error('Failed to load hospitals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleVerify = async (id, status) => {
    try {
      await adminService.verifyHospital(id, status);
      toast.success(`Hospital marked as ${status}.`);
      fetchHospitals();
    } catch {
      toast.error('Failed to update hospital status.');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Hospital & Clinic Governance" />
        <div className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="page-title">Hospital Registry & Verification</div>
              <p className="page-subtitle">Verify institutional credentials and authorize hospitals to issue medical encounters</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchHospitals}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : hospitals.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
              {hospitals.map((h) => (
                <div key={h.hospital_id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        padding: 12, borderRadius: 12, background: 'rgba(245,158,11,0.15)', color: '#f59e0b'
                      }}>
                        <Hospital size={24} />
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>{h.name}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)', fontFamily: 'Space Grotesk' }}>
                          Reg: {h.registration_number || 'REG-PENDING'}
                        </div>
                      </div>
                    </div>

                    <span className={`badge badge-${h.verification_status === 'verified' ? 'success' : 'warning'}`}>
                      {h.verification_status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.825rem', color: 'var(--cc-text-muted)', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={14} /> {h.address || `${h.city}, ${h.state}`}
                    </div>
                    {h.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={14} /> {h.phone}
                      </div>
                    )}
                    {h.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={14} /> {h.email}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    {h.verification_status !== 'verified' ? (
                      <button
                        className="btn btn-success btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => handleVerify(h.hospital_id, 'verified')}
                      >
                        <CheckCircle size={14} /> Verify Hospital
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, color: '#ef4444' }}
                        onClick={() => handleVerify(h.hospital_id, 'suspended')}
                      >
                        <XCircle size={14} /> Suspend Access
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🏥</div>
              <div className="empty-state-title">No hospitals registered</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { patientService, interoperabilityService } from '../../services';
import { User, Heart, Shield, Save, CheckCircle, AlertTriangle, ShieldCheck, Link2, X, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatientProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkingAbha, setLinkingAbha] = useState(false);
  const [abhaInput, setAbhaInput] = useState('');
  const [submittingAbha, setSubmittingAbha] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    carecarry_id: '',
    abha_id: '',
    abha_status: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    allergies: '',
    conditions: '',
    current_medications: '',
    emergency_notes: '',
    address: '',
    city: '',
    state: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
  });

  useEffect(() => {
    patientService.getProfile()
      .then((res) => {
        if (res.data.data) {
          setProfile(res.data.data);
          if (res.data.data.abha_id) {
            setAbhaInput(res.data.data.abha_id);
          }
        }
      })
      .catch(() => toast.error('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleLinkAbha = async (e) => {
    e.preventDefault();
    if (!abhaInput.trim()) {
      toast.error('Please enter an ABHA ID');
      return;
    }
    setSubmittingAbha(true);
    try {
      await interoperabilityService.linkAbha({
        carecarryId: profile.carecarry_id,
        abhaId: abhaInput.trim(),
      });
      setProfile((prev) => ({
        ...prev,
        abha_id: abhaInput.trim(),
        abha_status: 'LINKED',
      }));
      setLinkingAbha(false);
      toast.success('National ABHA ID linked successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to link ABHA ID.');
    } finally {
      setSubmittingAbha(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await patientService.updateProfile(profile);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="My Profile" />
        <div className="page-content">
          <div className="page-header">
            <div className="page-title">Personal & Medical Profile</div>
            <p className="page-subtitle">Manage your contact details, emergency information, and clinical background</p>
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <div className="animate-fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
              {/* Dual Identity Banner: CareCarry Application ID + National ABHA ID */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.25), rgba(99, 102, 241, 0.15))',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                borderRadius: 'var(--cc-radius-lg)',
                padding: '20px 24px',
                marginBottom: 24,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}>
                  {/* CareCarry ID */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--cc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        CareCarry Application ID
                      </span>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Primary</span>
                    </div>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: '1.5rem', fontWeight: 800, color: '#818cf8', letterSpacing: '1px', marginTop: 2 }}>
                      {profile.carecarry_id}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)', marginTop: 2 }}>
                      Internal identity used for hospital triage and QR consent access
                    </div>
                  </div>

                  {/* ABHA National ID */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--cc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        National Health ID (ABHA)
                      </span>
                      {profile.abha_id ? (
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Linked</span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Unlinked</span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, color: profile.abha_id ? '#34d399' : 'var(--cc-text-muted)', marginTop: 2 }}>
                      {profile.abha_id || 'Not Linked Yet'}
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setLinkingAbha(true)}
                      style={{ marginTop: 6, fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      <Link2 size={12} style={{ marginRight: 4 }} />
                      {profile.abha_id ? 'Update ABHA ID' : 'Link National ABHA ID'}
                    </button>
                  </div>
                </div>

                {/* Architecture Clarification Callout */}
                <div style={{
                  marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem', color: 'var(--cc-text-muted)'
                }}>
                  <Globe size={15} color="#60a5fa" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Architecture Note:</strong> CareCarry ID ≠ ABHA ID. CareCarry acts as your consent and data access layer, while ABHA is India’s national digital health identifier enabling hospital-to-hospital interoperability.
                  </span>
                </div>
              </div>

              {/* Link ABHA ID Modal */}
              {linkingAbha && (
                <div style={{
                  position: 'fixed', inset: 0, zIndex: 1000,
                  background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
                }}>
                  <div className="card" style={{ maxWidth: 480, width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldCheck size={20} color="#10b981" />
                        <h3 style={{ margin: 0, fontWeight: 800 }}>Link National ABHA ID</h3>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => setLinkingAbha(false)}>
                        <X size={18} />
                      </button>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--cc-text-muted)', marginTop: 0, marginBottom: 16 }}>
                      Enter your 14-digit Ayushman Bharat Health Account (ABHA) ID. CareCarry maps your application identity to your national health profile for federated records discovery.
                    </p>

                    <form onSubmit={handleLinkAbha}>
                      <div className="form-group">
                        <label className="form-label">ABHA ID (National Health Identifier)</label>
                        <input
                          className="form-input"
                          style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
                          placeholder="e.g. 91-4521-8890-1234"
                          value={abhaInput}
                          onChange={(e) => setAbhaInput(e.target.value)}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setLinkingAbha(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submittingAbha}>
                          {submittingAbha ? <div className="spinner" /> : 'Confirm & Link ABHA'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Account & Personal */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <User size={18} color="#6366f1" /> Personal Information
                  </h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="first_name">First Name</label>
                      <input id="first_name" name="first_name" className="form-input" value={profile.first_name || ''} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="last_name">Last Name</label>
                      <input id="last_name" name="last_name" className="form-input" value={profile.last_name || ''} onChange={handleChange} required />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="email">Email Address (Read-only)</label>
                      <input id="email" className="form-input" value={profile.email || ''} disabled style={{ opacity: 0.7 }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="phone">Phone / Mobile</label>
                      <input id="phone" name="phone" className="form-input" value={profile.phone || ''} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="date_of_birth">Date of Birth</label>
                      <input id="date_of_birth" name="date_of_birth" type="date" className="form-input" value={profile.date_of_birth ? profile.date_of_birth.split('T')[0] : ''} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="gender">Gender</label>
                      <select id="gender" name="gender" className="form-input" value={profile.gender || ''} onChange={handleChange}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="blood_group">Blood Group</label>
                      <select id="blood_group" name="blood_group" className="form-input" value={profile.blood_group || ''} onChange={handleChange}>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="address">Address</label>
                    <input id="address" name="address" className="form-input" value={profile.address || ''} onChange={handleChange} />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="city">City</label>
                      <input id="city" name="city" className="form-input" value={profile.city || ''} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="state">State</label>
                      <input id="state" name="state" className="form-input" value={profile.state || ''} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <AlertTriangle size={18} color="#f59e0b" /> Emergency Contact
                  </h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="em-name">Contact Person Name</label>
                      <input id="em-name" name="emergency_contact_name" className="form-input" value={profile.emergency_contact_name || ''} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="em-phone">Contact Phone</label>
                      <input id="em-phone" name="emergency_contact_phone" className="form-input" value={profile.emergency_contact_phone || ''} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="em-rel">Relationship</label>
                      <input id="em-rel" name="emergency_contact_relation" className="form-input" placeholder="e.g. Spouse, Parent" value={profile.emergency_contact_relation || ''} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                {/* Clinical & Health Profile */}
                <div className="card" style={{ marginBottom: 24 }}>
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Heart size={18} color="#ec4899" /> Medical Profile & Allergies
                  </h3>

                  <div className="form-group">
                    <label className="form-label" htmlFor="allergies">Known Allergies (Crucial for clinical treatment)</label>
                    <input id="allergies" name="allergies" className="form-input" placeholder="e.g. Penicillin, Dust, Peanuts" value={profile.allergies || ''} onChange={handleChange} />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="conditions">Existing Medical Conditions</label>
                      <input id="conditions" name="conditions" className="form-input" placeholder="e.g. Hypertension, Asthma" value={profile.conditions || ''} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="current_medications">Current Regular Medications</label>
                      <input id="current_medications" name="current_medications" className="form-input" placeholder="e.g. Metformin 500mg" value={profile.current_medications || ''} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="emergency_notes">Emergency Notes for Doctors</label>
                    <textarea id="emergency_notes" name="emergency_notes" className="form-input" rows={2} placeholder="Any critical health condition or emergency instruction..." value={profile.emergency_notes || ''} onChange={handleChange} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" id="save-profile" className="btn btn-primary btn-lg" disabled={saving}>
                    {saving ? <div className="spinner" /> : <><Save size={18} /> Save Profile Changes</>}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

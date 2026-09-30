import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services';
import toast from 'react-hot-toast';
import { UserPlus, Shield, Heart, FileText, CheckCircle } from 'lucide-react';

const ROLES = [
  { value: 'patient', label: 'Patient', icon: '🧑‍🤝‍🧑' },
  { value: 'doctor', label: 'Doctor', icon: '👨‍⚕️' },
  { value: 'hospital_staff', label: 'Hospital Staff', icon: '🏥' },
];

export default function Register() {
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(false);
  const [createdPatient, setCreatedPatient] = useState(null);

  const [form, setForm] = useState({
    // Account details
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',

    // Patient details
    date_of_birth: '',
    gender: 'male',
    blood_group: 'O+',
    address: '',
    city: '',
    state: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',

    // Optional medical profile
    allergies: '',
    conditions: '',
    current_medications: '',
    emergency_notes: '',

    // Doctor & Staff
    license_number: '',
    specialization: 'General Medicine',
    staff_role: 'records_staff',

    // Consent
    consent: true,
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (role === 'patient' && !form.consent) {
      toast.error('Please agree to the CareCarry data and access policy.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.register({
        ...form,
        role,
      });

      if (role === 'patient' && res.data?.data?.user?.carecarryId) {
        setCreatedPatient(res.data.data.user);
        toast.success('Patient account created with unique CareCarry ID!');
      } else {
        toast.success(res.data?.message || 'Registration successful! Please sign in.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  if (createdPatient) {
    return (
      <div className="auth-container">
        <div className="auth-bg-orb auth-bg-orb-1" />
        <div className="auth-card animate-fade-in" style={{ maxWidth: 520, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            color: '#10b981', border: '2px solid rgba(16,185,129,0.3)'
          }}>
            <CheckCircle size={38} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>Registration Complete!</h2>
          <p style={{ color: 'var(--cc-text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
            Welcome, <strong>{createdPatient.firstName} {createdPatient.lastName}</strong>. Your permanent digital health identity has been generated.
          </p>

          <div style={{
            background: 'var(--cc-surface-2)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 'var(--cc-radius-lg)',
            padding: '24px',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--cc-text-muted)', marginBottom: 8, fontWeight: 700 }}>
              Your CareCarry ID
            </div>
            <div style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '3px',
              color: '#818cf8',
              marginBottom: 12,
            }}>
              {createdPatient.carecarryId}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)', margin: 0 }}>
              Use this ID or your email/phone along with your password to log in.
            </p>
          </div>

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={() => navigate('/login')}
          >
            Proceed to Login →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container" style={{ padding: '40px 16px' }}>
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card animate-fade-in" style={{ maxWidth: 640 }}>
        <div className="auth-logo">
          <div className="auth-logo-text">CareCarry</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--cc-text-muted)', marginTop: 4 }}>
            Create your digital health account
          </div>
        </div>

        {/* Role Selector */}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">I am registering as a</label>
          <div className="role-grid">
            {ROLES.map(({ value, label, icon }) => (
              <div
                key={value}
                id={`role-${value}`}
                className={`role-card ${role === value ? 'selected' : ''}`}
                onClick={() => setRole(value)}
              >
                <div className="role-icon">{icon}</div>
                <div className="role-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Account Details */}
          <div style={{
            fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '1px', color: 'var(--cc-primary-light)', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Shield size={14} /> Account Details
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-fullname">Full Name *</label>
            <input
              id="reg-fullname"
              name="fullName"
              className="form-input"
              placeholder="e.g. Ramesh Kumar"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address *</label>
              <input
                id="reg-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-phone">Mobile / Phone *</label>
              <input
                id="reg-phone"
                name="phone"
                type="tel"
                className="form-input"
                placeholder="9800000000"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password *</label>
              <input
                id="reg-password"
                name="password"
                type="password"
                className="form-input"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm-password">Confirm Password *</label>
              <input
                id="reg-confirm-password"
                name="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Patient-specific details */}
          {role === 'patient' && (
            <>
              <div style={{
                fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '1px', color: '#10b981', margin: '20px 0 14px',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Heart size={14} /> Patient Details
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-dob">Date of Birth</label>
                  <input
                    id="reg-dob"
                    name="date_of_birth"
                    type="date"
                    className="form-input"
                    value={form.date_of_birth}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-gender">Gender</label>
                  <select
                    id="reg-gender"
                    name="gender"
                    className="form-input"
                    value={form.gender}
                    onChange={handleChange}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-blood">Blood Group</label>
                  <select
                    id="reg-blood"
                    name="blood_group"
                    className="form-input"
                    value={form.blood_group}
                    onChange={handleChange}
                  >
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
                <label className="form-label" htmlFor="reg-address">Address</label>
                <input
                  id="reg-address"
                  name="address"
                  className="form-input"
                  placeholder="Street / Colony / Landmark"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-city">City</label>
                  <input
                    id="reg-city"
                    name="city"
                    className="form-input"
                    placeholder="e.g. Mumbai"
                    value={form.city}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-state">State</label>
                  <input
                    id="reg-state"
                    name="state"
                    className="form-input"
                    placeholder="e.g. Maharashtra"
                    value={form.state}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-em-name">Emergency Contact Name</label>
                  <input
                    id="reg-em-name"
                    name="emergency_contact_name"
                    className="form-input"
                    placeholder="e.g. Sunita Kumar"
                    value={form.emergency_contact_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-em-phone">Emergency Phone</label>
                  <input
                    id="reg-em-phone"
                    name="emergency_contact_phone"
                    type="tel"
                    className="form-input"
                    placeholder="9700000000"
                    value={form.emergency_contact_phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Optional Medical Profile */}
              <div style={{
                fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '1px', color: '#f59e0b', margin: '20px 0 14px',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <FileText size={14} /> Optional Medical Profile
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-allergies">Known Allergies</label>
                <input
                  id="reg-allergies"
                  name="allergies"
                  className="form-input"
                  placeholder="e.g. Penicillin, Peanuts, Dust"
                  value={form.allergies}
                  onChange={handleChange}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-conditions">Existing Conditions</label>
                  <input
                    id="reg-conditions"
                    name="conditions"
                    className="form-input"
                    placeholder="e.g. Hypertension, Diabetes Type 2"
                    value={form.conditions}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-medications">Current Medications</label>
                  <input
                    id="reg-medications"
                    name="current_medications"
                    className="form-input"
                    placeholder="e.g. Metformin 500mg, Amlodipine 5mg"
                    value={form.current_medications}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-em-notes">Emergency Notes</label>
                <input
                  id="reg-em-notes"
                  name="emergency_notes"
                  className="form-input"
                  placeholder="Critical information for emergency responders"
                  value={form.emergency_notes}
                  onChange={handleChange}
                />
              </div>

              {/* Consent checkbox */}
              <div style={{
                marginTop: 20, padding: 14, background: 'var(--cc-surface-2)',
                borderRadius: 'var(--cc-radius)', border: '1px solid var(--cc-border)',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <input
                  id="reg-consent"
                  name="consent"
                  type="checkbox"
                  checked={form.consent}
                  onChange={handleChange}
                  style={{ marginTop: 3, width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="reg-consent" style={{ fontSize: '0.85rem', color: 'var(--cc-text)', cursor: 'pointer' }}>
                  I agree to the <strong>CareCarry Data and Access Policy</strong>. I understand that my medical documents and clinical summary will be shared strictly with authorized healthcare providers upon verification.
                </label>
              </div>
            </>
          )}

          {/* Doctor specific */}
          {role === 'doctor' && (
            <div className="form-grid" style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-license">License Number *</label>
                <input
                  id="reg-license"
                  name="license_number"
                  className="form-input"
                  placeholder="e.g. MH-DOC-123456"
                  value={form.license_number}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-specialization">Specialization *</label>
                <input
                  id="reg-specialization"
                  name="specialization"
                  className="form-input"
                  placeholder="e.g. General Medicine, Cardiology"
                  value={form.specialization}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          {/* Hospital Staff specific */}
          {role === 'hospital_staff' && (
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label" htmlFor="reg-staff-role">Staff Role</label>
              <select
                id="reg-staff-role"
                name="staff_role"
                className="form-input"
                value={form.staff_role}
                onChange={handleChange}
              >
                <option value="records_staff">Medical Records Officer</option>
                <option value="reception">Reception & Registration</option>
                <option value="lab_technician">Laboratory Technician</option>
                <option value="radiology">Radiology Technician</option>
              </select>
            </div>
          )}

          {role !== 'patient' && (
            <div className="alert alert-info" style={{ margin: '20px 0' }}>
              <span>ℹ️</span>
              <span>
                Doctor and Hospital Staff accounts require verification by a platform administrator before clinical APIs can be accessed.
              </span>
            </div>
          )}

          <button
            type="submit"
            id="register-submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 24 }}
          >
            {loading ? <div className="spinner" /> : <><UserPlus size={18} /> Complete Registration</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--cc-text-muted)' }}>
          Already have a CareCarry ID or account?{' '}
          <Link to="/login" style={{ color: 'var(--cc-primary-light)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

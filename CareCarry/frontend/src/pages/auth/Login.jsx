import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn, Sparkles, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.identifier, form.password);
      toast.success(`Welcome back, ${user.firstName || 'User'}!`);
      const targetPath = user.role === 'hospital_staff' ? '/hospital/dashboard' : `/${user.role}/dashboard`;
      navigate(targetPath);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoLogins = [
    { label: 'Patient', id: 'rajan@example.com', pass: 'Patient@1234', color: '#10b981', note: 'CC-7K3QX9AB' },
    { label: 'Doctor', id: 'dr.sharma@example.com', pass: 'Doctor@1234', color: '#3b82f6', note: 'Dr. Priya' },
    { label: 'Hospital Staff', id: 'anil.staff@abc.in', pass: 'Staff@1234', color: '#f59e0b', note: 'ABC Hospital' },
    { label: 'Admin', id: 'admin@carecarry.in', pass: 'Admin@1234', color: '#ec4899', note: 'Platform Admin' },
  ];

  return (
    <div className="auth-container">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card animate-fade-in" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="auth-logo-text" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span>CareCarry</span>
            <ShieldCheck size={28} color="#10b981" />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--cc-text-muted)', marginTop: 4 }}>
            Unified Health Identity & Medical Records Platform
          </div>
        </div>

        <h2 className="auth-title">Sign In</h2>
        <p className="auth-subtitle">Enter your CareCarry ID or registered email</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-identifier">CareCarry ID / Email / Phone</label>
            <input
              id="login-identifier"
              name="identifier"
              type="text"
              className="form-input"
              placeholder="CC-7K3QX9AB or you@example.com"
              value={form.identifier}
              onChange={handleChange}
              required
              autoComplete="username"
              style={{ fontSize: '0.95rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                name="password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--cc-text-muted)', cursor: 'pointer',
                }}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="login-submit" style={{ marginTop: 8 }}>
            {loading ? <div className="spinner" /> : <><LogIn size={18} /> Sign In</>}
          </button>
        </form>

        <div className="divider">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} /> 1-Click Demo Login
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {demoLogins.map(({ label, id, pass, color, note }) => (
            <button
              key={label}
              id={`demo-${label.toLowerCase().replace(/\s+/g, '-')}`}
              type="button"
              className="btn btn-secondary"
              onClick={() => setForm({ identifier: id, password: pass })}
              style={{
                fontSize: '0.78rem',
                borderColor: `${color}40`,
                background: 'var(--cc-surface-2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '8px 12px',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 700, color }}>{label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--cc-text-muted)', marginTop: 2 }}>{note}</div>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--cc-text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--cc-primary-light)', fontWeight: 600 }}>
            Register as Patient
          </Link>
        </p>
      </div>
    </div>
  );
}

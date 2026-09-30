import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ title }) {
  const { user } = useAuth();

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-actions">
        <button className="btn btn-ghost btn-icon" title="Notifications" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--cc-primary), var(--cc-accent))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '0.875rem',
          color: 'white',
          flexShrink: 0,
        }}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  );
}

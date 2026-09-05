import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, RefreshCw, LogOut, UserCheck, ArrowLeft, UserPlus } from 'lucide-react';

interface RoleLoginPageProps {
  role: UserRole;
  title: string;
  subtitle: string;
  targetPortal: string;
  registerLink?: string;
  registerText?: string;
}

export const RoleLoginPage: React.FC<RoleLoginPageProps> = ({
  role,
  title,
  subtitle,
  targetPortal,
  registerLink,
  registerText
}) => {
  const navigate = useNavigate();
  const { user, login, logout, isAuthenticated } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const roleTheme = {
    CITIZEN: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },
    RESPONDER: { color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)', border: 'rgba(2, 132, 199, 0.3)' },
    VOLUNTEER: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)' },
    ADMIN: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' }
  }[role];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const authenticatedUser = await login(trimmedEmail, password, role);
      setSuccess(`Authenticated as ${authenticatedUser.full_name} (${authenticatedUser.role}). Redirecting...`);

      setTimeout(() => {
        switch (authenticatedUser.role) {
          case 'RESPONDER':
            navigate('/responder', { replace: true });
            break;
          case 'VOLUNTEER':
            navigate('/volunteer', { replace: true });
            break;
          case 'ADMIN':
            navigate('/command-center', { replace: true });
            break;
          case 'CITIZEN':
          default:
            navigate('/citizen', { replace: true });
            break;
        }
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const isRoleMatching = isAuthenticated && user && user.role === role;

  return (
    <div style={{ maxWidth: '460px', margin: '3rem auto', padding: '0 1rem' }}>
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          to="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} /> All Login Options
        </Link>
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 800,
          background: roleTheme.bg,
          color: roleTheme.color,
          border: `1px solid ${roleTheme.border}`,
          padding: '0.15rem 0.5rem',
          borderRadius: '9999px',
          textTransform: 'uppercase'
        }}>
          {role} PORTAL
        </span>
      </div>

      <div className="card" style={{ padding: '2.25rem', border: '1px solid var(--border-color)', boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: roleTheme.bg,
              border: `1px solid ${roleTheme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
              color: roleTheme.color
            }}
          >
            <Shield size={28} color={roleTheme.color} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {subtitle}
          </p>
        </div>

        {/* Existing Session Active View */}
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: isRoleMatching ? '#86efac' : '#f59e0b' }}>
              <UserCheck size={20} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {isRoleMatching ? 'Logged in with this role' : `Logged in as ${user.role}`}
              </span>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div><strong>Name:</strong> <span style={{ color: '#fff' }}>{user.full_name}</span></div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Active Role:</strong> <span style={{ color: roleTheme.color, fontWeight: 700 }}>{user.role}</span></div>
            </div>

            {isRoleMatching ? (
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => navigate(targetPortal)}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.55rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}
                >
                  Enter {role} Portal <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="btn btn-outline"
                  style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', gap: '0.3rem' }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.8rem', color: '#fca5a5', marginBottom: '0.75rem' }}>
                  Your account is registered as <strong>{user.role}</strong>. Please switch to your authorized portal or sign out.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (user.role === 'CITIZEN') navigate('/citizen');
                      else if (user.role === 'RESPONDER') navigate('/responder');
                      else if (user.role === 'VOLUNTEER') navigate('/volunteer');
                      else if (user.role === 'ADMIN') navigate('/command-center');
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                  >
                    Go to My Portal
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="btn btn-outline"
                    style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Sign In Form */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                  lineHeight: 1.4
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  color: '#86efac',
                  fontSize: '0.85rem'
                }}
              >
                <CheckCircle2 size={16} />
                <span>{success}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email-input">
                {role} Email Address
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                <input
                  id="email-input"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder={`e.g. yourname@varahi.org`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password-input">
                Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                <input
                  id="password-input"
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                marginTop: '0.25rem',
                gap: '0.5rem',
                background: role === 'ADMIN' ? '#dc2626' : role === 'VOLUNTEER' ? '#9333ea' : role === 'RESPONDER' ? '#0284c7' : 'var(--primary-color)'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin" /> Verifying Role...
                </>
              ) : (
                <>
                  Sign In as {role} <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Create Account Link (Only for Citizen, Responder, Volunteer; NEVER Admin) */}
        {registerLink && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Don't have an account yet?{' '}
              <Link
                to={registerLink}
                style={{
                  color: roleTheme.color,
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <UserPlus size={14} /> {registerText || 'Create Account'}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleLoginPage;

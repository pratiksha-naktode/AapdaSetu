import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, User, Phone, Award, AlertCircle, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RESPONDER_TYPES = [
  { value: 'RESCUE_TEAM', label: 'Disaster Rescue Team (NDRF / SDRF)' },
  { value: 'MEDICAL_TEAM', label: 'Emergency Medical Service / Ambulance' },
  { value: 'FIRE_SERVICES', label: 'Fire & Hazard Response' },
  { value: 'POLICE', label: 'Law Enforcement / Traffic Police' },
];

export const RegisterResponder: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [responderType, setResponderType] = useState('RESCUE_TEAM');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Please enter commander or official contact name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter official unit email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!responderType) {
      setError('Please select your official responder unit type.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/register/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          password,
          responder_type: responderType,
          badge_number: badgeNumber.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Registration failed.');
      }

      // Ensure no active session remains from signup
      localStorage.removeItem('varahi_auth_token');
      localStorage.removeItem('varahi_auth_user');

      setSuccess('Responder credentials submitted successfully! Please sign in to your unit portal.');

      setTimeout(() => {
        navigate('/responder/login', { replace: true });
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '2.5rem auto', padding: '0 1rem' }}>
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          to="/responder/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} /> Back to Responder Login
        </Link>
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 800,
          background: 'rgba(2, 132, 199, 0.15)',
          color: '#0284c7',
          border: '1px solid rgba(2, 132, 199, 0.3)',
          padding: '0.15rem 0.5rem',
          borderRadius: '9999px',
          textTransform: 'uppercase'
        }}>
          OFFICIAL ONBOARDING
        </span>
      </div>

      <div className="card" style={{ padding: '2.25rem', border: '1px solid var(--border-color)', boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(2, 132, 199, 0.15)',
              border: '1px solid rgba(2, 132, 199, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
              color: '#0284c7'
            }}
          >
            <Shield size={28} color="#0284c7" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Responder Unit Onboarding</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Register your official rescue, medical, or police response unit
          </p>
        </div>

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
              lineHeight: 1.4,
              marginBottom: '1.25rem'
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
              flexDirection: 'column',
              gap: '0.5rem',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              color: '#86efac',
              fontSize: '0.88rem',
              marginBottom: '1.25rem',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Redirecting to Responder Login...
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="commander-name">
              Full Name / Unit Commander Name
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="commander-name"
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="e.g. Commander Rajesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="responder-email">
              Official Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="responder-email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="official.unit@agency.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="responder-phone">
              Emergency Contact Phone
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="responder-phone"
                type="tel"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="responder-type">
              Unit / Responder Type
            </label>
            <select
              id="responder-type"
              className="form-input"
              value={responderType}
              onChange={(e) => setResponderType(e.target.value)}
            >
              {RESPONDER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="badge-number">
              Badge ID / Unit Registration No.
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Award size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="badge-number"
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="e.g. NDRF-BN10-4421"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="resp-password">
              Password (minimum 6 characters)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="resp-password"
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

          <div className="form-group">
            <label className="form-label" htmlFor="resp-confirm-password">
              Confirm Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="resp-confirm-password"
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              fontSize: '0.95rem',
              fontWeight: 700,
              marginTop: '0.5rem',
              background: '#0284c7',
              gap: '0.5rem'
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="spin" /> Submitting Credentials...
              </>
            ) : (
              'Register Responder Unit'
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Already registered?{' '}
            <Link
              to="/responder/login"
              style={{ color: '#0284c7', fontWeight: 700, textDecoration: 'none' }}
            >
              Sign in to Responder Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterResponder;

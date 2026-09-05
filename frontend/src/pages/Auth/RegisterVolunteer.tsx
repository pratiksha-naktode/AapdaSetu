import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HeartHandshake, UserPlus, Lock, Mail, Phone, User, ArrowLeft, AlertCircle, CheckCircle2, RefreshCw, Truck } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AVAILABLE_CAPABILITIES = [
  { id: 'FOOD', label: 'Food & Rations' },
  { id: 'WATER', label: 'Clean Drinking Water' },
  { id: 'MEDICINE', label: 'Medical Supplies & Insulin' },
  { id: 'FIRST_AID', label: 'First Aid Treatment' },
  { id: 'TRANSPORTATION', label: 'Transportation & Evacuation' },
  { id: 'GENERAL_ASSISTANCE', label: 'General Relief & Labor' }
];

export const RegisterVolunteer: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vehicleType, setVehicleType] = useState('Two Wheeler');
  const [selectedCaps, setSelectedCaps] = useState<string[]>(['FOOD', 'WATER']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleCapability = (capId: string) => {
    setSelectedCaps(prev =>
      prev.includes(capId) ? prev.filter(c => c !== capId) : [...prev, capId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (selectedCaps.length === 0) {
      setError('Please select at least one relief capability.');
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

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register/volunteer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          password,
          capabilities: selectedCaps,
          vehicle_type: vehicleType
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register volunteer account.');
      }

      setSuccess('Volunteer profile registered successfully! Logging you in...');
      await login(email.trim(), password, 'VOLUNTEER');
      setTimeout(() => {
        navigate('/volunteer', { replace: true });
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '2.5rem auto', padding: '0 1rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/volunteer/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} /> Back to Volunteer Login
        </Link>
      </div>

      <div className="card" style={{ padding: '2.25rem', border: '1px solid var(--border-color)', boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
              color: '#a855f7'
            }}
          >
            <HeartHandshake size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Volunteer Registration</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Join the community relief force to deliver supplies to citizens in need
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
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              color: '#86efac',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}
          >
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="name-input">Full Name *</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="name-input"
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="e.g. Ramesh Varma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Email Address *</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="email-input"
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="e.g. volunteer@varahi.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone-input">Mobile Phone (for dispatch SMS)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="phone-input"
                type="tel"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="+91 98765 43212"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Capabilities Selection */}
          <div className="form-group">
            <label className="form-label">
              Select Your Relief Capabilities * (You will receive matching supply tasks)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.35rem' }}>
              {AVAILABLE_CAPABILITIES.map(cap => {
                const isSelected = selectedCaps.includes(cap.id);
                return (
                  <label
                    key={cap.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-secondary)',
                      border: `1px solid ${isSelected ? '#a855f7' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCapability(cap.id)}
                      style={{ accentColor: '#a855f7' }}
                    />
                    <span>{cap.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="vehicle-input">Available Vehicle</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Truck size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <select
                id="vehicle-input"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="Two Wheeler">Two Wheeler (Motorcycle/Scooter)</option>
                <option value="Four Wheeler (Car/SUV)">Four Wheeler (Car/SUV)</option>
                <option value="Mini Truck / Van">Mini Truck / Van</option>
                <option value="Tractor / High Clearance">Tractor / High Clearance</option>
                <option value="Boat / Watercraft">Boat / Watercraft</option>
                <option value="Foot / Bicycle">Foot / Bicycle</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password *</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="password-input"
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password-input">Confirm Password *</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="confirm-password-input"
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="Re-enter password"
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
              fontSize: '0.92rem',
              fontWeight: 700,
              marginTop: '0.5rem',
              gap: '0.5rem',
              background: '#9333ea'
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="spin" /> Registering Volunteer...
              </>
            ) : (
              <>
                <UserPlus size={16} /> Register as Volunteer
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Already registered?{' '}
            <Link to="/volunteer/login" style={{ color: '#a855f7', fontWeight: 700, textDecoration: 'none' }}>
              Sign in as Volunteer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterVolunteer;

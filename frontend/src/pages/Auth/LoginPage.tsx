import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Users, ShieldAlert, HeartHandshake, Lock, ArrowRight, UserCheck, LogOut } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const handleGoDashboard = () => {
    if (!user) return;
    switch (user.role) {
      case 'RESPONDER':
        navigate('/responder');
        break;
      case 'VOLUNTEER':
        navigate('/volunteer');
        break;
      case 'ADMIN':
        navigate('/command-center');
        break;
      case 'CITIZEN':
      default:
        navigate('/citizen');
        break;
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '3rem auto', padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(59, 130, 246, 0.2))',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            color: '#ef4444'
          }}
        >
          <Shield size={32} />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Varahi Access Portal
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.35rem' }}>
          Choose how you want to sign in to the platform
        </p>
      </div>

      {/* Active Session Detected Banner */}
      {isAuthenticated && user && (
        <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.75rem', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <UserCheck size={24} color="#60a5fa" />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                  Active Session: {user.full_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Authenticated as <strong>{user.role}</strong> ({user.email})
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleGoDashboard}
                className="btn btn-primary"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', gap: '0.35rem' }}
              >
                Go to Dashboard <ArrowRight size={14} />
              </button>
              <button
                onClick={logout}
                className="btn btn-outline"
                style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem', gap: '0.35rem' }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Four Dedicated Role Access Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* 1. Citizen Login */}
        <Link to="/citizen/login" style={{ textDecoration: 'none' }}>
          <div
            className="card"
            style={{
              padding: '1.5rem',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderLeft: '4px solid #3b82f6',
              transition: 'transform 0.15s, border-color 0.15s',
              cursor: 'pointer'
            }}
          >
            <div>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', marginBottom: '0.85rem' }}>
                <Users size={22} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                Citizen Login
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.4 }}>
                Sign in to submit emergency SOS requests, request relief supplies, and track field response status.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3b82f6', fontWeight: 700, fontSize: '0.85rem', marginTop: '1.25rem' }}>
              <span>Login as Citizen</span> <ArrowRight size={14} />
            </div>
          </div>
        </Link>

        {/* 2. Responder Login */}
        <Link to="/responder/login" style={{ textDecoration: 'none' }}>
          <div
            className="card"
            style={{
              padding: '1.5rem',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderLeft: '4px solid #0284c7',
              transition: 'transform 0.15s, border-color 0.15s',
              cursor: 'pointer'
            }}
          >
            <div>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(2, 132, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', marginBottom: '0.85rem' }}>
                <ShieldAlert size={22} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                Responder Login
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.4 }}>
                For NDRF, Police, Medical & Fire Rescue units to access the emergency queue and accept dispatches.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7', fontWeight: 700, fontSize: '0.85rem', marginTop: '1.25rem' }}>
              <span>Login as Responder</span> <ArrowRight size={14} />
            </div>
          </div>
        </Link>

        {/* 3. Volunteer Login */}
        <Link to="/volunteer/login" style={{ textDecoration: 'none' }}>
          <div
            className="card"
            style={{
              padding: '1.5rem',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderLeft: '4px solid #a855f7',
              transition: 'transform 0.15s, border-color 0.15s',
              cursor: 'pointer'
            }}
          >
            <div>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', marginBottom: '0.85rem' }}>
                <HeartHandshake size={22} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                Volunteer Login
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.4 }}>
                For community volunteers to deliver food, water, medicine and supplies based on registered capabilities.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a855f7', fontWeight: 700, fontSize: '0.85rem', marginTop: '1.25rem' }}>
              <span>Login as Volunteer</span> <ArrowRight size={14} />
            </div>
          </div>
        </Link>

        {/* 4. Admin Login */}
        <Link to="/admin/login" style={{ textDecoration: 'none' }}>
          <div
            className="card"
            style={{
              padding: '1.5rem',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderLeft: '4px solid #ef4444',
              transition: 'transform 0.15s, border-color 0.15s',
              cursor: 'pointer'
            }}
          >
            <div>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '0.85rem' }}>
                <Lock size={22} />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                Admin Login
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.35rem', lineHeight: 1.4 }}>
                Restricted Disaster Command Center portal for district controllers, GIS operations, and resource dispatch.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', marginTop: '1.25rem' }}>
              <span>Login as Admin</span> <ArrowRight size={14} />
            </div>
          </div>
        </Link>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
        <Link to="/" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to Varahi Overview
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;

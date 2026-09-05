import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, AlertTriangle, Package, MapPin, Users, HeartHandshake, ShieldCheck, ArrowRight, Cpu, Radio, WifiOff } from 'lucide-react';

interface Props {
  onSelectRole?: (role: any) => void;
}

export const LandingPage: React.FC<Props> = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', padding: '3rem 1rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', padding: '0.4rem 1rem', borderRadius: '9999px', color: '#93c5fd', fontSize: '0.85rem', fontWeight: 700 }}>
          <ShieldAlert size={16} /> COMMUNITY DISASTER MANAGEMENT SYSTEM
        </div>

        <h1 style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1.15, maxWidth: '850px', background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AI-Powered Disaster Response & Relief Coordination Platform
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '720px', lineHeight: 1.6 }}>
          When disasters strike, emergency systems get overwhelmed. <strong>Varahi</strong> instantly triages who needs help first, matches nearest capable responders, captures requests offline, and gives district authorities live GIS command awareness.
        </p>

        {/* Disaster Sector Alert */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '0.85rem 1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#38bdf8' }}>
          <Radio size={18} className="spin" />
          <span>Active Emergency Relief Sector: <strong>Bhimavaram District, Andhra Pradesh</strong></span>
        </div>
      </div>

      {/* 4 Role Entry Cards */}
      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select User Role Portal
        </h2>

        <div className="grid-4">
          {/* Citizen */}
          <Link
            to={isAuthenticated && user?.role === 'CITIZEN' ? '/citizen' : '/citizen/login'}
            style={{ textDecoration: 'none' }}
          >
            <div className="card card-critical" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'transform 0.2s', padding: '1.75rem' }}>
              <div>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '1rem' }}>
                  <AlertTriangle size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fca5a5' }}>1. Citizen</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  Create emergency SOS or resource requests. Auto GPS capture, trapped/injury flags, and offline-first queue with automatic sync.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', marginTop: '1.5rem' }}>
                <span>{isAuthenticated && user?.role === 'CITIZEN' ? 'Open Dashboard' : 'Citizen Login'}</span> <ArrowRight size={14} />
              </div>
            </div>
          </Link>

          {/* Responder */}
          <Link
            to={isAuthenticated && user?.role === 'RESPONDER' ? '/responder' : '/responder/login'}
            style={{ textDecoration: 'none' }}
          >
            <div className="card card-high" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'transform 0.2s', padding: '1.75rem' }}>
              <div>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', marginBottom: '1rem' }}>
                  <ShieldCheck size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#93c5fd' }}>2. Responder / Police</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  Emergency queue ranked by priority. Accept tasks, view triage rationale, update status to "On The Way" and "Rescued".
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3b82f6', fontWeight: 700, fontSize: '0.85rem', marginTop: '1.5rem' }}>
                <span>{isAuthenticated && user?.role === 'RESPONDER' ? 'Open Dashboard' : 'Responder Login'}</span> <ArrowRight size={14} />
              </div>
            </div>
          </Link>

          {/* Volunteer */}
          <Link
            to={isAuthenticated && user?.role === 'VOLUNTEER' ? '/volunteer' : '/volunteer/login'}
            style={{ textDecoration: 'none' }}
          >
            <div className="card" style={{ borderLeft: '4px solid #a855f7', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'transform 0.2s', padding: '1.75rem' }}>
              <div>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', marginBottom: '1rem' }}>
                  <HeartHandshake size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c084fc' }}>3. Volunteer</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  Capability matching for food, water, medicine, and first aid. Proximity ranking and delivery completion tracking.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a855f7', fontWeight: 700, fontSize: '0.85rem', marginTop: '1.5rem' }}>
                <span>{isAuthenticated && user?.role === 'VOLUNTEER' ? 'Open Dashboard' : 'Volunteer Login'}</span> <ArrowRight size={14} />
              </div>
            </div>
          </Link>

          {/* Admin Command */}
          <Link
            to={isAuthenticated && user?.role === 'ADMIN' ? '/command-center' : '/admin/login'}
            style={{ textDecoration: 'none' }}
          >
            <div className="card" style={{ borderLeft: '4px solid #10b981', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'transform 0.2s', padding: '1.75rem' }}>
              <div>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '1rem' }}>
                  <MapPin size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#86efac' }}>4. Admin Command</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  Central GIS control room. Leaflet map with pulsing priority markers, live KPI metrics, priority queue dispatch, and Twilio SMS logs.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 700, fontSize: '0.85rem', marginTop: '1.5rem' }}>
                <span>{isAuthenticated && user?.role === 'ADMIN' ? 'Command Center' : 'Admin Login'}</span> <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Core Technical Highlights */}
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem', textAlign: 'center' }}>
          Why Varahi is Different: Core Technical Innovations
        </h2>

        <div className="grid-3">
          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <Cpu size={28} color="#ef4444" style={{ marginBottom: '0.75rem' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>1. Transparent AI Priority Engine</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
              Dedicated Python FastAPI microservice that computes a 0–100 score and explains WHY a request is CRITICAL (trapped, life threat, child, elderly) to prevent black-box bias.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <WifiOff size={28} color="#f59e0b" style={{ marginBottom: '0.75rem' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>2. Offline-First Request Capture</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
              Citizens in zero-connectivity disaster zones can log emergency requests locally in IndexedDB. When connectivity restores, requests auto-synchronize with deduplication.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <MapPin size={28} color="#38bdf8" style={{ marginBottom: '0.75rem' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>3. PostGIS GIS Command Map</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
              Color-coded pulsing markers (Red=Critical, Orange=High, Yellow=Medium, Green=Low) alongside real-time responder and volunteer locations for rapid dispatch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

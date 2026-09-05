import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { getLocalHistory } from '../../services/offlineStorage';
import { EmergencyRequest } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Package, ArrowRight, ShieldCheck, MapPin, Users, User, Camera } from 'lucide-react';

export const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      if (navigator.onLine) {
        const remote = await api.getRequests();
        setRequests(remote);
      } else {
        const local = await getLocalHistory();
        setRequests(local as EmergencyRequest[]);
      }
    } catch {
      const local = await getLocalHistory();
      setRequests(local as EmergencyRequest[]);
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.full_name || 'Citizen')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner with Citizen Profile & Avatar */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link to="/citizen/profile" title="View Profile" style={{ textDecoration: 'none' }}>
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #3b82f6',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    border: '3px solid #60a5fa'
                  }}
                >
                  {initials}
                </div>
              )}
            </Link>

            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Citizen Emergency Portal
              </span>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.15rem' }}>
                {user?.full_name || 'Citizen User'}
              </h1>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span>{user?.phone || '+91-9876543221'}</span>
                <span>•</span>
                <Link to="/citizen/profile" style={{ color: '#38bdf8', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Camera size={12} /> Edit Profile Photo
                </Link>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
            <ShieldCheck size={20} color="#34d399" />
            <div style={{ fontSize: '0.8rem', color: '#86efac' }}>
              <strong>Offline-First Active:</strong> Requests saved locally if connection drops.
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid-2">
        <Link
          to="/citizen/emergency"
          style={{ textDecoration: 'none' }}
        >
          <div className="card card-critical" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'transform 0.2s', background: 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.15), var(--bg-card))' }}>
            <div>
              <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'var(--critical-red)', borderRadius: 'var(--radius-md)', color: '#fff', marginBottom: '1rem' }}>
                <AlertCircle size={32} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fca5a5' }}>
                REQUEST EMERGENCY RESCUE
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                Trapped in flooded house, building collapse, medical trauma, severe life threat. Dispatches Police / NDRF Rescue Teams immediately.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 700, marginTop: '1.5rem' }}>
              <span>CREATE EMERGENCY SOS</span>
              <ArrowRight size={18} />
            </div>
          </div>
        </Link>

        <Link
          to="/citizen/resource"
          style={{ textDecoration: 'none' }}
        >
          <div className="card card-high" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'transform 0.2s', background: 'radial-gradient(circle at top right, rgba(249, 115, 22, 0.15), var(--bg-card))' }}>
            <div>
              <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'var(--high-orange)', borderRadius: 'var(--radius-md)', color: '#fff', marginBottom: '1rem' }}>
                <Package size={32} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fdba74' }}>
                REQUEST RELIEF SUPPLIES
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                Essential drinking water, food packets, prescription medicines, first aid supplies. Matches nearest verified community volunteers.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f97316', fontWeight: 700, marginTop: '1.5rem' }}>
              <span>REQUEST RESOURCES</span>
              <ArrowRight size={18} />
            </div>
          </div>
        </Link>
      </div>

      {/* Citizen Active Requests */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>My Help & Rescue Requests</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Live status and assignment tracking</p>
          </div>
          <button onClick={loadRequests} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            Refresh Feed
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading active requests...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={44} color="#10b981" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>No Active Requests</h4>
            <p style={{ marginTop: '0.3rem', fontSize: '0.9rem' }}>
              If you or someone nearby requires immediate emergency rescue or essential relief supplies, use the action buttons above.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {requests.map((req) => (
              <Link
                key={req.id || req.client_local_id}
                to={`/citizen/track/${req.id || req.client_local_id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <PriorityBadge level={req.priority_level} score={req.priority_score} />
                      <StatusBadge status={req.status} />
                      {req.client_local_id && req.is_offline_captured && (
                        <span className="badge badge-status" style={{ borderColor: '#ef4444', color: '#f87171' }}>
                          OFFLINE QUEUED ({req.client_local_id})
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {req.category?.replace(/_/g, ' ').toUpperCase()} — {req.address || 'Bhimavaram'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Users size={14} /> {req.people_count} People affected
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={14} /> {req.latitude.toFixed(4)}, {req.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: 600, fontSize: '0.85rem' }}>
                    <span>Track Status</span>
                    <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { getLocalHistory } from '../../services/offlineStorage';
import { EmergencyRequest } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Package, ArrowRight, ShieldCheck, MapPin, Users, User, Camera, Navigation, Phone, ExternalLink, Building2, ShieldAlert } from 'lucide-react';

export const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Real GPS & Nearby Facilities state
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [policeStations, setPoliceStations] = useState<any[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState<boolean>(false);

  useEffect(() => {
    loadRequests();
    attemptAutoLocation();
  }, []);

  const attemptAutoLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserCoords(coords);
          fetchNearby(coords.lat, coords.lon);
        },
        () => {
          // Keep prompt for user to manually click [Enable Location]
        },
        { timeout: 5000 }
      );
    }
  };

  const handleRequestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserCoords(coords);
        fetchNearby(coords.lat, coords.lon);
      },
      (err) => {
        setLocating(false);
        setLocationError(err.message || 'GPS location permission was denied. Please enable location permissions in your browser.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchNearby = async (lat: number, lon: number) => {
    setLoadingFacilities(true);
    try {
      const data = await api.getNearbyFacilities(lat, lon, 25);
      setHospitals(data.hospitals || []);
      setPoliceStations(data.police_stations || []);
    } catch (err) {
      console.error('Failed to fetch nearby facilities:', err);
    } finally {
      setLoadingFacilities(false);
    }
  };

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
                {user?.full_name || 'Citizen Portal'}
              </h1>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span>{user?.phone || (user?.email ? user.email : 'Guest Session')}</span>
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

      {/* Nearby Emergency Facilities (Hospitals & Police Stations) */}
      <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #38bdf8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
              <Navigation size={14} /> Critical Facilities Radar
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.2rem' }}>
              Nearby Hospitals & Police Stations
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Live PostGIS distance calculation from your verified GPS coordinates.
            </p>
          </div>

          <div>
            {!userCoords ? (
              <button
                onClick={handleRequestLocation}
                disabled={locating}
                className="btn btn-primary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', gap: '0.4rem', background: '#0284c7' }}
              >
                <Navigation size={14} /> {locating ? 'Acquiring GPS...' : 'Enable Location'}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                  📍 {userCoords.lat.toFixed(4)}, {userCoords.lon.toFixed(4)}
                </span>
                <button
                  onClick={() => fetchNearby(userCoords.lat, userCoords.lon)}
                  disabled={loadingFacilities}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  {loadingFacilities ? 'Updating...' : 'Refresh'}
                </button>
              </div>
            )}
          </div>
        </div>

        {locationError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            ⚠️ {locationError}
          </div>
        )}

        {!userCoords ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <Building2 size={36} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Location Services Disabled</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', maxWidth: '450px', margin: '0.25rem auto 1rem' }}>
              Enable your location to automatically find and navigate to the closest emergency hospitals and police stations.
            </p>
            <button
              onClick={handleRequestLocation}
              disabled={locating}
              className="btn btn-primary"
              style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}
            >
              {locating ? 'Acquiring GPS...' : 'Enable Location'}
            </button>
          </div>
        ) : (
          <div className="grid-2">
            {/* Hospitals Section */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <Building2 size={18} color="#ef4444" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Nearby Hospitals</h3>
              </div>

              {loadingFacilities ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Searching nearby medical facilities...</p>
              ) : hospitals.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No nearby hospitals found.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {hospitals.map(h => (
                    <div
                      key={h.id}
                      style={{
                        padding: '0.85rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ fontSize: '0.95rem', color: '#fff' }}>{h.name}</strong>
                        {h.distance_km != null && (
                          <span style={{ fontSize: '0.72rem', background: '#ef4444', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>
                            {h.distance_km} km away
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {h.address}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {h.phone ? (
                          <a
                            href={`tel:${h.phone}`}
                            style={{ color: '#38bdf8', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Phone size={13} /> {h.phone}
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No phone listed</span>
                        )}
                        <Link
                          to={`/admin/gis?lat=${h.latitude}&lon=${h.longitude}`}
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem', gap: '0.25rem' }}
                        >
                          <ExternalLink size={12} /> View on Map
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Police Stations Section */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <ShieldAlert size={18} color="#3b82f6" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Nearby Police Stations</h3>
              </div>

              {loadingFacilities ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Searching nearby police stations...</p>
              ) : policeStations.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No nearby police stations found.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {policeStations.map(p => (
                    <div
                      key={p.id}
                      style={{
                        padding: '0.85rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ fontSize: '0.95rem', color: '#fff' }}>{p.name}</strong>
                        {p.distance_km != null && (
                          <span style={{ fontSize: '0.72rem', background: '#3b82f6', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>
                            {p.distance_km} km away
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {p.address}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {p.phone ? (
                          <a
                            href={`tel:${p.phone}`}
                            style={{ color: '#38bdf8', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Phone size={13} /> {p.phone}
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No phone listed</span>
                        )}
                        <Link
                          to={`/admin/gis?lat=${p.latitude}&lon=${p.longitude}`}
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem', gap: '0.25rem' }}
                        >
                          <ExternalLink size={12} /> View on Map
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
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

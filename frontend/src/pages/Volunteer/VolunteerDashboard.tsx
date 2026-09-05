import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { EmergencyRequest, VolunteerCapability } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/StatusBadge';
import { HeartHandshake, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const VolunteerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Volunteer Profile from authenticated session (with development fallback)
  const [activeVolunteer, setActiveVolunteer] = useState<{
    id: string;
    name: string;
    capabilities: VolunteerCapability[];
    vehicle: string;
  }>(() => ({
    id: (user?.role === 'VOLUNTEER' ? user?.id : null) || 'dev-volunteer-alpha',
    name: (user?.role === 'VOLUNTEER' ? user?.full_name : null) || 'Volunteer Dispatch',
    capabilities: ['MEDICINE', 'FIRST_AID'] as VolunteerCapability[],
    vehicle: 'Two Wheeler'
  }));

  useEffect(() => {
    if (user?.role === 'VOLUNTEER') {
      setActiveVolunteer(prev => ({
        ...prev,
        id: user.id || prev.id,
        name: user.full_name || prev.name
      }));
    }
  }, [user]);

  const availableCaps: VolunteerCapability[] = [
    'MEDICINE',
    'FIRST_AID',
    'FOOD',
    'WATER',
    'TRANSPORTATION',
    'GENERAL_ASSISTANCE',
    'RESCUE_SUPPORT'
  ];

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadRequests = async () => {
    try {
      const list = await api.getRequests({ type: 'RESOURCE' });
      setRequests(list);
    } catch (err) {
      console.error('Error loading volunteer requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCapability = (cap: VolunteerCapability) => {
    setActiveVolunteer(prev => {
      const exists = prev.capabilities.includes(cap);
      const updated = exists
        ? prev.capabilities.filter(c => c !== cap)
        : [...prev.capabilities, cap];
      return { ...prev, capabilities: updated };
    });
  };

  const handleAccept = async (reqId: string) => {
    try {
      await api.volunteerAcceptRequest(activeVolunteer.id, reqId);
      loadRequests();
    } catch (err: any) {
      alert('Error accepting task: ' + err.message);
    }
  };

  const handleMarkDelivered = async (reqId: string) => {
    try {
      await api.updateRequestStatus(reqId, 'RESOLVED', activeVolunteer.name, 'Relief supplies delivered safely');
      loadRequests();
    } catch (err: any) {
      alert('Error marking delivered: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Volunteer Profile & Capability Settings */}
      <div className="card" style={{ padding: '1.5rem', background: 'radial-gradient(circle at top right, rgba(168, 85, 247, 0.1), var(--bg-card))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <HeartHandshake size={16} /> Community Relief Force
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.2rem' }}>
              Volunteer Logistics Portal
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Logged in: <strong>{activeVolunteer.name}</strong> • Vehicle: <strong>{activeVolunteer.vehicle}</strong>
            </p>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Sector: <strong>Bhimavaram Central Relief Zone</strong>
          </div>
        </div>

        {/* My Capabilities Toggle */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            My Active Capabilities (Tasks auto-match based on these tags):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {availableCaps.map((cap) => {
              const isActive = activeVolunteer.capabilities.includes(cap);
              const borderColor = isActive ? '#c084fc' : 'var(--border-color)';
              return (
                <button
                  key={cap}
                  onClick={() => toggleCapability(cap)}
                  style={{
                    background: isActive ? '#a855f7' : 'var(--bg-secondary)',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid ' + borderColor,
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  {isActive ? '✓ ' : '+ '} {cap.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Requests Feed */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Nearby Matching Relief Requests</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              Showing requests filtered for your registered capabilities: <strong>{activeVolunteer.capabilities.join(', ') || 'None selected'}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 700 }}>
              {requests.filter(req => {
                const reqCap = (req.matching?.required_capability || req.requested_resource || req.category || '').toUpperCase();
                return activeVolunteer.capabilities.some(c => reqCap.includes(c) || c.includes(reqCap) || c === 'GENERAL_ASSISTANCE');
              }).length} matching tasks
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading relief requests...</div>
        ) : requests.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
            <HeartHandshake size={48} color="#a855f7" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>No resource requests found</h3>
            <p style={{ marginTop: '0.4rem', fontSize: '0.9rem' }}>Citizen supply requests will appear here dynamically.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {requests.map((req) => {
              const isAssignedToMe = req.assigned_to?.id === activeVolunteer.id;
              const isResolved = req.status === 'RESOLVED';

              // Capability matching check (Rule 11)
              const reqCap = (req.matching?.required_capability || req.requested_resource || req.category || '').toUpperCase();
              const isMatch = activeVolunteer.capabilities.some(c => 
                reqCap.includes(c) || c.includes(reqCap) || c === 'GENERAL_ASSISTANCE'
              );

              // Dynamic distance calculation from Bhimavaram center or matching candidate
              let distanceText = 'Distance unknown';
              if (req.latitude && req.longitude) {
                const vLat = 16.5440;
                const vLon = 81.5230;
                const dLat = (req.latitude - vLat) * Math.PI / 180;
                const dLon = (req.longitude - vLon) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(vLat * Math.PI / 180) * Math.cos(req.latitude * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const dist = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
                distanceText = `~${dist} km away`;
              }

              return (
                <div
                  key={req.id}
                  className={`card card-${req.priority_level.toLowerCase()}`}
                  style={{
                    padding: '1.25rem',
                    opacity: isResolved ? 0.6 : (isMatch ? 1 : 0.55),
                    background: isMatch && !isResolved ? 'rgba(168, 85, 247, 0.05)' : 'var(--bg-card)',
                    borderLeft: isMatch ? '4px solid #a855f7' : '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                        <PriorityBadge level={req.priority_level} score={req.priority_score} />
                        <StatusBadge status={req.status} />
                        <span style={{ fontSize: '0.72rem', background: '#3b82f6', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, textTransform: 'uppercase' }}>
                          SUPPLY NEED: {req.matching?.required_capability || req.requested_resource || req.category}
                        </span>
                        {isMatch ? (
                          <span style={{ fontSize: '0.7rem', background: '#9333ea', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                            ✓ MATCHES YOUR CAPABILITY
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', background: '#475569', color: '#cbd5e1', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}>
                            NOT RECOMMENDED (CAPABILITY MISMATCH)
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                        {req.requested_resource || req.category} — {req.address}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                        Citizen: <strong>{req.citizen_name}</strong> • Affected People: <strong>{req.people_count}</strong>
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', color: isMatch ? '#c084fc' : 'var(--text-muted)', fontWeight: 700 }}>
                        {distanceText}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(req.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {req.description && (
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', margin: '0.85rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      "{req.description}"
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {req.assigned_to ? (
                        <span>Assigned to: <strong style={{ color: '#fff' }}>{req.assigned_to.name}</strong></span>
                      ) : (
                        <span>{isMatch ? 'Ready for volunteer dispatch' : 'Outside your selected skill set'}</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!req.assigned_to && !isResolved && isMatch && (
                        <button
                          onClick={() => handleAccept(req.id)}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', background: '#9333ea' }}
                        >
                          Accept Delivery
                        </button>
                      )}

                      {isAssignedToMe && !isResolved && (
                        <button
                          onClick={() => handleMarkDelivered(req.id)}
                          className="btn btn-success"
                          style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', gap: '0.3rem' }}
                        >
                          <CheckCircle size={14} /> Mark Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

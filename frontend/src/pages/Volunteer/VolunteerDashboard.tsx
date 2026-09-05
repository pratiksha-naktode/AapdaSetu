import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { EmergencyRequest, VolunteerCapability } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/StatusBadge';
import { HeartHandshake, CheckCircle } from 'lucide-react';

export const VolunteerDashboard: React.FC = () => {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Volunteer Profile (Ramesh Varma - Medicine & First Aid)
  const [activeVolunteer, setActiveVolunteer] = useState<{
    id: string;
    name: string;
    capabilities: VolunteerCapability[];
    vehicle: string;
  }>({
    id: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    name: 'Ramesh Varma',
    capabilities: ['MEDICINE', 'FIRST_AID'],
    vehicle: 'Two Wheeler'
  });

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Nearby Matching Relief Requests</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {requests.length} open requests
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading relief requests...</div>
        ) : requests.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
            <HeartHandshake size={48} color="#a855f7" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>No nearby resource requests</h3>
            <p style={{ marginTop: '0.4rem', fontSize: '0.9rem' }}>Matching resource requests will appear here when citizens request assistance.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {requests.map((req) => {
              const isAssignedToMe = req.assigned_to?.id === activeVolunteer.id;
              const isResolved = req.status === 'RESOLVED';

              // Capability matching check
              const reqCategory = (req.category || '').toUpperCase();
              const reqRes = (req.requested_resource || '').toUpperCase();
              const isMatch = activeVolunteer.capabilities.some(c => 
                reqCategory.includes(c) || reqRes.includes(c) || c === 'GENERAL_ASSISTANCE'
              );

              return (
                <div
                  key={req.id}
                  className={`card card-${req.priority_level.toLowerCase()}`}
                  style={{
                    padding: '1.25rem',
                    opacity: isResolved ? 0.6 : 1,
                    background: isMatch && !isResolved ? 'rgba(168, 85, 247, 0.05)' : 'var(--bg-card)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <PriorityBadge level={req.priority_level} score={req.priority_score} />
                        <StatusBadge status={req.status} />
                        {isMatch && (
                          <span style={{ fontSize: '0.7rem', background: '#9333ea', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                            CAPABILITY MATCH
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
                      <div style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 700 }}>
                        ~1.2 km away
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
                        <span>Ready for volunteer dispatch</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!req.assigned_to && !isResolved && (
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

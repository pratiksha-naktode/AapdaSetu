import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { EmergencyRequest, VolunteerCapability } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/StatusBadge';
import { HeartHandshake, CheckCircle, AlertOctagon, X, Send, MapPin, Users, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const VOLUNTEER_ISSUE_TYPES = [
  'Cannot reach location',
  'Need additional volunteer',
  'Need responder assistance',
  'Medical support required',
  'Vehicle/transport problem',
  'Unsafe situation',
  'Insufficient supplies',
  'Other'
];

export const VolunteerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Issue reporting modal state
  const [reportModalReq, setReportModalReq] = useState<EmergencyRequest | null>(null);
  const [issueType, setIssueType] = useState<string>(VOLUNTEER_ISSUE_TYPES[0]);
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);
  const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);

  // Active Volunteer Profile from authenticated session
  const [activeVolunteer, setActiveVolunteer] = useState<{
    id: string;
    name: string;
    capabilities: VolunteerCapability[];
    vehicle: string;
  }>(() => ({
    id: (user?.role === 'VOLUNTEER' ? user?.id : null) || 'dev-volunteer-alpha',
    name: (user?.role === 'VOLUNTEER' ? user?.full_name : null) || 'Volunteer Personnel',
    capabilities: ['MEDICINE', 'FIRST_AID', 'FOOD', 'WATER'] as VolunteerCapability[],
    vehicle: 'Utility Van'
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

  // Acquire user's real GPS coordinates if permitted
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          // Fallback to Bhimavaram town center coordinates if device GPS denied
          setUserCoords({ lat: 16.5449, lon: 81.5212 });
        }
      );
    } else {
      setUserCoords({ lat: 16.5449, lon: 81.5212 });
    }
  }, []);

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

  const handleOpenReportModal = (req: EmergencyRequest) => {
    setReportModalReq(req);
    setIssueType(VOLUNTEER_ISSUE_TYPES[0]);
    setIssueDescription('');
    setReportSuccessMessage(null);
  };

  const handleCloseReportModal = () => {
    setReportModalReq(null);
    setReportSuccessMessage(null);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModalReq) return;

    if (!issueDescription.trim()) {
      alert('Please enter a brief description of the issue.');
      return;
    }

    setSubmittingReport(true);
    try {
      await api.submitTaskReport(reportModalReq.id, {
        reported_by_user_id: user?.id || activeVolunteer.id,
        reporter_name: activeVolunteer.name,
        reporter_role: 'VOLUNTEER',
        issue_type: issueType,
        description: issueDescription.trim(),
        latitude: userCoords?.lat,
        longitude: userCoords?.lon
      });

      setReportSuccessMessage('Issue reported to Disaster Command Center! Admin will review for support or reassignment.');
      setTimeout(() => {
        handleCloseReportModal();
        loadRequests();
      }, 1800);
    } catch (err: any) {
      alert('Failed to report issue: ' + err.message);
    } finally {
      setSubmittingReport(false);
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
              Logged in as: <strong style={{ color: '#fff' }}>{activeVolunteer.name}</strong> • Bhimavaram Flood Sector
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid #a855f7', padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
              ✓ ACTIVE ON DUTY
            </span>
          </div>
        </div>

        {/* Dynamic Capability Toggle Filter */}
        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            YOUR ACTIVE RELIEF CAPABILITIES (Matching Engine filters tasks based on these):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {availableCaps.map(cap => {
              const active = activeVolunteer.capabilities.includes(cap);
              return (
                <button
                  key={cap}
                  onClick={() => toggleCapability(cap)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: active ? '#a855f7' : 'var(--bg-secondary)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${active ? '#9333ea' : 'var(--border-color)'}`
                  }}
                >
                  {active ? '✓ ' : '+ '} {cap.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Available & Assigned Tasks Queue */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            Resource & Relief Tasks ({requests.filter(r => r.status !== 'RESOLVED').length} Active)
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Tasks auto-ranked by priority and capability compatibility
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading available requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#a855f7' }}>
              <HeartHandshake size={28} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>No Active Resource Requests</h3>
            <p style={{ maxWidth: '440px', margin: '0.5rem auto 0', fontSize: '0.85rem' }}>
              No nearby resource requests. Matching resource requests will appear here automatically when citizens request assistance.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {requests.map((req) => {
              const currentUserId = user?.id || activeVolunteer.id;
              const isPrimaryAssigned = (req as any).assigned_to_user_id === currentUserId || req.assigned_to?.id === currentUserId;
              const supportList = (req as any).support_assignments || [];
              const isSupportAssigned = supportList.some((s: any) => s.assigned_to_user_id === currentUserId || s.user_id === currentUserId);
              const isAssignedToMe = isPrimaryAssigned || isSupportAssigned;
              const isResolved = req.status === 'RESOLVED';

              // Capability matching check
              const reqCap = (req.matching?.required_capability || req.requested_resource || req.category || '').toUpperCase();
              const isMatch = activeVolunteer.capabilities.some(c => 
                reqCap.includes(c) || c.includes(reqCap) || c === 'GENERAL_ASSISTANCE'
              );

              // Calculate real distance using acquired coordinates
              let distanceText = 'Distance unknown';
              if (req.latitude && req.longitude && userCoords) {
                const dLat = (Number(req.latitude) - userCoords.lat) * Math.PI / 180;
                const dLon = (Number(req.longitude) - userCoords.lon) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(userCoords.lat * Math.PI / 180) * Math.cos(Number(req.latitude) * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const dist = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
                distanceText = `${dist} km away`;
              }

              return (
                <div
                  key={req.id}
                  className={`card card-${req.priority_level.toLowerCase()}`}
                  style={{
                    padding: '1.25rem',
                    opacity: isResolved ? 0.6 : (isMatch || isAssignedToMe ? 1 : 0.6),
                    background: isAssignedToMe ? 'rgba(168, 85, 247, 0.08)' : (isMatch && !isResolved ? 'rgba(168, 85, 247, 0.03)' : 'var(--bg-card)'),
                    borderLeft: isAssignedToMe ? '5px solid #a855f7' : (isMatch ? '4px solid #a855f7' : '1px solid var(--border-color)')
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                        <PriorityBadge level={req.priority_level} score={req.priority_score} />
                        <StatusBadge status={req.status} />

                        {/* Role Assignment Badge */}
                        {isPrimaryAssigned && (
                          <span style={{ fontSize: '0.72rem', background: '#9333ea', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                            ★ PRIMARY VOLUNTEER
                          </span>
                        )}

                        {isSupportAssigned && (
                          <span style={{ fontSize: '0.72rem', background: '#0284c7', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                            ★ SUPPORT VOLUNTEER
                          </span>
                        )}

                        <span style={{ fontSize: '0.72rem', background: '#3b82f6', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, textTransform: 'uppercase' }}>
                          SUPPLY NEED: {req.matching?.required_capability || req.requested_resource || req.category}
                        </span>

                        {isMatch && !isAssignedToMe && (
                          <span style={{ fontSize: '0.7rem', background: '#9333ea', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                            ✓ MATCHES YOUR CAPABILITY
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                        {req.requested_resource || req.category} — {req.address}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                        Citizen: <strong>{req.citizen_name}</strong> • Affected People: <strong>{req.people_count}</strong>
                        {req.citizen_phone && <span> • Contact: <strong>{req.citizen_phone}</strong></span>}
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

                  {/* Partner / Support Information */}
                  {supportList.length > 0 && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', margin: '0.5rem 0', fontSize: '0.8rem', color: '#93c5fd' }}>
                      <strong>Active Partner Support:</strong> {supportList.map((s: any) => `${s.name} (${s.phone || 'Support'})`).join(', ')}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
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

                      {/* Report Issue / Need Help Button */}
                      {isAssignedToMe && !isResolved && (
                        <button
                          onClick={() => handleOpenReportModal(req)}
                          className="btn btn-outline"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', gap: '0.35rem', color: '#f59e0b', borderColor: '#f59e0b' }}
                        >
                          <AlertOctagon size={14} /> Report Issue / Need Help
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

      {/* Task Issue / Help Request Modal */}
      {reportModalReq && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem', border: '1px solid #f59e0b', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 800 }}>
                <AlertOctagon size={20} /> Request Assistance / Report Task Issue
              </div>
              <button onClick={handleCloseReportModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {reportSuccessMessage ? (
              <div style={{ padding: '1.25rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#86efac', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: '0.9rem' }}>
                {reportSuccessMessage}
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Task: <strong>{reportModalReq.requested_resource || reportModalReq.category}</strong> at {reportModalReq.address}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="issue-type-select">
                    Issue Category
                  </label>
                  <select
                    id="issue-type-select"
                    className="form-input"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                  >
                    {VOLUNTEER_ISSUE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="issue-desc">
                    Detailed Explanation
                  </label>
                  <textarea
                    id="issue-desc"
                    className="form-input"
                    rows={4}
                    placeholder="Describe why you need help or cannot complete delivery (e.g. road submerged, medical assistance required, need additional pair of hands)..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="btn btn-critical"
                    style={{ flex: 1, padding: '0.65rem', fontSize: '0.9rem', gap: '0.4rem' }}
                  >
                    <Send size={15} /> {submittingReport ? 'Submitting Report...' : 'Submit Report to Admin'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseReportModal}
                    className="btn btn-outline"
                    style={{ padding: '0.65rem 1rem', fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;

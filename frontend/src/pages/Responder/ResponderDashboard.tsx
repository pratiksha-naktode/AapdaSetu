import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { EmergencyRequest, Responder } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/StatusBadge';
import { Shield, AlertTriangle, Users, MapPin, CheckCircle, Navigation, Phone, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ResponderDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active responder identity from authenticated session (with development fallback)
  const activeResponder = {
    id: (user?.role === 'RESPONDER' ? user?.id : null) || 'dev-responder-alpha',
    name: (user?.role === 'RESPONDER' ? user?.full_name : null) || 'NDRF Rescue Unit Alpha (Capt. Rajesh)'
  };

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadRequests = async () => {
    try {
      // Filter for EMERGENCY requests
      const list = await api.getRequests({ type: 'EMERGENCY' });
      setRequests(list);
    } catch (err) {
      console.error('Error fetching responder requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (reqId: string) => {
    try {
      await api.assignRequest(reqId, {
        id: activeResponder.id,
        name: activeResponder.name,
        role: 'RESPONDER'
      });
      await api.updateRequestStatus(reqId, 'ACCEPTED', activeResponder.name, 'Unit acknowledged task dispatch');
      loadRequests();
    } catch (err: any) {
      alert('Failed to accept request: ' + err.message);
    }
  };

  const handleStatusChange = async (reqId: string, newStatus: string) => {
    try {
      await api.updateRequestStatus(reqId, newStatus, activeResponder.name);
      loadRequests();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const criticalCount = requests.filter(r => r.priority_level === 'CRITICAL' && r.status !== 'RESOLVED').length;
  const highCount = requests.filter(r => r.priority_level === 'HIGH' && r.status !== 'RESOLVED').length;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <Shield size={16} /> Operational Dispatch
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.2rem' }}>
            Responder Emergency Queue
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Logged in as: <strong>{activeResponder.name}</strong> • Bhimavaram Flood Sector
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ background: 'var(--critical-bg)', border: '1px solid var(--critical-border)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fca5a5' }}>{criticalCount}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>CRITICAL</div>
          </div>
          <div style={{ background: 'var(--high-bg)', border: '1px solid var(--high-border)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fdba74' }}>{highCount}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fb923c', textTransform: 'uppercase' }}>HIGH</div>
          </div>
          <Link to="/admin/gis" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            View GIS Map <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Triage Queue List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading triage queue...</div>
        ) : requests.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
            <Shield size={48} color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>No active emergency requests</h3>
            <p style={{ marginTop: '0.4rem', fontSize: '0.9rem' }}>New emergency requests will appear here automatically.</p>
          </div>
        ) : (
          requests.map((req) => {
            const isAssignedToMe = req.assigned_to?.id === activeResponder.id;
            const isResolved = req.status === 'RESOLVED';

            return (
              <div
                key={req.id}
                className={`card card-${req.priority_level.toLowerCase()}`}
                style={{
                  padding: '1.5rem',
                  opacity: isResolved ? 0.6 : 1,
                  transition: 'all 0.2s',
                  background: req.priority_level === 'CRITICAL' && !isResolved
                    ? 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.1), var(--bg-card))'
                    : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <PriorityBadge level={req.priority_level} score={req.priority_score} />
                      <StatusBadge status={req.status} />
                      <span style={{ fontSize: '0.72rem', background: '#3b82f6', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {req.request_type || 'EMERGENCY'}
                      </span>
                      <span style={{ fontSize: '0.72rem', background: '#0284c7', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                        CAPABILITY: {req.matching?.required_capability || 'RESCUE_SUPPORT'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        #{req.id.slice(0, 8)} • {new Date(req.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                      {req.category?.replace(/_/g, ' ').toUpperCase()} — {req.address}
                    </h2>
                  </div>

                  {/* Context Metrics */}
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Users size={16} color="#38bdf8" /> <strong>{req.people_count}</strong> People
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={16} color="#f59e0b" /> {req.latitude.toFixed(4)}, {req.longitude.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* AI Priority & Matching Intelligence Card */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', margin: '1rem 0' }}>
                  {/* AI Triage Reason */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Priority Engine Assessment
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {req.priority_reason || 'Standard priority response required'}
                    </p>
                    {req.description && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.4rem', fontStyle: 'italic' }}>
                        "{req.description}"
                      </p>
                    )}
                  </div>

                  {/* Rule-Based Matching Recommendation */}
                  <div style={{ background: 'rgba(56, 189, 248, 0.05)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                        Matching Engine Recommendation
                      </span>
                      {req.matching?.recommended_candidate ? (
                        <span style={{ fontSize: '0.72rem', background: '#0284c7', color: '#fff', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontWeight: 800 }}>
                          Score: {req.matching.recommended_candidate.matching_score}/95
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 700 }}>
                          No Match
                        </span>
                      )}
                    </div>

                    {req.matching?.recommended_candidate ? (
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                          {req.matching.recommended_candidate.name}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span>Type: <strong style={{ color: '#e2e8f0' }}>{req.matching.recommended_candidate.type || req.matching.recommended_type}</strong></span>
                          <span>•</span>
                          <span>Distance: <strong style={{ color: '#38bdf8' }}>{req.matching.recommended_candidate.distance_km != null ? `${req.matching.recommended_candidate.distance_km} km` : 'N/A'}</strong></span>
                        </div>

                        {/* Transparent Scoring Breakdown */}
                        {req.matching.recommended_candidate.score_breakdown && (
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.68rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                              Capability: +{req.matching.recommended_candidate.score_breakdown.capability}
                            </span>
                            <span style={{ fontSize: '0.68rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                              Available: +{req.matching.recommended_candidate.score_breakdown.availability}
                            </span>
                            <span style={{ fontSize: '0.68rem', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                              Distance: +{req.matching.recommended_candidate.score_breakdown.distance}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.2rem' }}>
                        {req.matching?.message || 'No suitable available responder found.'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions & Assignment Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {req.assigned_to ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle size={15} color="#4ade80" />
                        <span>Assigned to: <strong style={{ color: '#fff' }}>{req.assigned_to.name}</strong></span>
                      </div>
                    ) : (
                      <span style={{ color: '#facc15' }}>⚠️ Unassigned — Immediate action recommended</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {!req.assigned_to && !isResolved && (
                      <>
                        {req.matching?.recommended_candidate && (
                          <button
                            onClick={async () => {
                              try {
                                const cand = req.matching!.recommended_candidate!;
                                await api.assignRequest(req.id, {
                                  id: cand.id,
                                  name: cand.name,
                                  role: 'RESPONDER'
                                });
                                loadRequests();
                              } catch (err: any) {
                                alert('Assignment failed: ' + err.message);
                              }
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', background: '#0284c7' }}
                          >
                            Assign Recommended ({req.matching.recommended_candidate.name.split(' ')[0]})
                          </button>
                        )}
                        <button
                          onClick={() => handleAccept(req.id)}
                          className="btn btn-critical"
                          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                        >
                          Accept Task
                        </button>
                      </>
                    )}

                    {isAssignedToMe && req.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleStatusChange(req.id, 'ON_THE_WAY')}
                        className="btn btn-primary"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', gap: '0.3rem' }}
                      >
                        <Navigation size={14} /> Mark On The Way
                      </button>
                    )}

                    {isAssignedToMe && req.status === 'ON_THE_WAY' && (
                      <button
                        onClick={() => handleStatusChange(req.id, 'RESOLVED')}
                        className="btn btn-success"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', gap: '0.3rem' }}
                      >
                        <CheckCircle size={14} /> Mark Rescued & Resolved
                      </button>
                    )}

                    {!isResolved && (
                      <button
                        onClick={() => handleStatusChange(req.id, 'RESOLVED')}
                        className="btn btn-outline"
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        Force Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

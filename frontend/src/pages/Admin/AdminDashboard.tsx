import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { EmergencyRequest, DashboardStats, DisasterEvent, Responder, Volunteer } from '../../types';
import { GISMap } from './GISMap';
import { PriorityBadge, StatusBadge } from '../../components/common/StatusBadge';
import { ShieldAlert, Users, HeartHandshake, CheckCircle2, AlertTriangle, Layers, Radio, PhoneCall, RefreshCw, AlertOctagon, UserPlus, UserCheck, X } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [event, setEvent] = useState<DisasterEvent | null>(null);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [taskReports, setTaskReports] = useState<any[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter state
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  // Modal states for multi-personnel assignment / reassign
  const [actionModal, setActionModal] = useState<{
    type: 'SUPPORT' | 'REASSIGN';
    requestId: string;
    request?: EmergencyRequest;
    reportId?: string;
    issueType?: string;
    candidateMode?: 'RESPONDER' | 'VOLUNTEER';
  } | null>(null);

  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [actionProcessing, setActionProcessing] = useState<boolean>(false);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      const [s, ev, reqs, resps, vols, reps] = await Promise.all([
        api.getStats(),
        api.getDisasterEvent(),
        api.getRequests(),
        api.getResponders(),
        api.getVolunteers(),
        api.getTaskReports().catch(() => [])
      ]);
      setStats(s);
      setEvent(ev);
      setRequests(reqs);
      setResponders(resps);
      setVolunteers(vols);
      setTaskReports(reps);

      // Fetch SMS notifications audit
      try {
        const notifRes = await fetch('http://localhost:5000/api/notifications');
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setNotificationLogs(notifData.notifications || []);
        }
      } catch {}
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeReport = async (reportId: string) => {
    try {
      await api.updateTaskReportStatus(reportId, 'ACKNOWLEDGED');
      loadAllData();
    } catch (err: any) {
      alert('Failed to acknowledge report: ' + err.message);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await api.updateTaskReportStatus(reportId, 'RESOLVED');
      loadAllData();
    } catch (err: any) {
      alert('Failed to resolve report: ' + err.message);
    }
  };

  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getFilteredActionCandidates = (mode: 'RESPONDER' | 'VOLUNTEER', request?: EmergencyRequest) => {
    if (mode === 'RESPONDER') {
      return responders
        .filter(r => r.is_available && (r.active_assignments_count ?? 0) < 4)
        .sort((a, b) => {
          const aDist = request ? getDistanceKm(request.latitude, request.longitude, a.latitude, a.longitude) : 0;
          const bDist = request ? getDistanceKm(request.latitude, request.longitude, b.latitude, b.longitude) : 0;
          return aDist - bDist;
        });
    }

    return volunteers
      .filter(v => v.is_available)
      .sort((a, b) => {
        const aDist = request ? getDistanceKm(request.latitude, request.longitude, a.latitude, a.longitude) : 0;
        const bDist = request ? getDistanceKm(request.latitude, request.longitude, b.latitude, b.longitude) : 0;
        return aDist - bDist;
      });
  };

  const handleOpenSupportModal = (requestId: string, reportId?: string, issueType?: string) => {
    const req = requests.find(r => r.id === requestId);
    const mode = issueType === 'Need Volunteer' ? 'VOLUNTEER' : 'RESPONDER';
    setActionModal({ type: 'SUPPORT', requestId, request: req, reportId, issueType, candidateMode: mode });
    setSelectedPersonnelId('');
    setReassignReason('');
  };

  const handleOpenReassignModal = (requestId: string, reportId?: string) => {
    const req = requests.find(r => r.id === requestId);
    setActionModal({ type: 'REASSIGN', requestId, request: req, reportId, candidateMode: 'RESPONDER' });
    setSelectedPersonnelId('');
    setReassignReason('');
  };

  const handleExecutePersonnelAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal || !selectedPersonnelId) return;

    setActionProcessing(true);
    try {
      const resp = responders.find(r => r.id === selectedPersonnelId);
      const vol = volunteers.find(v => v.id === selectedPersonnelId);

      const candidate = resp ? {
        user_id: resp.id,
        name: resp.name,
        role: 'RESPONDER',
        phone: resp.phone
      } : vol ? {
        user_id: vol.id,
        name: vol.name,
        role: 'VOLUNTEER',
        phone: vol.phone
      } : null;

      if (!candidate) {
        alert('Selected personnel not found');
        return;
      }

      if (actionModal.type === 'SUPPORT') {
        await api.assignSupport(actionModal.requestId, candidate.user_id, candidate.role, 'Admin');
        if (actionModal.reportId) {
          await api.updateTaskReportStatus(actionModal.reportId, 'RESOLVED', 'ADMIN');
        }
        alert(`${candidate.role === 'RESPONDER' ? 'Responder' : 'Volunteer'} ${candidate.name} assigned successfully!`);
      } else {
        await api.reassignTask(
          actionModal.requestId,
          candidate.user_id,
          candidate.role,
          reassignReason || 'Admin manual task reassignment from Command Center',
          'Admin'
        );
        if (actionModal.reportId) {
          await api.updateTaskReportStatus(actionModal.reportId, 'RESOLVED', 'ADMIN');
        }
        alert(`Task reassigned to ${candidate.name} as PRIMARY!`);
      }

      setActionModal(null);
      loadAllData();
    } catch (err: any) {
      alert('Action failed: ' + err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleQuickAssign = async (requestId: string, responderId: string) => {
    const resp = responders.find(r => r.id === responderId);
    if (!resp) return;

    try {
      await api.assignRequest(requestId, {
        id: resp.id,
        name: resp.name,
        role: 'RESPONDER'
      });
      loadAllData();
    } catch (err: any) {
      alert('Assignment failed: ' + err.message);
    }
  };

  const filteredRequests = filterPriority === 'ALL'
    ? requests
    : requests.filter(r => r.priority_level === filterPriority);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b, #090d16)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <Radio size={14} className="spin" color="#ef4444" /> LIVE DISTRICT COMMAND ROOM • DDMA
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: '0.2rem' }}>
            {event?.name || 'Heavy Flooding — Bhimavaram'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Multi-Agency Triage & GIS Coordination • PostGIS Spatial Indexing Active
          </p>
        </div>

        <button
          onClick={loadAllData}
          className="btn btn-outline"
          style={{ gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} /> Refresh Telemetry
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-4">
        <div className="card" style={{ borderLeft: '4px solid #ef4444', background: 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.1), var(--bg-card))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>CRITICAL REQUESTS</span>
            <AlertTriangle size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fca5a5', marginTop: '0.4rem' }}>
            {stats?.critical_requests ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Urgent life-threat rescues</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f97316' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fb923c', textTransform: 'uppercase' }}>HIGH PRIORITY</span>
            <ShieldAlert size={18} color="#f97316" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fdba74', marginTop: '0.4rem' }}>
            {stats?.high_requests ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Medicine & elderly aid</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>ACTIVE RESPONDERS</span>
            <Users size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#93c5fd', marginTop: '0.4rem' }}>
            {stats?.active_responders ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NDRF, Police & Medical EMS</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>RESOLVED / RESCUED</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#86efac', marginTop: '0.4rem' }}>
            {stats?.resolved_requests ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed missions</div>
        </div>
      </div>

      {/* GIS Command Map */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Spatial Tactical Command (GIS)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Real-time PostGIS coordinates for emergency requests, responders, volunteers, and relief facilities.
            </p>
          </div>
        </div>
        <GISMap />
      </div>

      {/* Task Help & Field Escalation Reports */}
      <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <AlertOctagon size={18} /> Field Help & Issue Reports ({taskReports.length})
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.2rem' }}>
              Personnel Support & Task Escalation Queue
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Real-time barriers, medical needs, access obstacles, or backup requests reported by field Responders and Volunteers.
            </p>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Open issues: <strong>{taskReports.filter(r => r.status === 'OPEN').length}</strong>
          </div>
        </div>

        {taskReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>All field teams operating smoothly</p>
            <p style={{ fontSize: '0.8rem' }}>No pending issue reports or help requests from field personnel.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {taskReports.map((rep) => {
              const isOpen = rep.status === 'OPEN';
              const isAck = rep.status === 'ACKNOWLEDGED';
              const isResolved = rep.status === 'RESOLVED';

              return (
                <div
                  key={rep.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${isOpen ? '#f59e0b' : isAck ? '#38bdf8' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.85rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        background: isOpen ? '#f59e0b' : isAck ? '#0284c7' : '#10b981',
                        color: isOpen ? '#000' : '#fff',
                        textTransform: 'uppercase'
                      }}>
                        {rep.status}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(rep.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                      {rep.issue_type}
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                      "{rep.description}"
                    </p>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span>Reported by: <strong style={{ color: '#e2e8f0' }}>{rep.reporter_name}</strong> ({rep.reporter_role})</span>
                      <span>•</span>
                      <span>Task: <strong style={{ color: '#38bdf8' }}>#{rep.request_id?.slice(0, 8)}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
                    {isOpen && (
                      <button
                        onClick={() => handleAcknowledgeReport(rep.id)}
                        className="btn btn-outline"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Acknowledge
                      </button>
                    )}

                    {rep.issue_type === 'Need Another Responder' && (
                      <button
                        onClick={() => handleOpenSupportModal(rep.request_id, rep.id, rep.issue_type)}
                        className="btn btn-primary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem', background: '#0284c7' }}
                      >
                        <UserPlus size={12} /> Assign Another Responder
                      </button>
                    )}

                    {rep.issue_type === 'Need Volunteer' && (
                      <button
                        onClick={() => handleOpenSupportModal(rep.request_id, rep.id, rep.issue_type)}
                        className="btn btn-primary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem', background: '#10b981' }}
                      >
                        <UserPlus size={12} /> Assign Volunteer
                      </button>
                    )}

                    {rep.issue_type === 'Cannot Handle Emergency' && (
                      <button
                        onClick={() => handleOpenReassignModal(rep.request_id, rep.id)}
                        className="btn btn-outline"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem' }}
                      >
                        <UserCheck size={12} /> Reassign Emergency
                      </button>
                    )}

                    {(rep.issue_type === 'Need Another Responder' || rep.issue_type === 'Need Volunteer' || rep.issue_type === 'Cannot Handle Emergency') && (
                      <button
                        onClick={() => handleAcknowledgeReport(rep.id)}
                        className="btn btn-outline"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Acknowledge
                      </button>
                    )}

                    {!isResolved && (
                      <button
                        onClick={() => handleResolveReport(rep.id)}
                        className="btn btn-success"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Priority Queue & Dispatch Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Intelligent Priority Queue</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Ranked descending by AI Priority Score (0–100) • Automatic Volunteer Matching & Support Telemetry
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                style={{
                  background: filterPriority === p ? 'var(--rescue-blue)' : 'var(--bg-secondary)',
                  color: filterPriority === p ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
            <Layers size={44} color="#64748b" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>No requests available</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.35rem' }}>Requests created by citizens will appear here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>PRIORITY</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>TYPE / CATEGORY</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>LOCATION / ADDRESS</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>PEOPLE</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>AI RATIONALE</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>STATUS</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>ASSIGNMENT & PERSONNEL</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const supportList = (req as any).support_assignments || [];
                  const isAuto = (req as any).assignment_method === 'AUTO_NEAREST';

                  return (
                    <tr
                      key={req.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: req.priority_level === 'CRITICAL' && req.status !== 'RESOLVED' ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <PriorityBadge level={req.priority_level} score={req.priority_score} />
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span>{req.category?.replace(/_/g, ' ').toUpperCase()}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{req.request_type}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', maxWidth: '200px', color: 'var(--text-secondary)' }}>
                        {req.address || `${req.latitude.toFixed(3)}, ${req.longitude.toFixed(3)}`}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                        {req.people_count}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', maxWidth: '240px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {req.priority_reason}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <StatusBadge status={req.status} />
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', minWidth: '220px' }}>
                        {req.assigned_to ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {isAuto && (
                                <span style={{ fontSize: '0.65rem', background: '#9333ea', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>
                                  AUTO — NEAREST
                                </span>
                              )}
                              <span style={{ color: '#93c5fd', fontWeight: 700 }}>
                                {req.assigned_to.name}
                              </span>
                            </div>

                            {(req as any).assignment_explanation && (
                              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.3, background: 'rgba(255,255,255,0.03)', padding: '0.3rem', borderRadius: '4px' }}>
                                {(req as any).assignment_explanation}
                              </div>
                            )}

                            {supportList.length > 0 && (
                              <div style={{ fontSize: '0.72rem', color: '#6ee7b7' }}>
                                <strong>+ Support:</strong> {supportList.map((s: any) => s.name).join(', ')}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
                              <button
                                onClick={() => handleOpenSupportModal(req.id)}
                                className="btn btn-outline"
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem' }}
                              >
                                + Support
                              </button>
                              <button
                                onClick={() => handleOpenReassignModal(req.id)}
                                className="btn btn-outline"
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem' }}
                              >
                                Reassign
                              </button>
                            </div>
                          </div>
                        ) : (
                          <select
                            onChange={(e) => handleQuickAssign(req.id, e.target.value)}
                            className="form-select"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}
                            defaultValue=""
                          >
                            <option value="" disabled>Assign Responder...</option>
                            {responders.map((r) => (
                              <option key={r.id} value={r.id}>{r.name} ({r.responder_type})</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SMS Alert Telemetry (Twilio Audit Trail) */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <PhoneCall size={18} color="#10b981" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Emergency SMS Notifications Dispatch Log (Twilio)</h3>
        </div>
        {notificationLogs.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            No SMS alerts triggered yet. Critical & High requests automatically dispatch SMS alerts to field responders.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
            {notificationLogs.slice(0, 5).map((log) => (
              <div key={log.id} style={{ background: 'var(--bg-secondary)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#f87171' }}>[{log.priorityLevel}]</span> {log.message}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                  To: {log.recipientPhone} ({log.provider})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal: Support or Reassign */}
      {actionModal && (
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
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: actionModal.type === 'SUPPORT' ? '#38bdf8' : '#f59e0b', fontWeight: 800 }}>
                {actionModal.type === 'SUPPORT' ? <UserPlus size={20} /> : <UserCheck size={20} />}
                <span style={{ fontSize: '1.15rem' }}>
                  {actionModal.type === 'SUPPORT' ? 'Assign Support Personnel' : 'Reassign Task (Primary)'}
                </span>
              </div>
              <button
                onClick={() => setActionModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExecutePersonnelAction}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Target Task
                </label>
                <div style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <strong>#{actionModal.requestId.slice(0, 8)}</strong>
                  {actionModal.request && ` — ${actionModal.request.category?.replace(/_/g, ' ')} (${actionModal.request.address})`}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  {actionModal?.candidateMode === 'RESPONDER' ? 'Select Available Responder' : 'Select Available Volunteer'}
                </label>
                <select
                  value={selectedPersonnelId}
                  onChange={(e) => setSelectedPersonnelId(e.target.value)}
                  className="form-input"
                  required
                  style={{ width: '100%', padding: '0.6rem' }}
                >
                  <option value="" disabled>
                    {actionModal?.candidateMode === 'RESPONDER'
                      ? '-- Select another responder --'
                      : '-- Select available volunteer --'}
                  </option>
                  {(actionModal?.candidateMode === 'RESPONDER' ? getFilteredActionCandidates('RESPONDER', actionModal.request) : getFilteredActionCandidates('VOLUNTEER', actionModal.request)).map((person: any) => (
                    <option key={person.id} value={person.id}>
                      {person.name} ({person.responder_type || person.capabilities?.join(', ') || 'Volunteer'}) • {person.is_available ? 'Available' : 'Busy'} • {actionModal?.request ? `${Math.round(getDistanceKm(actionModal.request.latitude, actionModal.request.longitude, person.latitude, person.longitude))} km away` : 'Nearby'}
                    </option>
                  ))}
                </select>
                {((actionModal?.candidateMode === 'RESPONDER' && getFilteredActionCandidates('RESPONDER', actionModal.request).length === 0) || (actionModal?.candidateMode === 'VOLUNTEER' && getFilteredActionCandidates('VOLUNTEER', actionModal.request).length === 0)) && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#fca5a5' }}>
                    No eligible {actionModal?.candidateMode === 'RESPONDER' ? 'responders' : 'volunteers'} are available right now.
                  </div>
                )}
              </div>

              {actionModal.type === 'REASSIGN' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Reassignment Rationale
                  </label>
                  <input
                    type="text"
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    placeholder="e.g. Field issue reported: road blocked / responder reassigned"
                    className="form-input"
                    style={{ width: '100%', padding: '0.6rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="btn btn-outline"
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing || !selectedPersonnelId}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.25rem' }}
                >
                  {actionProcessing ? 'Processing...' : actionModal.type === 'SUPPORT' ? 'Confirm Support' : 'Confirm Reassign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

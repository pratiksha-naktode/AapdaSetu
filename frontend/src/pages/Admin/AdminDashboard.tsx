import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { EmergencyRequest, DashboardStats, DisasterEvent, Responder, Volunteer } from '../../types';
import { GISMap } from './GISMap';
import { PriorityBadge, StatusBadge } from '../../components/common/StatusBadge';
import { ShieldAlert, Users, HeartHandshake, CheckCircle2, AlertTriangle, Layers, Radio, PhoneCall, RefreshCw } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [event, setEvent] = useState<DisasterEvent | null>(null);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter state
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      const [s, ev, reqs, resps, vols] = await Promise.all([
        api.getStats(),
        api.getDisasterEvent(),
        api.getRequests(),
        api.getResponders(),
        api.getVolunteers()
      ]);
      setStats(s);
      setEvent(ev);
      setRequests(reqs);
      setResponders(resps);
      setVolunteers(vols);

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

      {/* Priority Queue & Dispatch Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Intelligent Priority Queue</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Ranked descending by AI Priority Score (0–100)
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
                  <th style={{ padding: '0.75rem 0.5rem' }}>ASSIGN TO</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
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
                      {req.category?.replace(/_/g, ' ').toUpperCase()}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', maxWidth: '200px', color: 'var(--text-secondary)' }}>
                      {req.address || `${req.latitude.toFixed(3)}, ${req.longitude.toFixed(3)}`}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                      {req.people_count}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', maxWidth: '260px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {req.priority_reason}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <StatusBadge status={req.status} />
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {req.assigned_to ? (
                        <span style={{ color: '#93c5fd', fontWeight: 600 }}>{req.assigned_to.name}</span>
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
                ))}
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
    </div>
  );
};

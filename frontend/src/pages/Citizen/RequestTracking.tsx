import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { EmergencyRequest } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/StatusBadge';
import { ShieldAlert, ArrowLeft, Phone, MapPin, Users, CheckCircle2, Clock, Navigation } from 'lucide-react';

export const RequestTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<EmergencyRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) loadData(id);
    const interval = setInterval(() => {
      if (id) loadData(id);
    }, 4000);
    return () => clearInterval(interval);
  }, [id]);

  const loadData = async (reqId: string) => {
    try {
      const data = await api.getRequestById(reqId);
      setRequest(data.request);
    } catch {
      // Check local storage for offline requests
      const { getLocalHistory } = await import('../../services/offlineStorage');
      const local = await getLocalHistory();
      const found = local.find(r => r.id === reqId || r.client_local_id === reqId);
      if (found) setRequest(found as EmergencyRequest);
    } finally {
      setLoading(false);
    }
  };

  const formatStatusLabel = (status?: string) => {
    if (!status) return 'Unknown';
    if (status === 'ACCEPTED') return 'Responder Accepted';
    return status.replace(/_/g, ' ');
  };

  const steps = [
    { key: 'PENDING', label: 'Logged' },
    { key: 'PRIORITIZED', label: 'Prioritized' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'ON_THE_WAY', label: 'On The Way' },
    { key: 'RESOLVED', label: 'Rescued / Delivered' }
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'PRIORITIZED': return 1;
      case 'ASSIGNED': return 2;
      case 'ACCEPTED': return 3;
      case 'ON_THE_WAY': return 4;
      case 'RESCUE_IN_PROGRESS':
      case 'DELIVERY_IN_PROGRESS': return 4;
      case 'RESOLVED': return 5;
      default: return 0;
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading tracking details...</div>;
  }

  if (!request) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <p>Request not found.</p>
        <Link to="/citizen" className="btn btn-outline" style={{ marginTop: '1rem' }}>Back to Dashboard</Link>
      </div>
    );
  }

  const currentStepIdx = getStepIndex(request.status);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/citizen" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Request ID: {request.id?.slice(0, 8) || request.client_local_id}
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.2rem' }}>
              {request.category?.replace('_', ' ').toUpperCase()}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{request.address}</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <PriorityBadge level={request.priority_level} score={request.priority_score} />
            <StatusBadge status={request.status} />
          </div>
        </div>

        {/* Real-Time Step Progress Tracker */}
        <div style={{ margin: '2.5rem 0 2rem' }}>
          <div className="step-tracker">
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStepIdx;
              const isActive = idx === currentStepIdx;
              return (
                <div
                  key={step.key}
                  className={`step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                >
                  <div className="step-circle">
                    {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <div className="step-title">{step.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Explanation Box */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            Priority Engine Assessment
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {request.priority_reason || 'Evaluating factors...'}
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Recommended: <strong>{request.recommended_responder}</strong></span>
            <span>People Affected: <strong>{request.people_count}</strong></span>
            <span>Trapped: <strong>{request.trapped ? 'Yes' : 'No'}</strong></span>
          </div>
        </div>

        {/* Assigned Responder / Volunteer Card */}
        {request.assigned_to ? (
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase' }}>
                Assigned Emergency Personnel
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
                {request.assigned_to.name}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Status: <strong>{formatStatusLabel(request.status)}</strong>
              </div>
            </div>

            <button
              onClick={() => alert(`Connecting call to responder: +91-9876543201 (NDRF Dispatch)`)}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}
            >
              <Phone size={16} /> Contact Responder
            </button>
          </div>
        ) : (
          <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#fde047' }}>
            ⏳ Currently in Central Command Queue. Dispatch officer is assigning the closest unit in Bhimavaram.
          </div>
        )}

        {/* Location & Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Location:</span>
            <p style={{ color: '#fff', fontWeight: 600 }}>{request.latitude.toFixed(4)}° N, {request.longitude.toFixed(4)}° E</p>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Logged At:</span>
            <p style={{ color: '#fff', fontWeight: 600 }}>{new Date(request.created_at).toLocaleTimeString()}</p>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Request Type:</span>
            <p style={{ color: '#fff', fontWeight: 600 }}>{request.request_type}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

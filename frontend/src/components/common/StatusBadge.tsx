import React from 'react';
import { PriorityLevel, RequestStatus } from '../../types';
import { AlertTriangle, Clock, CheckCircle, Navigation, Shield, HeartHandshake } from 'lucide-react';

interface PriorityBadgeProps {
  level: PriorityLevel;
  score?: number;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ level, score }) => {
  const badgeClass = `badge badge-${level.toLowerCase()}`;
  return (
    <span className={badgeClass}>
      <AlertTriangle size={12} />
      {level} {score !== undefined ? `(${score})` : ''}
    </span>
  );
};

interface StatusBadgeProps {
  status: RequestStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'PENDING':
      return (
        <span className="badge badge-status" style={{ borderColor: '#facc15', color: '#facc15' }}>
          <Clock size={12} /> PENDING
        </span>
      );
    case 'PRIORITIZED':
      return (
        <span className="badge badge-status" style={{ borderColor: '#3b82f6', color: '#93c5fd' }}>
          <Shield size={12} /> PRIORITIZED
        </span>
      );
    case 'ASSIGNED':
      return (
        <span className="badge badge-status" style={{ borderColor: '#a855f7', color: '#d8b4fe' }}>
          <HeartHandshake size={12} /> ASSIGNED
        </span>
      );
    case 'ACCEPTED':
      return (
        <span className="badge badge-status" style={{ borderColor: '#38bdf8', color: '#7dd3fc' }}>
          <Navigation size={12} /> RESPONDER ACCEPTED
        </span>
      );
    case 'ON_THE_WAY':
      return (
        <span className="badge badge-status" style={{ borderColor: '#f97316', color: '#fdba74', animation: 'pulse-orange 2s infinite' }}>
          <Navigation size={12} /> ON THE WAY
        </span>
      );
    case 'RESCUE_IN_PROGRESS':
    case 'DELIVERY_IN_PROGRESS':
      return (
        <span className="badge badge-status" style={{ borderColor: '#ec4899', color: '#f472b6' }}>
          <Clock size={12} /> IN PROGRESS
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="badge badge-low">
          <CheckCircle size={12} /> RESOLVED
        </span>
      );
    default:
      return <span className="badge badge-status">{status}</span>;
  }
};

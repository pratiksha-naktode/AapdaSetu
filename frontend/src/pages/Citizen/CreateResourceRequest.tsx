import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Package, Droplet, Pill, Bandage, Milk, CheckCircle2 } from 'lucide-react';

interface Props {
  isSimulatedOffline: boolean;
}

export const CreateResourceRequest: React.FC<Props> = ({ isSimulatedOffline }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [resourceType, setResourceType] = useState<string>('medicine');
  const [requestedResource, setRequestedResource] = useState<string>('');
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [elderlyPresent, setElderlyPresent] = useState<boolean>(false);
  const [childPresent, setChildPresent] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');

  // Location defaults
  const [latitude, setLatitude] = useState<number>(16.5449);
  const [longitude, setLongitude] = useState<number>(81.5212);
  const [address, setAddress] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<any>(null);

  const resourcePresets = [
    { id: 'medicine', label: 'Medicines / Insulin', icon: Pill, def: 'Prescription Medicine / Insulin' },
    { id: 'water', label: 'Drinking Water', icon: Droplet, def: 'Clean Drinking Water (20L Cans)' },
    { id: 'food', label: 'Food / Rations', icon: Package, def: 'Cooked Meal Packets & Biscuits' },
    { id: 'first_aid', label: 'First Aid Supplies', icon: Bandage, def: 'Antiseptic & Bandages' },
    { id: 'baby_food', label: 'Baby Food / Supplies', icon: Milk, def: 'Infant Formula & Diapers' }
  ];

  const handleSelectPreset = (p: typeof resourcePresets[0]) => {
    setResourceType(p.id);
    if (!requestedResource) {
      setRequestedResource(p.def);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      citizen_id: user?.id,
      citizen_name: user?.full_name || 'Citizen User',
      citizen_phone: user?.phone || '+919999999999',
      request_type: 'RESOURCE' as const,
      category: resourceType,
      requested_resource: requestedResource || resourceType,
      people_count: Number(peopleCount),
      elderly_present: elderlyPresent,
      child_present: childPresent,
      trapped: false,
      injured: false,
      medical_emergency: resourceType === 'medicine',
      life_threat: false,
      description,
      latitude,
      longitude,
      address
    };

    try {
      if (isSimulatedOffline) {
        const { queueOfflineRequest } = await import('../../services/offlineStorage');
        const queued = await queueOfflineRequest(payload);
        setFeedback({
          type: 'offline',
          requestId: queued.client_local_id,
          reason: 'Captured offline in local IndexedDB. Will auto-sync when online.'
        });
      } else {
        const result = await api.submitResourceRequest(payload);
        setFeedback({
          type: result.isOfflineQueued ? 'offline' : 'online',
          requestId: result.request.id || result.request.client_local_id,
          priorityLevel: result.request.priority_level,
          priorityScore: result.request.priority_score,
          reason: result.request.priority_reason
        });
      }
    } catch (err: any) {
      alert('Error creating resource request: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (feedback) {
    return (
      <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(249, 115, 22, 0.2)', border: '2px solid #f97316', borderRadius: '50%', marginBottom: '1.25rem' }}>
            <CheckCircle2 size={48} color="#f97316" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fdba74' }}>
            RESOURCE REQUEST LOGGED
          </h2>
          <div style={{ margin: '1rem 0' }}>
            <span className={`badge badge-${feedback.priorityLevel?.toLowerCase() || 'high'}`} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
              PRIORITY: {feedback.priorityLevel || 'HIGH'} ({feedback.priorityScore || 70}/100)
            </span>
          </div>
          <p style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', margin: '1rem 0', color: 'var(--text-secondary)' }}>
            <strong>Triage Assessment:</strong> {feedback.reason || 'Matched with nearest available volunteer based on required resource capability.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            <button onClick={() => navigate(`/citizen/track/${feedback.requestId}`)} className="btn btn-primary">
              Track Status
            </button>
            <button onClick={() => navigate('/citizen')} className="btn btn-outline">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <div className="card card-high" style={{ padding: '2rem' }}>
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f97316', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
            <Package size={18} /> Relief Supplies & Aid
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
            Request Relief Resources
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Connect with verified local volunteers and distribution shelters for water, food, and medicine.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Preset Buttons */}
          <div className="form-group">
            <label className="form-label">Select Resource Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
              {resourcePresets.map((p) => {
                const Icon = p.icon;
                const isSelected = resourceType === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      background: isSelected ? 'rgba(249, 115, 22, 0.2)' : 'var(--bg-secondary)',
                      border: `1px solid ${isSelected ? '#f97316' : 'var(--border-color)'}`,
                      padding: '0.85rem 0.5rem',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: isSelected ? '#fdba74' : 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={22} color={isSelected ? '#f97316' : 'var(--text-secondary)'} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Specific Supplies Needed</label>
            <input
              type="text"
              className="form-input"
              value={requestedResource}
              onChange={(e) => setRequestedResource(e.target.value)}
              placeholder="e.g., Insulin cartridges, 20L water cans, ORS packets"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Number of People in Need</label>
            <input
              type="number"
              min="1"
              max="50"
              className="form-input"
              value={peopleCount}
              onChange={(e) => setPeopleCount(Number(e.target.value))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Special Needs</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label className={`checkbox-card ${elderlyPresent ? 'checked' : ''}`} style={{ flex: 1 }}>
                <input
                  type="checkbox"
                  checked={elderlyPresent}
                  onChange={(e) => setElderlyPresent(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Elderly Citizen</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Urgent medication / mobility</div>
                </div>
              </label>

              <label className={`checkbox-card ${childPresent ? 'checked' : ''}`} style={{ flex: 1 }}>
                <input
                  type="checkbox"
                  checked={childPresent}
                  onChange={(e) => setChildPresent(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Infant / Child</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baby formula / milk</div>
                </div>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Delivery Location Address</label>
            <input
              type="text"
              className="form-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Additional Instructions</label>
            <textarea
              rows={3}
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Water level, landmark, accessibility information..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem', background: 'var(--high-orange)' }}
          >
            {isSubmitting ? 'MATCHING VOLUNTEERS...' : 'SUBMIT RESOURCE REQUEST'}
          </button>
        </form>
      </div>
    </div>
  );
};

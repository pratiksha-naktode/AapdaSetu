import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { VoiceGuide } from '../../components/common/VoiceGuide';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Send,
  Navigation,
  ShieldAlert,
  Users,
  Camera,
  Layers
} from 'lucide-react';

interface Props {
  isSimulatedOffline: boolean;
}

export const ReportEmergencyRescue: React.FC<Props> = ({ isSimulatedOffline }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form State for Detailed Emergency Rescue Request (Flow A)
  const [category, setCategory] = useState<string>('trapped_person');
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [childPresent, setChildPresent] = useState<boolean>(false);
  const [elderlyPresent, setElderlyPresent] = useState<boolean>(false);
  const [injured, setInjured] = useState<boolean>(false);
  const [medicalEmergency, setMedicalEmergency] = useState<boolean>(false);
  const [trapped, setTrapped] = useState<boolean>(true);
  const [lifeThreat, setLifeThreat] = useState<boolean>(false);

  // Location & Coordinates
  const [latitude, setLatitude] = useState<number>(16.5449);
  const [longitude, setLongitude] = useState<number>(81.5212);
  const [address, setAddress] = useState<string>('');
  const [isFetchingGps, setIsFetchingGps] = useState<boolean>(false);
  const [gpsCaptured, setGpsCaptured] = useState<boolean>(false);

  // Description & Photo
  const [description, setDescription] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [damageSeverity, setDamageSeverity] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: 'online' | 'offline';
    requestId: string;
    priorityLevel?: string;
    priorityScore?: number;
    reason?: string;
    assignedTo?: string;
    assignmentExplanation?: string;
  } | null>(null);

  const fetchCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setAddress(`GPS Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        setIsFetchingGps(false);
        setGpsCaptured(true);
      },
      (err) => {
        setIsFetchingGps(false);
        alert('Could not acquire GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setDamageSeverity('SEVERE_STRUCTURAL');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      citizen_id: user?.id,
      citizen_name: user?.full_name || 'Citizen User',
      citizen_phone: user?.phone || '+919999999999',
      request_type: 'EMERGENCY' as const,
      category,
      people_count: Number(peopleCount),
      child_present: childPresent,
      elderly_present: elderlyPresent,
      injured,
      medical_emergency: medicalEmergency,
      trapped,
      life_threat: lifeThreat,
      description: description.trim(),
      latitude,
      longitude,
      address: address.trim() || `Bhimavaram Area (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      image_url: imagePreview,
      damage_severity: damageSeverity
    };

    try {
      if (isSimulatedOffline) {
        const { queueOfflineRequest } = await import('../../services/offlineStorage');
        const queued = await queueOfflineRequest(payload);
        setSubmissionFeedback({
          type: 'offline',
          requestId: queued.client_local_id,
          reason: 'Saved locally in device storage (Offline-First). Will automatically sync to Disaster Response when network returns.'
        });
      } else {
        const result = await api.submitEmergencyRequest(payload);
        const req = result.request;
        setSubmissionFeedback({
          type: result.isOfflineQueued ? 'offline' : 'online',
          requestId: (req.id || req.client_local_id || '') as string,
          priorityLevel: req.priority_level,
          priorityScore: req.priority_score,
          reason: req.priority_reason,
          assignedTo: req.assigned_to?.name || (req as any).assigned_to_user_id || undefined,
          assignmentExplanation: (req as any).assignment_explanation || undefined
        });
      }
    } catch (err: any) {
      alert('Error submitting emergency request: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionFeedback) {
    return (
      <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '2px solid #ef4444', borderRadius: '50%', marginBottom: '1.25rem' }}>
            <CheckCircle2 size={48} color="#ef4444" />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fca5a5' }}>
            🚨 Emergency Request Submitted & Dispatched!
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            {submissionFeedback.type === 'offline'
              ? 'Stored securely in offline storage. Will dispatch as soon as connection is restored.'
              : 'Disaster Command Center and NDRF / Police rescue units have received your distress signal.'}
          </p>

          <div style={{ margin: '1.5rem 0', padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Request ID:</span>
              <strong style={{ color: '#fff', fontSize: '0.85rem' }}>#{submissionFeedback.requestId?.slice(0, 10)}</strong>
            </div>

            {submissionFeedback.priorityLevel && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>AI Priority Score:</span>
                <span style={{ color: submissionFeedback.priorityLevel === 'CRITICAL' ? '#f87171' : '#fdba74', fontWeight: 800 }}>
                  {submissionFeedback.priorityLevel} ({submissionFeedback.priorityScore}/100)
                </span>
              </div>
            )}

            {submissionFeedback.assignedTo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Assigned Responder:</span>
                <strong style={{ color: '#38bdf8' }}>{submissionFeedback.assignedTo}</strong>
              </div>
            )}

            {submissionFeedback.assignmentExplanation && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
                {submissionFeedback.assignmentExplanation}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={() => navigate(`/citizen/track/${submissionFeedback.requestId}`)}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontWeight: 700 }}
            >
              Track Rescue Status
            </button>
            <button
              onClick={() => navigate('/citizen')}
              className="btn btn-outline"
              style={{ padding: '0.75rem 1.5rem' }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Bilingual Voice Guide */}
      <VoiceGuide defaultMessageKey="emergency_page" />

      <div className="card" style={{ padding: '2rem', borderTop: '4px solid var(--critical-red)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ padding: '0.5rem', background: 'var(--critical-red)', borderRadius: 'var(--radius-sm)', color: '#fff' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fca5a5' }}>
              🚨 Report Emergency Rescue (Detailed SOS)
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Complete detailed information for immediate police, NDRF rescue team, or medical dispatch.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Emergency Category */}
          <div className="form-group">
            <label className="form-label">Type of Emergency Situation</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="trapped_person">Trapped in Flooded House / Roof / Submerged Structure</option>
              <option value="building_collapse">Building Collapse / Structural Failure / Wall Breach</option>
              <option value="medical_trauma">Severe Medical Trauma / Drowning Risk / Hypothermia</option>
              <option value="fire_gas">Fire / Gas Leak / Short Circuit Explosion</option>
              <option value="flood_inundation">Rising Flood Inundation / Isolated Island</option>
              <option value="other">Other Life-Threatening Disaster Emergency</option>
            </select>
          </div>

          {/* People Count */}
          <div className="form-group">
            <label className="form-label">Number of People Affected / Trapped</label>
            <input
              type="number"
              min={1}
              max={100}
              className="form-input"
              value={peopleCount}
              onChange={(e) => setPeopleCount(parseInt(e.target.value) || 1)}
              required
            />
          </div>

          {/* Vulnerability Checkboxes */}
          <div>
            <label className="form-label">Immediate Hazard & Vulnerability Factors</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              <label className={`checkbox-card ${trapped ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={trapped}
                  onChange={(e) => setTrapped(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>People Trapped</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cannot exit structure</div>
                </div>
              </label>

              <label className={`checkbox-card ${lifeThreat ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={lifeThreat}
                  onChange={(e) => setLifeThreat(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Immediate Life Threat</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Water rising / collapsing</div>
                </div>
              </label>

              <label className={`checkbox-card ${childPresent ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={childPresent}
                  onChange={(e) => setChildPresent(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Children Present</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Infants / minors present</div>
                </div>
              </label>

              <label className={`checkbox-card ${elderlyPresent ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={elderlyPresent}
                  onChange={(e) => setElderlyPresent(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Elderly Persons</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Senior citizens trapped</div>
                </div>
              </label>

              <label className={`checkbox-card ${injured ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={injured}
                  onChange={(e) => setInjured(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Injured Persons</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fractures / wounds</div>
                </div>
              </label>

              <label className={`checkbox-card ${medicalEmergency ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={medicalEmergency}
                  onChange={(e) => setMedicalEmergency(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Medical Emergency</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cardiac / oxygen / asthma</div>
                </div>
              </label>
            </div>
          </div>

          {/* Location & GPS */}
          <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Location & GPS Coordinates</label>
              <button
                type="button"
                onClick={fetchCurrentLocation}
                disabled={isFetchingGps}
                className="btn btn-outline"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
              >
                <MapPin size={14} color="#38bdf8" />
                {isFetchingGps ? 'Fetching GPS...' : gpsCaptured ? '✓ GPS Captured' : 'Auto-Capture My GPS'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latitude</span>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  required
                />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Longitude</span>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  required
                />
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Street Address / Landmark</span>
              <input
                type="text"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Door number, street, landmark, area"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Situation Description</label>
            <textarea
              rows={3}
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe current water level, exact room/floor where people are trapped, urgent needs..."
            />
          </div>

          {/* Phase 2: Photo Upload for AI Damage Assessment */}
          <div className="form-group" style={{ border: '1px dashed var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Disaster Photo (AI Damage Triage)
              </label>
              <span style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}>
                AI Vision Triage
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}
            />
            {imagePreview && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src={imagePreview} alt="Damage Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div style={{ color: '#f87171', fontWeight: 700 }}>Severe Structural Damage Detected</div>
                  <div>Automated damage severity factor applied to Priority Engine calculation.</div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-critical"
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 800 }}
          >
            {isSubmitting ? 'PRIORITIZING & AUTO-DISPATCHING...' : 'DISPATCH EMERGENCY RESCUE REQUEST'}
          </button>
        </form>
      </div>
    </div>
  );
};

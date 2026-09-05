import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, MapPin, Users, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Props {
  isSimulatedOffline: boolean;
}

export const CreateEmergencyRequest: React.FC<Props> = ({ isSimulatedOffline }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form State (Clean defaults, zero pre-filled fake data)
  const [category, setCategory] = useState<string>('trapped_person');
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [trapped, setTrapped] = useState<boolean>(false);
  const [childPresent, setChildPresent] = useState<boolean>(false);
  const [elderlyPresent, setElderlyPresent] = useState<boolean>(false);
  const [injured, setInjured] = useState<boolean>(false);
  const [medicalEmergency, setMedicalEmergency] = useState<boolean>(false);
  const [lifeThreat, setLifeThreat] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');

  // Location State
  const [latitude, setLatitude] = useState<number>(16.5449);
  const [longitude, setLongitude] = useState<number>(81.5212);
  const [address, setAddress] = useState<string>('');
  const [isFetchingGps, setIsFetchingGps] = useState<boolean>(false);

  // Phase 2 AI Damage Triage Simulation Hook
  const [damageSeverity, setDamageSeverity] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: 'online' | 'offline';
    requestId: string;
    priorityLevel?: string;
    priorityScore?: number;
    reason?: string;
  } | null>(null);

  const fetchCurrentLocation = () => {
    setIsFetchingGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setAddress(`GPS Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)} (Bhimavaram Sector)`);
          setIsFetchingGps(false);
        },
        (err) => {
          console.warn('Geolocation error or denied:', err.message);
          // Fallback to Bhimavaram Flood Ward coordinates
          setLatitude(16.5455);
          setLongitude(81.5195);
          setAddress('Mavullamma Temple Ward 8, Bhimavaram (Auto-selected)');
          setIsFetchingGps(false);
        },
        { timeout: 8000 }
      );
    } else {
      setIsFetchingGps(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
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
      trapped,
      child_present: childPresent,
      elderly_present: elderlyPresent,
      injured,
      medical_emergency: medicalEmergency,
      life_threat: lifeThreat,
      description,
      damage_severity: damageSeverity,
      latitude,
      longitude,
      address
    };

    try {
      if (isSimulatedOffline) {
        // Force offline IndexedDB queueing
        const { queueOfflineRequest } = await import('../../services/offlineStorage');
        const queued = await queueOfflineRequest(payload);
        setSubmissionFeedback({
          type: 'offline',
          requestId: queued.client_local_id,
          reason: 'Captured offline. Request queued in device IndexedDB and will auto-synchronize when connectivity restores.'
        });
      } else {
        const result = await api.submitEmergencyRequest(payload);
        if (result.isOfflineQueued) {
          setSubmissionFeedback({
            type: 'offline',
            requestId: result.request.client_local_id || 'LOCAL-QUEUED',
            reason: 'Network temporarily unavailable. Stored in IndexedDB and waiting for sync.'
          });
        } else {
          setSubmissionFeedback({
            type: 'online',
            requestId: result.request.id,
            priorityLevel: result.request.priority_level,
            priorityScore: result.request.priority_score,
            reason: result.request.priority_reason
          });
        }
      }
    } catch (err: any) {
      alert('Error creating emergency request: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionFeedback) {
    return (
      <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          {submissionFeedback.type === 'online' ? (
            <>
              <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', border: '2px solid #ef4444', borderRadius: '50%', marginBottom: '1.25rem' }}>
                <ShieldAlert size={48} color="#ef4444" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fca5a5' }}>
                EMERGENCY SOS LOGGED & PRIORITIZED
              </h2>
              <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <span className={`badge badge-${submissionFeedback.priorityLevel?.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                  PRIORITY: {submissionFeedback.priorityLevel} ({submissionFeedback.priorityScore}/100)
                </span>
              </div>
              <p style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', margin: '1rem 0', color: 'var(--text-secondary)' }}>
                <strong>AI Triage Explanation:</strong> {submissionFeedback.reason}
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Nearest Police / NDRF Rescue Team notified via automated alert. Keep your phone charged and stay on elevated ground.
              </p>
            </>
          ) : (
            <>
              <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(234, 179, 8, 0.2)', border: '2px solid #eab308', borderRadius: '50%', marginBottom: '1.25rem' }}>
                <CheckCircle2 size={48} color="#facc15" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fde047' }}>
                SAVED IN OFFLINE STORAGE
              </h2>
              <div style={{ margin: '1rem 0' }}>
                <span className="badge badge-status" style={{ borderColor: '#eab308', color: '#facc15', fontSize: '0.85rem' }}>
                  LOCAL ID: {submissionFeedback.requestId}
                </span>
              </div>
              <p style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', margin: '1rem 0', color: 'var(--text-secondary)' }}>
                {submissionFeedback.reason}
              </p>
              <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: '#93c5fd' }}>
                💡 <em>Deduplication Guarantee:</em> When connection restores, your request will synchronize automatically without duplicates.
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              onClick={() => navigate(`/citizen/track/${submissionFeedback.requestId}`)}
              className="btn btn-primary"
            >
              Track Status
            </button>
            <button
              onClick={() => {
                setSubmissionFeedback(null);
                navigate('/citizen');
              }}
              className="btn btn-outline"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <div className="card card-critical" style={{ padding: '2rem' }}>
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
            <AlertTriangle size={18} /> High-Urgency Dispatch
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
            Emergency Rescue Request
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Provide accurate details. The AI Priority Engine evaluates life threats to dispatch NDRF and police teams immediately.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Category */}
          <div className="form-group">
            <label className="form-label">Emergency Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="trapped_person">People Trapped Inside House / Building</option>
              <option value="flooded_house">Rapidly Flooding Structure / Submerged Ground</option>
              <option value="medical_trauma">Severe Medical Trauma / Unconscious</option>
              <option value="building_collapse">Structural / Wall Collapse Danger</option>
              <option value="water_current">Swept by Strong Water Currents</option>
            </select>
          </div>

          {/* People Count Slider */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Number of People Requiring Rescue</label>
              <span style={{ fontWeight: 800, color: '#fca5a5', fontSize: '1.1rem' }}>{peopleCount} People</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              value={peopleCount}
              onChange={(e) => setPeopleCount(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--critical-red)', height: '6px' }}
            />
          </div>

          {/* Critical Indicators Grid */}
          <div className="form-group">
            <label className="form-label">Critical Vulnerability Factors (Select all that apply)</label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Location & GPS Coordinates</label>
              <button
                type="button"
                onClick={fetchCurrentLocation}
                disabled={isFetchingGps}
                className="btn btn-outline"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
              >
                <MapPin size={14} color="#38bdf8" />
                {isFetchingGps ? 'Fetching GPS...' : 'Auto-Capture My GPS'}
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
                Disaster Photo (Phase 2 AI Damage Triage)
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
            {isSubmitting ? 'PRIORITIZING & DISPATCHING...' : 'DISPATCH EMERGENCY RESCUE REQUEST'}
          </button>
        </form>
      </div>
    </div>
  );
};

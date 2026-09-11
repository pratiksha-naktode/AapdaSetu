import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { VoiceGuide } from '../../components/common/VoiceGuide';
import { voiceGuide, VoiceLanguage } from '../../services/voiceGuideService';
import {
  MapPin,
  Mic,
  Square,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Send,
  Navigation,
  ShieldAlert,
  Languages,
  Check
} from 'lucide-react';

interface Props {
  isSimulatedOffline: boolean;
}

type FlowStep = 'LOCATION' | 'VOICE_INPUT' | 'CONFIRMATION';

export const CreateEmergencyRequest: React.FC<Props> = ({ isSimulatedOffline }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Flow Step State
  const [currentStep, setCurrentStep] = useState<FlowStep>('LOCATION');
  const [selectedLang, setSelectedLang] = useState<VoiceLanguage>(() => voiceGuide.getSavedLanguage());

  // Step 1: Real GPS Location State (Zero hardcoded fake coordinates)
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('');
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [locationCaptured, setLocationCaptured] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Step 2 & 3: Voice-Only Description & Speech Recognition State
  const [description, setDescription] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  const [isEditingManually, setIsEditingManually] = useState<boolean>(false);
  const [isPlayingBack, setIsPlayingBack] = useState<boolean>(false);

  // Emergency Details (Clean defaults reusing existing supported database fields)
  const [category, setCategory] = useState<string>('trapped_person');
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [trapped, setTrapped] = useState<boolean>(true);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: 'online' | 'offline';
    requestId: string;
    priorityLevel?: string;
    priorityScore?: number;
    reason?: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const transcriptBufferRef = useRef<string>('');

  // Check speech recognition support on mount
  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSpeechSupported(false);
    }
  }, []);

  // Cleanup speech recognition and audio on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
      voiceGuide.stop();
    };
  }, []);

  // Sync language selection with VoiceGuide service
  const handleLanguageSwitch = (lang: VoiceLanguage) => {
    setSelectedLang(lang);
    voiceGuide.saveLanguage(lang);
  };

  // -------------------------------------------------------------
  // STEP 1: REAL GPS LOCATION ACQUISITION
  // -------------------------------------------------------------
  const requestDeviceLocation = useCallback(() => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!('geolocation' in navigator)) {
      setIsGettingLocation(false);
      setLocationError('Geolocation is not supported by your device browser. Please use a supported device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);
        setAddress(`GPS Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
        setIsGettingLocation(false);
        setLocationCaptured(true);
        // Automatically progress to Voice Input step
        setTimeout(() => {
          setCurrentStep('VOICE_INPUT');
        }, 600);
      },
      (err) => {
        setIsGettingLocation(false);
        setLocationCaptured(false);
        if (err.code === 1) {
          // Permission Denied
          setLocationError(
            'Location access is required to send your emergency location. Please enable location permission and try again.'
          );
        } else {
          setLocationError('Unable to get your current location. Please check GPS signal and try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  // Auto-prompt location request on mount
  useEffect(() => {
    requestDeviceLocation();
  }, [requestDeviceLocation]);

  // Voice Question Prompt: When location is captured and entering VOICE_INPUT, ask by voice: "What is the problem?"
  useEffect(() => {
    if (currentStep === 'VOICE_INPUT' && !description) {
      const promptText = selectedLang === 'te' ? 'మీ సమస్య ఏమిటో చెప్పండి' : 'What is the problem?';
      voiceGuide.speak(promptText, selectedLang);
    }
  }, [currentStep, selectedLang]);

  // -------------------------------------------------------------
  // STEP 2 & 3: VOICE SPEECH RECOGNITION (en-IN & te-IN)
  // -------------------------------------------------------------
  const startSpeechRecognition = useCallback(() => {
    setVoiceError(null);

    // Stop any active VoiceGuide or playback first
    voiceGuide.stop();
    setIsPlayingBack(false);

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSpeechSupported(false);
      setVoiceError('Voice input is not supported in this browser. Please use a supported browser or type below.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = selectedLang === 'te' ? 'te-IN' : 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      transcriptBufferRef.current = '';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalized = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalized += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }

        if (finalized) {
          transcriptBufferRef.current += finalized;
        }

        const fullText = (transcriptBufferRef.current + interim).trim();
        setDescription(fullText);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError('Microphone permission is required to describe your emergency by voice.');
        } else if (event.error === 'no-speech') {
          setVoiceError(
            selectedLang === 'te'
              ? 'మాటలు వినబడలేదు. దయచేసి మళ్లీ మాట్లాడండి.'
              : 'No speech was detected. Please speak again.'
          );
        } else if (event.error !== 'aborted') {
          setVoiceError(
            selectedLang === 'te'
              ? 'వాయిస్ రికార్డింగ్ విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.'
              : 'Voice recognition failed. Please try speaking again.'
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalText = transcriptBufferRef.current.trim() || description.trim();
        if (finalText.length > 0) {
          setDescription(finalText);
          setCurrentStep('CONFIRMATION');
        } else {
          setVoiceError(
            selectedLang === 'te'
              ? 'మాటలు వినబడలేదు. దయచేసి మళ్లీ మాట్లాడండి.'
              : 'No speech was detected. Please speak again.'
          );
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setVoiceError('Voice input is not supported in this browser. Please use a supported browser.');
    }
  }, [selectedLang, description]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsListening(false);
  }, []);

  // -------------------------------------------------------------
  // STEP 4: HEAR AGAIN (Text-to-Speech Playback)
  // -------------------------------------------------------------
  const handleHearAgain = useCallback(() => {
    if (!description.trim()) return;

    if (recognitionRef.current && isListening) {
      stopSpeechRecognition();
    }

    voiceGuide.stop();
    setIsPlayingBack(true);

    voiceGuide.speak(
      description,
      selectedLang,
      () => setIsPlayingBack(true),
      () => setIsPlayingBack(false),
      () => setIsPlayingBack(false)
    );
  }, [description, selectedLang, isListening, stopSpeechRecognition]);

  // -------------------------------------------------------------
  // STEP 5: SUBMIT USING EXISTING EMERGENCY API & DB FIELDS
  // -------------------------------------------------------------
  const handleFinalSubmit = async () => {
    if (!latitude || !longitude) {
      setCurrentStep('LOCATION');
      setLocationError('Valid location is required to dispatch emergency rescue. Please allow location access.');
      return;
    }

    if (!description.trim()) {
      setCurrentStep('VOICE_INPUT');
      setVoiceError('Please describe your emergency before submitting.');
      return;
    }

    setIsSubmitting(true);
    voiceGuide.stop();

    const payload = {
      citizen_id: user?.id,
      citizen_name: user?.full_name || 'Citizen User',
      citizen_phone: user?.phone || '+919999999999',
      request_type: 'EMERGENCY' as const,
      category: category || 'trapped_person',
      people_count: Number(peopleCount) || 1,
      trapped: Boolean(trapped),
      child_present: false,
      elderly_present: false,
      injured: false,
      medical_emergency: false,
      life_threat: true,
      description: description.trim(),
      damage_severity: 'severe',
      latitude: latitude,
      longitude: longitude,
      address: address || `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
    };

    try {
      if (isSimulatedOffline) {
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
      alert('Error submitting emergency request: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // STEP 6: SUBMISSION SUCCESS SCREEN
  // -------------------------------------------------------------
  if (submissionFeedback) {
    return (
      <div style={{ maxWidth: '720px', margin: '1.5rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ display: 'inline-flex', padding: '1.25rem', background: 'rgba(16, 185, 129, 0.2)', border: '2px solid #10b981', borderRadius: '50%', marginBottom: '1.25rem' }}>
            <CheckCircle2 size={54} color="#34d399" />
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#86efac', marginBottom: '0.5rem' }}>
            ✅ Emergency Submitted
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#f8fafc', fontWeight: 700 }}>
            {selectedLang === 'te'
              ? 'మీ అత్యవసర అభ్యర్థన అందింది.'
              : 'Your emergency request has been received.'}
          </p>

          <div style={{ margin: '1.25rem 0', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <span className="badge badge-status" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem', borderColor: '#10b981', color: '#86efac' }}>
              REQUEST ID: {submissionFeedback.requestId.slice(0, 12)}
            </span>
          </div>

          <p style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', margin: '1rem 0', color: 'var(--text-secondary)' }}>
            <strong>Disaster Coordination:</strong> Please stay calm. Emergency rescue teams have been notified of your GPS coordinates ({latitude?.toFixed(4)}, {longitude?.toFixed(4)}).
          </p>

          {/* Voice Guide Feedback Assistance */}
          <div style={{ margin: '1.5rem 0', textAlign: 'left' }}>
            <VoiceGuide
              defaultMessageKey="after_submission"
              title="Status Audio Guide"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            <button
              onClick={() => navigate(`/citizen/track/${submissionFeedback.requestId}`)}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontWeight: 800 }}
            >
              Track Rescue Status
            </button>
            <button
              onClick={() => {
                setSubmissionFeedback(null);
                navigate('/citizen');
              }}
              className="btn btn-outline"
              style={{ padding: '0.75rem 1.5rem' }}
            >
              Return to Citizen Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PRIMARY STREAMLINED CITIZEN EMERGENCY FLOW
  // -------------------------------------------------------------
  return (
    <div style={{ maxWidth: '740px', margin: '0 auto' }}>
      <div className="card card-critical" style={{ padding: '1.75rem' }}>
        {/* Top Header */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase' }}>
              <AlertTriangle size={16} /> Fast-Track Rescue
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, marginTop: '0.2rem' }}>
              🚨 Emergency Assistance Flow
            </h1>
          </div>

          {/* Language Toggle: [ English ] [ తెలుగు ] */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.2rem' }}>
            <Languages size={14} style={{ marginLeft: '0.35rem', color: '#38bdf8' }} />
            <button
              type="button"
              className={`btn-voice-lang-pill ${selectedLang === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageSwitch('en')}
              aria-label="Select English for voice emergency assistance"
            >
              English
            </button>
            <button
              type="button"
              className={`btn-voice-lang-pill ${selectedLang === 'te' ? 'active' : ''}`}
              onClick={() => handleLanguageSwitch('te')}
              aria-label="తెలుగు ఎంచుకోండి (Telugu)"
            >
              తెలుగు
            </button>
          </div>
        </div>

        {/* Step Progress Indicators */}
        <div className="flow-step-indicator">
          <div className={`flow-step-dot ${currentStep === 'LOCATION' ? 'active' : 'completed'}`}></div>
          <div style={{ width: '30px', height: '2px', background: locationCaptured ? '#10b981' : 'var(--border-color)' }}></div>
          <div className={`flow-step-dot ${currentStep === 'VOICE_INPUT' ? 'active' : currentStep === 'CONFIRMATION' ? 'completed' : ''}`}></div>
          <div style={{ width: '30px', height: '2px', background: currentStep === 'CONFIRMATION' ? '#10b981' : 'var(--border-color)' }}></div>
          <div className={`flow-step-dot ${currentStep === 'CONFIRMATION' ? 'active' : ''}`}></div>
        </div>

        {/* ========================================================= */}
        {/* STEP 1 — LOCATION ACCESS */}
        {/* ========================================================= */}
        {currentStep === 'LOCATION' && (
          <div className="flow-step-container">
            <div className="flow-location-card">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                <MapPin size={32} />
              </div>

              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
                  📍 Location Access Required
                </h2>
                <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginTop: '0.4rem', maxWidth: '480px' }}>
                  {selectedLang === 'te'
                    ? 'మేము మీ స్థానాన్ని గుర్తించి సహాయం పంపడానికి దయచేసి లొకేషన్ అనుమతిని ఇవ్వండి.'
                    : 'Please allow location access so we can find your location and send help.'}
                </p>
              </div>

              {/* Status or Retry */}
              {isGettingLocation && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.95rem' }}>
                  <Navigation size={18} className="animate-spin" />
                  <span>📍 Getting your location...</span>
                </div>
              )}

              {locationCaptured && latitude && longitude && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#86efac', fontWeight: 800, fontSize: '1rem', background: 'rgba(16, 185, 129, 0.15)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
                  <CheckCircle2 size={20} color="#34d399" />
                  <span>✅ Location captured ({latitude.toFixed(4)}, {longitude.toFixed(4)})</span>
                </div>
              )}

              {locationError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.85rem 1.15rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', textAlign: 'left', maxWidth: '520px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>⚠️ Location Required</div>
                  <div>{locationError}</div>
                </div>
              )}

              <button
                type="button"
                disabled={isGettingLocation}
                onClick={requestDeviceLocation}
                className="btn btn-primary"
                style={{ padding: '0.85rem 1.75rem', fontSize: '1.05rem', fontWeight: 800, gap: '0.5rem', background: '#0284c7' }}
              >
                <Navigation size={18} />
                {isGettingLocation ? 'Acquiring GPS...' : locationError ? '🔄 Retry Location Permission' : '📍 Share My Location'}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2 & 3 — VOICE-ONLY EMERGENCY DESCRIPTION */}
        {/* ========================================================= */}
        {currentStep === 'VOICE_INPUT' && (
          <div className="flow-step-container">
            {/* Captured Location Badge */}
            {latitude && longitude && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                <span style={{ color: '#86efac', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Check size={16} /> ✅ Location captured: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentStep('LOCATION')}
                  style={{ background: 'transparent', color: '#38bdf8', fontSize: '0.78rem', textDecoration: 'underline' }}
                >
                  Change
                </button>
              </div>
            )}

            <div className="flow-voice-card" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc', margin: 0 }}>
                  {selectedLang === 'te' ? '🎤 మీ సమస్య ఏమిటో చెప్పండి' : '🎤 What is the problem?'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const promptText = selectedLang === 'te' ? 'మీ సమస్య ఏమిటో చెప్పండి' : 'What is the problem?';
                    voiceGuide.speak(promptText, selectedLang);
                  }}
                  title="Listen to question prompt"
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Volume2 size={16} />
                </button>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.92rem', marginTop: '0.25rem' }}>
                {selectedLang === 'te'
                  ? 'మీ గ్రామం పేరు, వరద పరిస్థితి, ఎంతమంది చిక్కుకున్నారో వాయిస్ ద్వారా చెప్పండి.'
                  : 'Describe your emergency, trapped people, or immediate life threats clearly.'}
              </p>

              {/* Big Interactive Microphone Button */}
              <div>
                {!isListening ? (
                  <button
                    type="button"
                    onClick={startSpeechRecognition}
                    className="flow-big-mic-btn"
                    aria-label="Start Voice Recording"
                    title="Click to speak your emergency"
                  >
                    <Mic size={40} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopSpeechRecognition}
                    className="flow-big-mic-btn is-recording"
                    aria-label="Stop Voice Recording"
                    title="Click to finish speaking"
                  >
                    <Square size={34} fill="currentColor" />
                  </button>
                )}
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isListening ? '#f87171' : '#38bdf8', marginTop: '0.4rem' }}>
                  {isListening
                    ? (selectedLang === 'te' ? '🎤 వింటున్నాము... మాట్లాడండి (నొక్కి ఆపండి)' : '🎤 Listening... (Click to Stop)')
                    : (selectedLang === 'te' ? '🎤 మాట్లాడటానికి ఇక్కడ నొక్కండి' : '🎤 Click to Speak Emergency')}
                </div>
              </div>

              {/* While Listening Banner */}
              {isListening && (
                <div className="voice-listening-banner" style={{ justifyContent: 'center' }}>
                  <div className="voice-soundwaves">
                    <span className="wave-bar bar-1"></span>
                    <span className="wave-bar bar-2"></span>
                    <span className="wave-bar bar-3"></span>
                    <span className="wave-bar bar-4"></span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#fca5a5' }}>
                    {selectedLang === 'te' ? 'దయచేసి మీ అత్యవసర పరిస్థితిని వివరించండి...' : 'Please describe your emergency...'}
                  </span>
                </div>
              )}

              {/* Realtime Transcript Preview */}
              {description && (
                <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(56, 189, 248, 0.3)', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Recognized Speech Preview:
                  </div>
                  <div style={{ color: '#f8fafc', fontSize: '1rem', fontStyle: 'italic' }}>
                    "{description}"
                  </div>
                </div>
              )}

              {/* Voice Error Display */}
              {voiceError && (
                <div className="voice-error-banner" style={{ textAlign: 'left' }}>
                  <AlertTriangle size={18} color="#f87171" style={{ flexShrink: 0 }} />
                  <div>
                    <div>{voiceError}</div>
                    {!isSpeechSupported && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <button
                          type="button"
                          onClick={() => setIsEditingManually(true)}
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', marginTop: '0.35rem' }}
                        >
                          Type Description Instead
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Next Step / Confirmation button if description exists */}
              {description.trim().length > 0 && !isListening && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('CONFIRMATION')}
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 1.5rem', fontWeight: 800, fontSize: '1rem', background: '#0284c7' }}
                  >
                    <Check size={18} /> Continue to Confirmation
                  </button>
                </div>
              )}

              {/* Optional Manual Typing Toggle for edge-cases */}
              <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setIsEditingManually(prev => !prev)}
                  style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'underline' }}
                >
                  {isEditingManually ? 'Hide Keyboard Typing' : 'Prefer typing manually? Click here'}
                </button>
              </div>

              {isEditingManually && (
                <div style={{ marginTop: '0.75rem', textAlign: 'left' }}>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Type your emergency details manually..."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: CONFIRMATION & REVIEW BEFORE SUBMISSION */}
        {/* ========================================================= */}
        {currentStep === 'CONFIRMATION' && (
          <div className="flow-step-container">
            <div className="flow-confirmation-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fde047', fontWeight: 800, fontSize: '1.1rem' }}>
                <span>📝 Please check what we understood</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '-0.4rem' }}>
                {selectedLang === 'te'
                  ? 'మేము అర్థం చేసుకున్న వివరాలను సరిచూసుకోండి. సరైనదైతే సమర్పించండి.'
                  : 'Verify your captured GPS location and recognized emergency description below.'}
              </p>

              {/* Location Review Item */}
              <div className="flow-confirmation-item">
                <MapPin size={20} color="#34d399" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#86efac' }}>📍 Location: Captured</div>
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                    Latitude: {latitude?.toFixed(4)}, Longitude: {longitude?.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Description Review Item */}
              <div className="flow-confirmation-item" style={{ flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Mic size={18} /> 🎤 Recognized Emergency Description:
                </div>
                <div className="flow-confirmation-text">
                  "{description}"
                </div>
              </div>

              {/* Is this correct prompt */}
              <div style={{ textAlign: 'center', fontWeight: 800, color: '#ffffff', fontSize: '1.05rem', margin: '0.5rem 0' }}>
                {selectedLang === 'te' ? 'ఇది సరైనదేనా?' : 'Is this correct?'}
              </div>

              {/* Action Buttons: Hear Again, Speak Again, Submit */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleHearAgain}
                  disabled={isPlayingBack}
                  className="btn btn-outline"
                  style={{ padding: '0.65rem 1.15rem', fontWeight: 700, fontSize: '0.9rem', gap: '0.4rem', borderColor: '#38bdf8', color: '#38bdf8' }}
                  aria-label="Hear Recognized Description Again"
                >
                  <Volume2 size={16} />
                  <span>{isPlayingBack ? 'Playing...' : selectedLang === 'te' ? '🔊 వినండి (Hear Again)' : '🔊 Hear Again'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    voiceGuide.stop();
                    setCurrentStep('VOICE_INPUT');
                    startSpeechRecognition();
                  }}
                  className="btn btn-outline"
                  style={{ padding: '0.65rem 1.15rem', fontWeight: 700, fontSize: '0.9rem', gap: '0.4rem', borderColor: '#f87171', color: '#fca5a5' }}
                  aria-label="Speak Emergency Description Again"
                >
                  <RotateCcw size={16} />
                  <span>{selectedLang === 'te' ? '🎤 మళ్లీ చెప్పండి (Speak Again)' : '🎤 Speak Again'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingManually(prev => !prev)}
                  className="btn btn-outline"
                  style={{ padding: '0.65rem 1rem', fontWeight: 700, fontSize: '0.9rem', gap: '0.35rem' }}
                  aria-label="Edit text manually"
                >
                  <Edit3 size={15} /> Edit
                </button>
              </div>

              {isEditingManually && (
                <div style={{ marginTop: '0.75rem' }}>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Adjust description text manually..."
                  />
                </div>
              )}

              {/* Final Big Submit Button */}
              <button
                type="button"
                disabled={isSubmitting || !description.trim() || !latitude || !longitude}
                onClick={handleFinalSubmit}
                className="btn btn-critical"
                style={{
                  width: '100%',
                  padding: '1.15rem',
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  gap: '0.6rem',
                  marginTop: '0.75rem',
                  boxShadow: '0 6px 20px rgba(239, 68, 68, 0.5)'
                }}
              >
                <Send size={20} />
                {isSubmitting
                  ? 'DISPATCHING EMERGENCY SOS...'
                  : selectedLang === 'te'
                  ? '✅ అత్యవసర అభ్యర్థన సమర్పించండి (SUBMIT EMERGENCY)'
                  : '✅ SUBMIT EMERGENCY RESCUE'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

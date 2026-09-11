import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Square, Check, Edit3, AlertCircle, Languages } from 'lucide-react';

// Declarations for Web Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

interface VoiceEmergencyInputProps {
  currentText: string;
  onTranscriptChange: (text: string) => void;
  onFocusTextarea?: () => void;
  className?: string;
}

export const VoiceEmergencyInput: React.FC<VoiceEmergencyInputProps> = ({
  currentText,
  onTranscriptChange,
  onFocusTextarea,
  className = ''
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [selectedLang, setSelectedLang] = useState<'en' | 'te'>('te'); // default to Telugu for rural citizens
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showReviewPrompt, setShowReviewPrompt] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptAccumulatorRef = useRef<string>('');

  // Check Web Speech Recognition support
  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSupported(false);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const handleStartListening = useCallback(() => {
    setErrorMessage(null);
    setShowReviewPrompt(false);

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      setErrorMessage('Voice input is not supported in this browser. Please type your emergency.');
      return;
    }

    // Stop any existing instance
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

      // Base transcript on existing text
      const baseText = currentText ? currentText.trim() + ' ' : '';
      finalTranscriptAccumulatorRef.current = '';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage(selectedLang === 'te' ? '🎤 వింటున్నాము... మాట్లాడండి' : '🎤 Listening... Please speak now');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            currentFinal += result[0].transcript + ' ';
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (currentFinal) {
          finalTranscriptAccumulatorRef.current += currentFinal;
        }

        const combined = baseText + finalTranscriptAccumulatorRef.current + interimTranscript;
        onTranscriptChange(combined.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        setIsListening(false);
        setStatusMessage(null);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser.');
        } else if (event.error === 'no-speech') {
          setErrorMessage(selectedLang === 'te' ? 'మాటలు వినబడలేదు. దయచేసి మళ్లీ ప్రయత్నించండి లేదా టైప్ చేయండి.' : 'No speech was detected. Please try speaking again or type your emergency.');
        } else if (event.error !== 'aborted') {
          setErrorMessage(selectedLang === 'te' ? 'వాయిస్ రికార్డింగ్ విఫలమైంది. దయచేసి టైప్ చేయండి.' : 'Voice recognition error. Please type your details.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setStatusMessage(null);
        // If we captured any text, show the verification prompt (DO NOT auto-submit)
        if (finalTranscriptAccumulatorRef.current.trim().length > 0 || currentText.trim().length > 0) {
          setShowReviewPrompt(true);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setErrorMessage('Voice input is not supported in this browser. Please type your emergency.');
    }
  }, [currentText, selectedLang, onTranscriptChange]);

  const handleStopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsListening(false);
    setStatusMessage(null);
  }, []);

  const handleEdit = () => {
    setShowReviewPrompt(false);
    onFocusTextarea?.();
  };

  const handleContinue = () => {
    setShowReviewPrompt(false);
  };

  return (
    <div className={`voice-emergency-input-container ${className}`} style={{ marginBottom: '0.75rem' }}>
      {/* Top Controls Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.5rem' }}>
        {/* Language Selection: [ English ] [ తెలుగు ] */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Languages size={13} /> Voice Lang:
          </span>
          <div style={{ display: 'flex', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.15rem', gap: '0.2rem' }}>
            <button
              type="button"
              disabled={isListening}
              onClick={() => setSelectedLang('te')}
              className={`btn-voice-lang-pill ${selectedLang === 'te' ? 'active' : ''}`}
              aria-label="Set speech recognition to Telugu (te-IN)"
            >
              తెలుగు (te-IN)
            </button>
            <button
              type="button"
              disabled={isListening}
              onClick={() => setSelectedLang('en')}
              className={`btn-voice-lang-pill ${selectedLang === 'en' ? 'active' : ''}`}
              aria-label="Set speech recognition to Indian English (en-IN)"
            >
              English (en-IN)
            </button>
          </div>
        </div>

        {/* Microphone Button */}
        <div>
          {!isListening ? (
            <button
              type="button"
              onClick={handleStartListening}
              className="btn btn-voice-speak"
              aria-label="Speak Emergency Description using Microphone"
            >
              <Mic size={16} />
              <span>🎤 Speak Emergency</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopListening}
              className="btn btn-voice-stop"
              aria-label="Stop Voice Recording"
            >
              <Square size={14} fill="currentColor" />
              <span>⏹ Stop Recording</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Listening Indicator */}
      {isListening && (
        <div className="voice-listening-banner" role="status" aria-live="assertive">
          <div className="voice-mic-pulse">
            <Mic size={18} color="#ef4444" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#fca5a5', fontSize: '0.9rem' }}>
              🎤 Listening... ({selectedLang === 'te' ? 'తెలుగు' : 'English'})
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              {selectedLang === 'te'
                ? 'మీ అత్యవసర పరిస్థితిని వివరించండి. మాట్లాడటం పూర్తయ్యాక [Stop Recording] నొక్కండి.'
                : 'Speak clearly into your microphone. Click [Stop Recording] when done.'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleStopListening}
            className="btn btn-sm btn-critical"
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}
          >
            <Square size={12} fill="currentColor" /> Stop
          </button>
        </div>
      )}

      {/* Post-Recognition Review Prompt (DO NOT auto-submit) */}
      {showReviewPrompt && !isListening && (
        <div className="voice-review-prompt" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fde047', fontWeight: 700, fontSize: '0.88rem' }}>
            <Check size={16} color="#34d399" />
            <span>Please check your emergency description.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
            <button
              type="button"
              onClick={handleEdit}
              className="btn btn-outline btn-sm"
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem', borderColor: '#facc15', color: '#fde047' }}
              aria-label="Edit recognized description text"
            >
              <Edit3 size={13} /> Edit
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="btn btn-primary btn-sm"
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem', background: '#0284c7' }}
              aria-label="Confirm description text and continue"
            >
              <Check size={13} /> Continue
            </button>
          </div>
        </div>
      )}

      {/* Unsupported or Error Messages */}
      {!isSupported && (
        <div className="voice-error-banner" role="alert">
          <AlertCircle size={16} color="#f87171" />
          <span>Voice input is not supported in this browser. Please type your emergency.</span>
        </div>
      )}

      {errorMessage && isSupported && (
        <div className="voice-error-banner" role="alert">
          <AlertCircle size={16} color="#f87171" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

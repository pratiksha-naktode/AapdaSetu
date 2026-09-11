import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Play, Square, Languages, Info } from 'lucide-react';
import {
  voiceGuide,
  VoiceLanguage,
  VoiceMessageKey,
  VOICE_MESSAGES
} from '../../services/voiceGuideService';

export interface VoiceGuideProps {
  /** The primary or default message key to play */
  defaultMessageKey?: VoiceMessageKey;
  /** Optional array of selectable message keys (defaults to all 4 guide topics) */
  availableKeys?: VoiceMessageKey[];
  /** Optional custom title override */
  title?: string;
  /** Optional compact styling */
  compact?: boolean;
  /** Optional custom class name */
  className?: string;
  /** Optional custom inline styles */
  style?: React.CSSProperties;
  /** Callback fired when speech starts */
  onStart?: () => void;
  /** Callback fired when speech ends */
  onEnd?: () => void;
}

const ALL_TOPIC_KEYS: VoiceMessageKey[] = [
  'citizen_dashboard',
  'emergency_page',
  'location',
  'after_submission'
];

export const VoiceGuide: React.FC<VoiceGuideProps> = ({
  defaultMessageKey = 'citizen_dashboard',
  availableKeys = ALL_TOPIC_KEYS,
  title = 'Voice Guide',
  compact = false,
  className = '',
  style,
  onStart,
  onEnd
}) => {
  const [selectedLang, setSelectedLang] = useState<VoiceLanguage>(() => voiceGuide.getSavedLanguage());
  const [activeKey, setActiveKey] = useState<VoiceMessageKey>(defaultMessageKey);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Synchronize playback state with the service
  useEffect(() => {
    const unsubscribe = voiceGuide.subscribe((speaking) => {
      setIsPlaying(speaking);
    });

    return () => {
      unsubscribe();
      voiceGuide.stop();
    };
  }, []);

  // Update activeKey if defaultMessageKey changes from parent page navigation
  useEffect(() => {
    setActiveKey(defaultMessageKey);
  }, [defaultMessageKey]);

  const currentMsgObj = VOICE_MESSAGES[activeKey] || VOICE_MESSAGES.citizen_dashboard;
  const currentText = selectedLang === 'te' ? currentMsgObj.te : currentMsgObj.en;

  const handleLanguageChange = (lang: VoiceLanguage) => {
    setSelectedLang(lang);
    voiceGuide.saveLanguage(lang);
    if (isPlaying) {
      voiceGuide.speak(
        lang === 'te' ? currentMsgObj.te : currentMsgObj.en,
        lang,
        onStart,
        onEnd,
        () => {
          setNotice(lang === 'te' ? 'Telugu audio synthesizer fallback active.' : null);
        }
      );
    }
  };

  const handlePlay = useCallback(() => {
    setNotice(null);
    if (!voiceGuide.isSupported()) {
      setNotice('Web Speech API is not supported in this browser.');
      return;
    }

    const success = voiceGuide.speak(
      currentText,
      selectedLang,
      () => {
        setIsPlaying(true);
        onStart?.();
      },
      () => {
        setIsPlaying(false);
        onEnd?.();
      },
      (err) => {
        setIsPlaying(false);
        console.warn('Voice guide notice:', err);
      }
    );

    if (!success) {
      setNotice('Could not play audio. Please check device audio permissions.');
    }
  }, [currentText, selectedLang, onStart, onEnd]);

  const handleStop = useCallback(() => {
    voiceGuide.stop();
    setIsPlaying(false);
    onEnd?.();
  }, [onEnd]);

  const handleSelectTopic = (key: VoiceMessageKey) => {
    setActiveKey(key);
    const msgObj = VOICE_MESSAGES[key];
    const text = selectedLang === 'te' ? msgObj.te : msgObj.en;
    if (isPlaying) {
      voiceGuide.speak(
        text,
        selectedLang,
        onStart,
        onEnd,
        (err) => {
          console.warn('Voice guide topic switch error:', err);
        }
      );
    }
  };

  return (
    <section
      className={`voice-guide-card ${isPlaying ? 'voice-guide-active' : ''} ${compact ? 'voice-guide-compact' : ''} ${className}`}
      style={style}
      aria-label="Voice Accessibility Guide"
      role="region"
    >
      {/* Top Title & Live Soundwave Indicator */}
      <div className="voice-guide-header">
        <div className="voice-guide-title-wrap">
          <div className={`voice-guide-icon-badge ${isPlaying ? 'pulse-audio' : ''}`}>
            {isPlaying ? <Volume2 size={22} className="text-cyan" /> : <Volume2 size={22} />}
          </div>
          <div>
            <div className="voice-guide-badge-label">
              <span>🔊 {title}</span>
              {selectedLang === 'te' && <span className="voice-guide-subtag">వాయిస్ గైడ్</span>}
            </div>
            <p className="voice-guide-subtitle">
              {selectedLang === 'te'
                ? 'గ్రామీణ పౌరుల కోసం వాయిస్ సహాయం'
                : 'Spoken guide for citizens & rural communities'}
            </p>
          </div>
        </div>

        {/* Animated Soundwaves */}
        {isPlaying && (
          <div className="voice-soundwaves" aria-hidden="true" title="Playing audio...">
            <span className="wave-bar bar-1"></span>
            <span className="wave-bar bar-2"></span>
            <span className="wave-bar bar-3"></span>
            <span className="wave-bar bar-4"></span>
          </div>
        )}
      </div>

      {/* Guide Topics Quick Selector */}
      {availableKeys && availableKeys.length > 0 && (
        <div className="voice-guide-topics" role="tablist" aria-label="Voice guide topics">
          {availableKeys.map((key) => {
            const topic = VOICE_MESSAGES[key];
            const isTopicActive = activeKey === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isTopicActive}
                aria-label={`Topic: ${selectedLang === 'te' ? topic.labelTe : topic.labelEn}`}
                onClick={() => handleSelectTopic(key)}
                className={`voice-topic-chip ${isTopicActive ? 'active' : ''}`}
              >
                <Info size={13} />
                <span>{selectedLang === 'te' ? topic.labelTe : topic.labelEn}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Spoken Text Display Box */}
      <div className="voice-guide-caption-box" aria-live="polite">
        <p className="voice-guide-caption-text">
          "{currentText}"
        </p>
      </div>

      {/* Controls: Language Buttons & Play/Stop Buttons */}
      <div className="voice-guide-controls-bar">
        {/* Language Selection: [ English ] [ తెలుగు ] */}
        <div className="voice-guide-lang-group" role="group" aria-label="Language Selector">
          <span className="voice-guide-lang-label">
            <Languages size={14} /> Language:
          </span>
          <div className="voice-lang-buttons">
            <button
              type="button"
              className={`voice-lang-btn ${selectedLang === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
              aria-label="Switch voice guide language to English"
              aria-pressed={selectedLang === 'en'}
            >
              English
            </button>
            <button
              type="button"
              className={`voice-lang-btn ${selectedLang === 'te' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('te')}
              aria-label="వాయిస్ గైడ్ భాష తెలుగుకు మార్చండి (Telugu)"
              aria-pressed={selectedLang === 'te'}
            >
              తెలుగు
            </button>
          </div>
        </div>

        {/* Playback Controls: [ ▶ Play ] [ ⏹ Stop ] */}
        <div className="voice-guide-action-group" role="group" aria-label="Playback Controls">
          <button
            type="button"
            className={`btn voice-control-btn voice-btn-play ${isPlaying ? 'is-playing' : ''}`}
            onClick={handlePlay}
            aria-label={selectedLang === 'te' ? 'వాయిస్ గైడ్ వినండి (Play)' : 'Play voice guide'}
          >
            <Play size={16} fill="currentColor" />
            <span>{selectedLang === 'te' ? '▶ వినండి' : '▶ Play'}</span>
          </button>

          <button
            type="button"
            className="btn voice-control-btn voice-btn-stop"
            onClick={handleStop}
            disabled={!isPlaying}
            aria-label={selectedLang === 'te' ? 'వాయిస్ గైడ్ ఆపండి (Stop)' : 'Stop voice guide'}
          >
            <Square size={14} fill="currentColor" />
            <span>{selectedLang === 'te' ? '⏹ ఆపు' : '⏹ Stop'}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="voice-guide-notice" role="status">
          <VolumeX size={14} />
          <span>{notice}</span>
        </div>
      )}
    </section>
  );
};

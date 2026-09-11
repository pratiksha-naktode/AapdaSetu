export type VoiceLanguage = 'en' | 'te';

export type VoiceMessageKey = 'citizen_dashboard' | 'emergency_page' | 'location' | 'after_submission';

export interface BilingualMessage {
  en: string;
  te: string;
  labelEn: string;
  labelTe: string;
}

export const VOICE_MESSAGES: Record<VoiceMessageKey, BilingualMessage> = {
  citizen_dashboard: {
    en: 'Welcome to Varahi. To report an emergency, press the Report Emergency button.',
    te: 'వరాహికి స్వాగతం. అత్యవసర పరిస్థితిని తెలియజేయడానికి ఎమర్జెన్సీ రిపోర్ట్ బటన్ను నొక్కండి.',
    labelEn: 'Report Emergency',
    labelTe: 'ఎమర్జెన్సీ రిపోర్ట్'
  },
  emergency_page: {
    en: 'Please describe your emergency. You can type the details or use voice input.',
    te: 'మీ అత్యవసర పరిస్థితిని వివరించండి. మీరు వివరాలను టైప్ చేయవచ్చు లేదా వాయిస్ ద్వారా చెప్పవచ్చు.',
    labelEn: 'Voice & Details Input',
    labelTe: 'వాయిస్ & వివరాల నమోదు'
  },
  location: {
    en: 'Please allow location access so Varahi can identify your current location.',
    te: 'మీ ప్రస్తుత స్థానాన్ని గుర్తించడానికి లొకేషన్ అనుమతిని ఇవ్వండి.',
    labelEn: 'Location Permission',
    labelTe: 'లొకేషన్ అనుమతి'
  },
  after_submission: {
    en: 'Your emergency request has been received. Please stay calm. Help is being coordinated.',
    te: 'మీ అత్యవసర అభ్యర్థన అందింది. దయచేసి ప్రశాంతంగా ఉండండి. సహాయం కోసం సమన్వయం చేస్తున్నాము.',
    labelEn: 'After Submission',
    labelTe: 'సమర్పించిన తర్వాత'
  }
};

class VoiceGuideService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isSpeakingState: boolean = false;
  private listeners: Array<(speaking: boolean) => void> = [];

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const updateVoices = () => {
      try {
        this.voices = window.speechSynthesis.getVoices();
      } catch (err) {
        console.warn('Unable to retrieve speech synthesis voices:', err);
      }
    };

    updateVoices();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  public isSpeaking(): boolean {
    if (!this.isSupported()) return false;
    return this.isSpeakingState || window.speechSynthesis.speaking;
  }

  public subscribe(listener: (speaking: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(speaking: boolean) {
    this.isSpeakingState = speaking;
    this.listeners.forEach(listener => {
      try {
        listener(speaking);
      } catch (err) {
        console.error('Error notifying voice listener:', err);
      }
    });
  }

  public stop(): void {
    if (!this.isSupported()) return;

    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn('Error cancelling speech synthesis:', err);
    } finally {
      this.currentUtterance = null;
      this.notify(false);
    }
  }

  private getVoiceForLanguage(lang: VoiceLanguage): SpeechSynthesisVoice | null {
    if (this.voices.length === 0 && this.isSupported()) {
      try {
        this.voices = window.speechSynthesis.getVoices();
      } catch {
        // Fallback
      }
    }

    if (lang === 'te') {
      // Prioritize Telugu voices (te-IN or Telugu in name)
      const teluguVoice = this.voices.find(v =>
        v.lang === 'te-IN' ||
        v.lang.toLowerCase().startsWith('te') ||
        v.name.toLowerCase().includes('telugu')
      );
      if (teluguVoice) return teluguVoice;

      // Secondary check for Indian regional voices with Telugu tag
      const indianVoice = this.voices.find(v =>
        v.lang.includes('IN') && (v.name.toLowerCase().includes('telugu') || v.lang.startsWith('te'))
      );
      if (indianVoice) return indianVoice;

      return null;
    } else {
      // English: prefer Indian English (en-IN) for local natural accent, or en-US/en-GB
      const enInVoice = this.voices.find(v => v.lang === 'en-IN');
      if (enInVoice) return enInVoice;

      const anyEnVoice = this.voices.find(v => v.lang.toLowerCase().startsWith('en'));
      if (anyEnVoice) return anyEnVoice;

      return null;
    }
  }

  public speak(
    text: string,
    lang: VoiceLanguage,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): boolean {
    if (!this.isSupported()) {
      console.warn('Web Speech API is not supported in this browser.');
      onError?.(new Error('Speech synthesis not supported in this browser.'));
      return false;
    }

    if (!text || text.trim().length === 0) {
      return false;
    }

    // Stop any active utterance first to guarantee only one voice plays at a time
    this.stop();

    try {
      // Resume speech synthesis engine in case the browser froze it
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);

      // Set target language tag
      utterance.lang = lang === 'te' ? 'te-IN' : 'en-IN';
      utterance.rate = lang === 'te' ? 0.9 : 0.95; // Steady pace for clear rural comprehension
      utterance.pitch = 1.0;

      const matchedVoice = this.getVoiceForLanguage(lang);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        this.notify(true);
        onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        this.notify(false);
        onEnd?.();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        this.notify(false);
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          console.warn('SpeechSynthesis event error:', event.error);
          onError?.(event);
        }
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.error('Failed to start speech synthesis:', error);
      this.currentUtterance = null;
      this.notify(false);
      onError?.(error);
      return false;
    }
  }

  public getSavedLanguage(): VoiceLanguage {
    try {
      const saved = localStorage.getItem('varahi_voice_lang');
      if (saved === 'en' || saved === 'te') {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'en';
  }

  public saveLanguage(lang: VoiceLanguage): void {
    try {
      localStorage.setItem('varahi_voice_lang', lang);
    } catch {
      // Ignore
    }
  }
}

export const voiceGuide = new VoiceGuideService();

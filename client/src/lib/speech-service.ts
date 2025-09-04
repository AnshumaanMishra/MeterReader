interface SpeechConfig {
  rate: number;
  pitch: number;
  volume: number;
  voice: string;
  language: string;
}

export class SpeechService {
  private static instance: SpeechService;
  private config: SpeechConfig;
  private voices: SpeechSynthesisVoice[] = [];
  private isSupported: boolean;

  private constructor() {
    this.isSupported = 'speechSynthesis' in window;
    this.config = {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voice: 'default',
      language: 'en-US',
    };

    if (this.isSupported) {
      this.loadVoices();
      // Voices might load asynchronously
      speechSynthesis.addEventListener('voiceschanged', () => {
        this.loadVoices();
      });
    }
  }

  public static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService();
    }
    return SpeechService.instance;
  }

  private loadVoices(): void {
    this.voices = speechSynthesis.getVoices();
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  public updateConfig(newConfig: Partial<SpeechConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): SpeechConfig {
    return { ...this.config };
  }

  public isTextToSpeechSupported(): boolean {
    return this.isSupported;
  }

  public speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Text-to-speech is not supported in this browser'));
        return;
      }

      if (!text.trim()) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply configuration
      utterance.rate = this.config.rate;
      utterance.pitch = this.config.pitch;
      utterance.volume = this.config.volume;
      utterance.lang = this.config.language;

      // Set voice if specified and available
      if (this.config.voice !== 'default') {
        const selectedVoice = this.voices.find(voice => 
          voice.name === this.config.voice || voice.voiceURI === this.config.voice
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

      speechSynthesis.speak(utterance);
    });
  }

  public stop(): void {
    if (this.isSupported) {
      speechSynthesis.cancel();
    }
  }

  public pause(): void {
    if (this.isSupported) {
      speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (this.isSupported) {
      speechSynthesis.resume();
    }
  }

  public formatReadingForSpeech(value: string, quantity: string, unit: string): string {
    let formattedValue = value;
    
    // Handle decimal points
    formattedValue = formattedValue.replace(/\./g, ' point ');
    
    // Handle negative values
    if (formattedValue.startsWith('-')) {
      formattedValue = 'negative ' + formattedValue.substring(1);
    }

    // Handle special units for better pronunciation
    const unitMap: { [key: string]: string } = {
      'V': 'volts',
      'mV': 'millivolts',
      'kV': 'kilovolts',
      'A': 'amperes',
      'mA': 'milliamperes',
      'μA': 'microamperes',
      'Ω': 'ohms',
      'kΩ': 'kilohms',
      'MΩ': 'megohms',
      'Hz': 'hertz',
      'kHz': 'kilohertz',
      'MHz': 'megahertz',
      'F': 'farads',
      'μF': 'microfarads',
      'nF': 'nanofarads',
      'pF': 'picofarads',
    };

    const spokenUnit = unitMap[unit] || unit;
    const spokenQuantity = quantity.toLowerCase();

    return `${spokenQuantity} reading: ${formattedValue} ${spokenUnit}`;
  }

  public speakReading(value: string, quantity: string, unit: string): Promise<void> {
    const speechText = this.formatReadingForSpeech(value, quantity, unit);
    return this.speak(speechText);
  }
}

export const speechService = SpeechService.getInstance();

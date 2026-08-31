/**
 * High-performance Web Speech API Text-to-Speech Engine
 */

export interface SpeechState {
  isPlaying: boolean;
  isPaused: boolean;
  currentSentenceIndex: number;
  totalSentences: number;
  currentText: string;
  rate: number; // 0.8 to 2.0
}

export class DocumentNarrator {
  private synth: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private sentences: string[] = [];
  private currentIndex: number = 0;
  private rate: number = 1.0;
  private voices: SpeechSynthesisVoice[] = [];
  private onStateChange: (state: SpeechState) => void = () => {};

  constructor(onStateChange?: (state: SpeechState) => void) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();

      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
    if (onStateChange) {
      this.onStateChange = onStateChange;
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    const available = this.synth.getVoices();
    if (available && available.length > 0) {
      this.voices = available;
    }
  }

  private getBestVoice(): SpeechSynthesisVoice | null {
    if (this.voices.length === 0 && this.synth) {
      this.loadVoices();
    }
    const voiceList = this.voices;
    if (voiceList.length === 0) return null;

    // Prefer high-quality natural/enhanced English voices
    const naturalVoice = voiceList.find(
      (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen') || v.name.includes('Serena')) && v.lang.startsWith('en')
    );
    if (naturalVoice) return naturalVoice;

    // Fallback to any English voice
    const anyEnglish = voiceList.find((v) => v.lang.startsWith('en'));
    if (anyEnglish) return anyEnglish;

    // Default voice
    return voiceList.find((v) => v.default) || voiceList[0] || null;
  }

  private keepAliveTimer: any = null;

  private startKeepAlive() {
    this.stopKeepAlive();
    // Chromium bug workaround: speech synthesis can freeze or drop onend after ~15s
    this.keepAliveTimer = setInterval(() => {
      if (this.synth && this.synth.speaking && !this.synth.paused) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 10000);
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  public setMarkdown(markdown: string) {
    this.stop();
    if (!markdown || !markdown.trim()) {
      this.sentences = [];
      this.currentIndex = 0;
      this.emitState();
      return;
    }

    // Clean markdown into clean spoken sentences
    const cleanText = markdown
      .replace(/```[\s\S]*?```/g, ' [Code block omitted] ')
      .replace(/`[^`]+`/g, ' ')
      .replace(/\$\$[\s\S]*?\$\$/g, ' [Mathematical equation] ')
      .replace(/\$[^\$]+?\$/g, ' [formula] ')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/\[\^[^\]]+\]/g, '')
      .replace(/[*_~`#|]/g, ' ')
      .replace(/\n+/g, '. ');

    // Break into distinct sentences
    this.sentences = cleanText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);

    this.currentIndex = 0;
    this.emitState();
  }

  public setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(2.5, rate));
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      // Restart current sentence with new rate
      this.speakSentence(this.currentIndex);
    } else {
      this.emitState();
    }
  }

  public play() {
    if (!this.synth || this.sentences.length === 0) return;

    if (this.synth.paused) {
      this.synth.resume();
      this.startKeepAlive();
      this.emitState();
      return;
    }

    this.speakSentence(this.currentIndex);
  }

  public pause() {
    if (!this.synth) return;
    this.stopKeepAlive();
    this.synth.pause();
    this.emitState();
  }

  public stop() {
    this.stopKeepAlive();
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
    this.emitState();
  }

  public next() {
    if (this.currentIndex < this.sentences.length - 1) {
      this.currentIndex++;
      this.speakSentence(this.currentIndex);
    }
  }

  public prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.speakSentence(this.currentIndex);
    }
  }

  public seek(index: number) {
    if (index >= 0 && index < this.sentences.length) {
      this.currentIndex = index;
      this.speakSentence(this.currentIndex);
    }
  }

  private speakSentence(index: number) {
    if (!this.synth || index < 0 || index >= this.sentences.length) {
      this.stop();
      return;
    }

    try {
      this.synth.cancel();
    } catch {}

    const sentence = this.sentences[index];
    if (!sentence || !sentence.trim()) {
      if (this.currentIndex < this.sentences.length - 1) {
        this.currentIndex++;
        this.speakSentence(this.currentIndex);
      } else {
        this.stop();
      }
      return;
    }

    this.utterance = new SpeechSynthesisUtterance(sentence);
    this.utterance.rate = this.rate;

    const voice = this.getBestVoice();
    if (voice) {
      this.utterance.voice = voice;
    }

    this.utterance.onend = () => {
      if (this.currentIndex < this.sentences.length - 1) {
        this.currentIndex++;
        this.speakSentence(this.currentIndex);
      } else {
        this.currentIndex = 0;
        this.stop();
      }
    };

    this.utterance.onerror = (e) => {
      // Ignore 'interrupted' / 'canceled' errors from speech switching
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('SpeechSynthesis error:', e.error);
      }
      this.emitState();
    };

    this.startKeepAlive();
    try {
      this.synth.speak(this.utterance);
    } catch (e) {
      console.warn('Failed to speak sentence:', e);
      this.stop();
    }
    this.emitState();
  }


  private emitState() {
    const isSpeaking = Boolean(this.synth?.speaking);
    const isPaused = Boolean(this.synth?.paused);
    this.onStateChange({
      isPlaying: isSpeaking && !isPaused,
      isPaused: isPaused,
      currentSentenceIndex: this.currentIndex,
      totalSentences: this.sentences.length,
      currentText: this.sentences[this.currentIndex] || '',
      rate: this.rate,
    });
  }

  public destroy() {
    this.stop();
    if (this.synth && this.synth.onvoiceschanged) {
      this.synth.onvoiceschanged = null;
    }
    this.onStateChange = () => {};
  }
}

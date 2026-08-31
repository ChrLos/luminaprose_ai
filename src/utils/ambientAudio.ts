// Web Audio API procedural sound synthesizer for distraction-free focus writing

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private currentType: string | null = null;
  private mainGainNode: GainNode | null = null;
  private activeSources: (AudioScheduledSourceNode | AudioNode)[] = [];
  private isPlaying = false;
  private volume = 0.3;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public unlockAudio() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public play(type: 'rain' | 'whitenoise' | 'forest' | 'binaural' | 'waves', volume = 0.3) {
    this.initContext();
    if (!this.ctx) return;

    // Always stop any prior running nodes before playing new soundscape
    this.stop();

    this.currentType = type;
    this.volume = volume;
    this.isPlaying = true;

    this.mainGainNode = this.ctx.createGain();
    this.mainGainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.mainGainNode.connect(this.ctx.destination);

    if (type === 'binaural') {
      this.createBinauralBeats();
    } else {
      this.createProceduralNoise(type);
    }
  }

  private createProceduralNoise(type: 'rain' | 'whitenoise' | 'forest' | 'waves') {
    if (!this.ctx || !this.mainGainNode) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'whitenoise') {
        data[i] = white * 0.15;
      } else if (type === 'rain' || type === 'waves') {
        // Brown noise / Pink noise
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 1.5;
      } else {
        // Forest gentle rustle
        data[i] = (lastOut + 0.05 * white) / 1.05;
        lastOut = data[i];
      }
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filterNode = this.ctx.createBiquadFilter();

    if (type === 'rain') {
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(800, this.ctx.currentTime);
    } else if (type === 'waves') {
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(450, this.ctx.currentTime);
    } else if (type === 'forest') {
      filterNode.type = 'bandpass';
      filterNode.frequency.setValueAtTime(1200, this.ctx.currentTime);
      filterNode.Q.setValueAtTime(1.2, this.ctx.currentTime);
    } else {
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(2500, this.ctx.currentTime);
    }

    noise.connect(filterNode);
    filterNode.connect(this.mainGainNode);
    noise.start(0);

    this.activeSources.push(noise, filterNode);
  }

  private createBinauralBeats() {
    if (!this.ctx || !this.mainGainNode) return;

    // 216Hz left channel, 226Hz right channel -> 10Hz Alpha brainwave focus beat
    const oscLeft = this.ctx.createOscillator();
    const oscRight = this.ctx.createOscillator();
    const merger = this.ctx.createChannelMerger(2);

    oscLeft.type = 'sine';
    oscRight.type = 'sine';
    oscLeft.frequency.setValueAtTime(216, this.ctx.currentTime);
    oscRight.frequency.setValueAtTime(226, this.ctx.currentTime);

    const gainL = this.ctx.createGain();
    const gainR = this.ctx.createGain();
    gainL.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gainR.gain.setValueAtTime(0.25, this.ctx.currentTime);

    oscLeft.connect(gainL);
    oscRight.connect(gainR);

    gainL.connect(merger, 0, 0);
    gainR.connect(merger, 0, 1);

    merger.connect(this.mainGainNode);

    oscLeft.start();
    oscRight.start();

    // Track ALL audio nodes so stop() terminates both oscillators and all gain paths
    this.activeSources.push(oscLeft, oscRight, gainL, gainR, merger);
  }

  public playKeyClick(type: 'standard' | 'backspace' | 'enter' = 'standard') {
    try {
      this.initContext();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.dispatchKeyClick(type);
        }).catch(() => {});
        return;
      }

      this.dispatchKeyClick(type);
    } catch {
      // Audio autoplay policy catch
    }
  }

  private dispatchKeyClick(type: 'standard' | 'backspace' | 'enter') {
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'backspace') {
        // Deeper, heavier mechanical thud for Backspace/Delete
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(460 + Math.random() * 60, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(75, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      } else if (type === 'enter') {
        // Crisp chime/carrier return for Enter
        osc.type = 'sine';
        osc.frequency.setValueAtTime(820 + Math.random() * 80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(130, this.ctx.currentTime + 0.06);

        gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
      } else {
        // Standard mechanical click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700 + Math.random() * 200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {
      // Audio node failure catch
    }
  }

  public setVolume(vol: number) {
    this.volume = vol;
    if (this.mainGainNode && this.ctx) {
      this.mainGainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  public stop() {
    // 1. Immediately mute the main gain node
    if (this.mainGainNode && this.ctx) {
      try {
        this.mainGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        this.mainGainNode.disconnect();
      } catch {
        // Ignore disconnect error
      }
      this.mainGainNode = null;
    }

    // 2. Stop and disconnect every active audio source and node
    for (const source of this.activeSources) {
      try {
        if ('stop' in source && typeof (source as any).stop === 'function') {
          (source as any).stop();
        }
        source.disconnect();
      } catch {
        // Ignore node teardown errors
      }
    }
    this.activeSources = [];

    this.isPlaying = false;
    this.currentType = null;
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying,
      currentType: this.currentType,
      volume: this.volume,
    };
  }
}

export const ambientAudio = new AmbientSoundEngine();

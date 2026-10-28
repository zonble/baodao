// Retro Web Audio API Synthesizer for 寶島風情畫
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.6;
    this.sfxGain.connect(this.masterGain);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.35;
    this.bgmGain.connect(this.masterGain);
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.5;
    }
    return this.muted;
  }

  playLaser() {
    if (this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  playEnemyLaser() {
    if (this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.15);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  playHit() {
    if (this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.setValueAtTime(130, t + 0.03);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  playExplosion(large = false) {
    if (this.muted) return;
    this.ensureContext();
    const duration = large ? 0.6 : 0.25;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(large ? 400 : 800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(large ? 0.6 : 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
  }

  playTrapRumble() {
    if (this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.linearRampToValueAtTime(160, t + 0.3);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  playTrapCrash() {
    if (this.muted) return;
    this.playExplosion(true);
  }

  playWarning() {
    if (this.muted) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(500, t + 0.15);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  playPowerup() {
    if (this.muted) return;
    this.ensureContext();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  playBomb() {
    if (this.muted) return;
    this.ensureContext();
    this.playExplosion(true);
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.9);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.9);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.9);
  }

  playVictory() {
    if (this.muted) return;
    this.ensureContext();
    const fanfare = [
      { f: 523.25, d: 0.15 },
      { f: 659.25, d: 0.15 },
      { f: 783.99, d: 0.15 },
      { f: 1046.5, d: 0.4 },
      { f: 880, d: 0.2 },
      { f: 1046.5, d: 0.6 }
    ];
    let offset = 0;
    fanfare.forEach((n) => {
      const t = this.ctx.currentTime + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(n.f, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + n.d);
      offset += n.d * 0.9;
    });
  }

  playGameOver() {
    if (this.muted) return;
    this.ensureContext();
    const seq = [440, 415.3, 392, 349.23];
    seq.forEach((f, idx) => {
      const t = this.ctx.currentTime + idx * 0.22;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // 8-bit FM Chiptune Background Music Generator
  startBgm() {
    if (this.bgmPlaying) return;
    this.ensureContext();
    this.bgmPlaying = true;
    this.bgmStep = 0;

    // Fast 16-step bassline & arpeggio in D minor
    const bassNotes = [
      146.83, 146.83, 146.83, 146.83, // D3
      174.61, 174.61, 196.00, 196.00, // F3, G3
      220.00, 220.00, 196.00, 196.00, // A3, G3
      174.61, 164.81, 146.83, 130.81  // F3, E3, D3, C3
    ];

    const leadNotes = [
      293.66, 349.23, 440.00, 523.25,
      587.33, 523.25, 440.00, 349.23,
      440.00, 523.25, 587.33, 698.46,
      659.25, 587.33, 523.25, 440.00
    ];

    const stepInterval = 135; // ~111 BPM sixteenth notes

    const tick = () => {
      if (!this.bgmPlaying) return;
      if (!this.muted && this.ctx) {
        const t = this.ctx.currentTime;
        const step = this.bgmStep % 16;

        // Bass channel
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassNotes[step], t);
        bassGain.gain.setValueAtTime(0.18, t);
        bassGain.gain.exponentialRampToValueAtTime(0.01, t + 0.11);
        bassOsc.connect(bassGain);
        bassGain.connect(this.bgmGain);
        bassOsc.start(t);
        bassOsc.stop(t + 0.12);

        // Lead / Arp channel
        if (step % 2 === 0 || step === 7 || step === 15) {
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();
          leadOsc.type = 'square';
          leadOsc.frequency.setValueAtTime(leadNotes[step], t);
          leadGain.gain.setValueAtTime(0.1, t);
          leadGain.gain.exponentialRampToValueAtTime(0.005, t + 0.14);
          leadOsc.connect(leadGain);
          leadGain.connect(this.bgmGain);
          leadOsc.start(t);
          leadOsc.stop(t + 0.14);
        }

        // Percussion / Hi-hat (noise pulse on off-beats)
        if (step % 4 === 2) {
          const bSize = Math.floor(this.ctx.sampleRate * 0.04);
          const buf = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
          const chData = buf.getChannelData(0);
          for (let i = 0; i < bSize; i++) chData[i] = Math.random() * 2 - 1;
          const noiseSrc = this.ctx.createBufferSource();
          noiseSrc.buffer = buf;
          const pGain = this.ctx.createGain();
          pGain.gain.setValueAtTime(0.08, t);
          pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          noiseSrc.connect(pGain);
          pGain.connect(this.bgmGain);
          noiseSrc.start(t);
        }
      }

      this.bgmStep++;
      this.bgmTimer = setTimeout(tick, stepInterval);
    };

    tick();
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const sounds = new SoundSystem();

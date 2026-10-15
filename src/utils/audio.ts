/**
 * Web Audio API Synthesizer for Conga Clash
 * Generates authentic Latin conga percussion, rhythms, horns, and celebratory arcade SFX.
 */

class CongaAudioSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.65;
  private isMusicPlaying: boolean = false;
  private loopIntervalId: number | null = null;
  private beatCounter: number = 0;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isMusicPlaying) {
      this.stopMusic();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  public isBgmRunning(): boolean {
    return this.isMusicPlaying;
  }

  // --- Sound Effect Generators ---

  /** Low open Conga drum beat */
  public playCongaLow(timeOffset = 0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime + timeOffset;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.18);

    gain.gain.setValueAtTime(0.6 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /** High crisp Conga slap tone */
  public playCongaHigh(timeOffset = 0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime + timeOffset;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);

    gain.gain.setValueAtTime(0.55 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  /** Latin Cowbell ping */
  public playCowbell(timeOffset = 0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime + timeOffset;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const bandpass = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(800, t);
    bandpass.Q.setValueAtTime(3.5, t);

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(587, t); // D5
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(845, t); // G#5

    gain.gain.setValueAtTime(0.2 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc1.connect(bandpass);
    osc2.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.15);
    osc2.stop(t + 0.15);
  }

  /** Carnival Whistle chirp ("Tweet-tweet!") */
  public playWhistle() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [
      { f: 2200, d: 0.08, delay: 0 },
      { f: 2600, d: 0.12, delay: 0.1 },
      { f: 2200, d: 0.07, delay: 0.25 },
      { f: 2900, d: 0.22, delay: 0.35 },
    ];

    notes.forEach((n) => {
      const t = now + n.delay;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, t);
      osc.frequency.linearRampToValueAtTime(n.f * 1.05, t + n.d);

      gain.gain.setValueAtTime(0.25 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + n.d + 0.02);
    });
  }

  /** Rock-Paper-Scissors 1-2-3 Countdown tick */
  public playCountdownTick(step: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freqs = [350, 440, 550, 750];
    const targetFreq = freqs[Math.min(step, freqs.length - 1)];

    osc.type = step >= 3 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(targetFreq, t);

    gain.gain.setValueAtTime(0.4 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /** Sound when player clicks Rock, Paper, or Scissors */
  public playSelectSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.08);

    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** Victorious Conga Recruitment Fanfare & "HEY!" */
  public playWinRecruit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Energetic brass triad arpeggio: C5 -> E5 -> G5 -> C6
    const chord = [
      { f: 523.25, t: 0 },
      { f: 659.25, t: 0.08 },
      { f: 783.99, t: 0.16 },
      { f: 1046.50, t: 0.25, d: 0.4 },
    ];

    chord.forEach((note) => {
      const t = now + note.t;
      const duration = note.d || 0.18;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.45 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + duration + 0.05);
    });

    // Whistle kicker right after
    setTimeout(() => {
      this.playWhistle();
    }, 300);
  }

  /**
   * Triggers localized crowd cheering when a duel is won,
   * with volume and cheer intensity dynamically scaling based on the size of the conga line!
   * @param congaLineSize Number of dancers currently in the conga line
   * @param pan Spatial stereo pan position from -1.0 (far left) to 1.0 (far right), 0 = center
   * @param volumeScale Additional multiplier for distance attenuation or subtle ambiance (0.0 to 1.5)
   */
  public playCrowdCheer(congaLineSize: number = 1, pan: number = 0, volumeScale: number = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Calculate dynamic volume scaling based on conga line size
    // 1 dancer: ~0.35, 5 dancers: ~0.55, 12 dancers: ~0.75, 25+ dancers: 1.0
    const normalizedSize = Math.max(1, congaLineSize);
    const scaleFactor = Math.min(1.0, 0.32 + 0.16 * Math.log2(normalizedSize));
    const finalVolume = this.volume * scaleFactor * Math.max(0, Math.min(1.5, volumeScale));

    // 2. Setup spatial stereo panner
    let pannerNode: StereoPannerNode | null = null;
    const clampedPan = Math.max(-1, Math.min(1, pan));
    if (typeof this.ctx.createStereoPanner === 'function') {
      try {
        pannerNode = this.ctx.createStereoPanner();
        pannerNode.pan.setValueAtTime(clampedPan, now);
        pannerNode.connect(this.ctx.destination);
      } catch {
        pannerNode = null;
      }
    }

    const connectToOutput = (node: AudioNode) => {
      if (pannerNode) {
        node.connect(pannerNode);
      } else {
        node.connect(this.ctx!.destination);
      }
    };

    // Duration scales with conga size (1.2s for small, up to 3.5s for massive lines)
    const cheerDuration = Math.min(3.5, 1.2 + Math.min(normalizedSize, 35) * 0.08);

    // Layer A: Pink/White Formant-Filtered Noise (Crowd Roar "WOOOOO / YAAAAAY")
    const bufferSize = Math.floor(this.ctx.sampleRate * cheerDuration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.2;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const formantFilter1 = this.ctx.createBiquadFilter();
    formantFilter1.type = 'bandpass';
    formantFilter1.frequency.setValueAtTime(650, now);
    formantFilter1.Q.setValueAtTime(2.2, now);

    const formantFilter2 = this.ctx.createBiquadFilter();
    formantFilter2.type = 'bandpass';
    formantFilter2.frequency.setValueAtTime(1750, now);
    formantFilter2.Q.setValueAtTime(2.8, now);

    const roarGain = this.ctx.createGain();
    roarGain.gain.setValueAtTime(0.001, now);
    roarGain.gain.exponentialRampToValueAtTime(0.55 * finalVolume, now + 0.25);
    roarGain.gain.exponentialRampToValueAtTime(0.001, now + cheerDuration);

    noiseSource.connect(formantFilter1);
    noiseSource.connect(formantFilter2);
    formantFilter1.connect(roarGain);
    formantFilter2.connect(roarGain);
    connectToOutput(roarGain);

    noiseSource.start(now);
    noiseSource.stop(now + cheerDuration);

    // Layer B: Harmonic Vocal Cheering Glides ("WOO-HOO!")
    // Number of cheering voices scales with conga size (1 voice up to 6 voices)
    const voiceCount = Math.min(6, 1 + Math.floor(normalizedSize / 3));
    for (let v = 0; v < voiceCount; v++) {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      const delay = v * 0.07 + Math.random() * 0.08;
      const startFreq = 280 + Math.random() * 140 + v * 35;
      const peakFreq = startFreq * (1.35 + Math.random() * 0.35);

      osc.type = v % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(startFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(peakFreq, now + delay + 0.35);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.85, now + delay + 0.9);

      oscGain.gain.setValueAtTime(0.001, now + delay);
      oscGain.gain.exponentialRampToValueAtTime((0.18 / Math.sqrt(voiceCount)) * finalVolume, now + delay + 0.2);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.9);

      osc.connect(oscGain);
      connectToOutput(oscGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.95);
    }

    // Layer C: Handclaps (Clap density scales with conga line size)
    const clapCount = Math.min(20, 3 + Math.floor(normalizedSize * 0.65));
    for (let c = 0; c < clapCount; c++) {
      const clapTime = now + 0.12 + (c * 0.11) + (Math.random() - 0.5) * 0.05;
      if (clapTime >= now + cheerDuration) break;

      const clapOsc = this.ctx.createOscillator();
      const clapFilter = this.ctx.createBiquadFilter();
      const clapGain = this.ctx.createGain();

      clapOsc.type = 'square';
      clapOsc.frequency.setValueAtTime(1100 + Math.random() * 900, clapTime);

      clapFilter.type = 'highpass';
      clapFilter.frequency.setValueAtTime(950, clapTime);

      clapGain.gain.setValueAtTime(0.14 * finalVolume, clapTime);
      clapGain.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.045);

      clapOsc.connect(clapFilter);
      clapFilter.connect(clapGain);
      connectToOutput(clapGain);

      clapOsc.start(clapTime);
      clapOsc.stop(clapTime + 0.05);
    }

    // Layer D: For lines >= 6 dancers, celebratory whistle chirp
    if (normalizedSize >= 6) {
      setTimeout(() => {
        this.playWhistle();
      }, 350);
    }
  }

  /**
   * Alias for playCrowdCheer to trigger localized crowd cheering sounds when a duel is won,
   * scaling volume based on the size of the current conga line.
   */
  public triggerDuelCheer(congaLineSize: number = 1, pan: number = 0, volumeScale: number = 1.0) {
    this.playCrowdCheer(congaLineSize, pan, volumeScale);
  }

  /** Tie sound */
  public playTieSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [400, 400].forEach((freq, idx) => {
      const t = now + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  /** Defeat / Lost dancer sound */
  public playLoseSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const tones = [
      { f: 440, t: 0 },
      { f: 415, t: 0.15 },
      { f: 392, t: 0.3 },
      { f: 330, t: 0.45, d: 0.4 },
    ];

    tones.forEach((tone) => {
      const t = now + tone.t;
      const d = tone.d || 0.18;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(tone.f, t);
      osc.frequency.exponentialRampToValueAtTime(tone.f * 0.9, t + d);

      gain.gain.setValueAtTime(0.2 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + d);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + d + 0.05);
    });
  }

  /** Power-up picked up sound */
  public playPowerUpSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);

    gain.gain.setValueAtTime(0.4 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  /** Coin pickup / reward chime */
  public playCoinChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1975.53, now + 0.08); // B6 overtone

    gain.gain.setValueAtTime(0.3 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.08);
    osc1.stop(now + 0.38);
    osc2.stop(now + 0.38);
  }

  /** Level up / unlock fanfare */
  public playFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0, d: 0.1 },
      { f: 659.25, t: 0.1, d: 0.1 },
      { f: 783.99, t: 0.2, d: 0.12 },
      { f: 1046.50, t: 0.32, d: 0.35 },
    ];
    notes.forEach((n) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0.4 * this.volume, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.05);
    });
  }

  /** Crash on defeat */
  public playLoseCrash() {
    this.playLoseSound();
  }

  /** Move selected sound */
  public playMoveSelect() {
    this.playSelectSound();
  }

  /** Move hover / message chime */
  public playMoveHover() {
    this.playCountdownTick(1);
  }

  /** Chime sound */
  public playChime() {
    this.playCoinChime();
  }

  /** Pop / click sound */
  public playPop() {
    this.playSelectSound();
  }

  /** Duel initiated sound */
  public playDuelStart() {
    this.playWhistle();
    this.playCountdownTick(3);
  }


  // --- Background Conga Loop (Tumbao / 1-2-3-Kick) ---

  public startMusic() {
    if (this.isMusicPlaying || this.isMuted) return;
    this.initContext();
    this.isMusicPlaying = true;
    this.beatCounter = 0;

    // 120 BPM => 1 beat = 500ms, sixteenth-notes = 125ms
    const stepMs = 150; // energetic conga tempo

    this.loopIntervalId = window.setInterval(() => {
      if (this.isMuted || !this.isMusicPlaying) return;

      const step = this.beatCounter % 16;
      // Conga pattern:
      // Steps 0, 4, 8, 12 are downbeats
      // Conga slap on 4 & 12
      // Open tones on 8, 10, 14
      // Cowbell on every 2 steps
      // Whistle on step 15 before the loop resets
      if (step === 0 || step === 8) {
        this.playCongaLow();
      }
      if (step === 4 || step === 12) {
        this.playCongaHigh();
      }
      if (step === 10 || step === 14) {
        this.playCongaLow(0.05);
      }
      if (step % 4 === 2) {
        this.playCowbell();
      }

      this.beatCounter++;
    }, stepMs);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.loopIntervalId !== null) {
      clearInterval(this.loopIntervalId);
      this.loopIntervalId = null;
    }
  }

  public toggleMusic(): boolean {
    if (this.isMusicPlaying) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }
}

export const audioSystem = new CongaAudioSystem();
export const soundManager = audioSystem;

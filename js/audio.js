const STORAGE_MUTED = "embruns:muted";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambient = null;
    this.noiseBuffer = null;
    this.reverb = null;
    this.scene = "intro";
    this.muted = false;
    this.started = false;
    this.gullTimer = null;

    try {
      this.muted = window.localStorage.getItem(STORAGE_MUTED) === "1";
    } catch {
      this.muted = false;
    }
  }

  get isMuted() {
    return this.muted;
  }

  get isReady() {
    return Boolean(this.ctx && this.ctx.state === "running");
  }

  async unlock() {
    if (!this.ctx) {
      this.init();
    }

    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        return;
      }
    }

    if (!this.started) {
      this.started = true;
      this.ambient.gain.cancelScheduledValues(this.ctx.currentTime);
      this.ambient.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.ambient.gain.exponentialRampToValueAtTime(
        this.ambientLevel(this.scene),
        this.ctx.currentTime + 2.4
      );
      this.scheduleGull();
    }
  }

  init() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;

    this.ctx = new AudioCtor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0.0001 : 0.72;

    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.24;

    this.master.connect(compressor);
    compressor.connect(this.ctx.destination);

    this.ambient = this.ctx.createGain();
    this.ambient.gain.value = 0.0001;
    this.ambient.connect(this.master);

    this.reverb = this.createReverb(2.2, 2.8);
    const wet = this.ctx.createGain();
    wet.gain.value = 0.18;
    this.reverb.connect(wet);
    wet.connect(this.master);

    this.noiseBuffer = this.createNoiseBuffer(4.5);
    this.startWind();
    this.startSea();
  }

  setScene(scene) {
    this.scene = scene;
    if (!this.ctx || !this.started) return;

    const now = this.ctx.currentTime;
    this.ambient.gain.cancelScheduledValues(now);
    this.ambient.gain.setValueAtTime(
      Math.max(0.0001, this.ambient.gain.value),
      now
    );
    this.ambient.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, this.ambientLevel(scene)),
      now + 1.3
    );
  }

  ambientLevel(scene) {
    const levels = {
      intro: 0.72,
      playing: 1,
      paused: 0.16,
      dying: 0.4,
      gameover: 0.48
    };
    return levels[scene] ?? 0.6;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);

    try {
      window.localStorage.setItem(STORAGE_MUTED, this.muted ? "1" : "0");
    } catch {
      // Storage is optional.
    }

    if (!this.ctx || !this.master) return;

    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
    this.master.gain.exponentialRampToValueAtTime(
      this.muted ? 0.0001 : 0.72,
      now + 0.35
    );
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  createNoiseBuffer(seconds) {
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);

    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      let last = 0;

      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        last = last * 0.97 + white * 0.03;
        data[i] = white * 0.46 + last * 0.9;
      }
    }

    return buffer;
  }

  createReverb(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = this.ctx.createBuffer(2, length, rate);

    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const t = i / length;
        data[i] =
          (Math.random() * 2 - 1) *
          Math.pow(1 - t, decay) *
          (1 - Math.exp(-i / (rate * 0.015)));
      }
    }

    const convolver = this.ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
  }

  startWind() {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 460;
    filter.Q.value = 0.62;

    const high = this.ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 110;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.032;

    const swell = this.ctx.createOscillator();
    swell.type = "sine";
    swell.frequency.value = 0.058;

    const swellDepth = this.ctx.createGain();
    swellDepth.gain.value = 0.012;

    swell.connect(swellDepth);
    swellDepth.connect(gain.gain);

    const pan = this.ctx.createStereoPanner();
    pan.pan.value = -0.18;
    const drift = this.ctx.createOscillator();
    drift.type = "sine";
    drift.frequency.value = 0.027;
    const driftDepth = this.ctx.createGain();
    driftDepth.gain.value = 0.34;
    drift.connect(driftDepth);
    driftDepth.connect(pan.pan);

    source.connect(filter);
    filter.connect(high);
    high.connect(gain);
    gain.connect(pan);
    pan.connect(this.ambient);

    source.start();
    swell.start();
    drift.start();
  }

  startSea() {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    source.playbackRate.value = 0.7;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 190;
    filter.Q.value = 0.4;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.042;

    const swell = this.ctx.createOscillator();
    swell.type = "sine";
    swell.frequency.value = 0.083;

    const swellDepth = this.ctx.createGain();
    swellDepth.gain.value = 0.025;

    const pan = this.ctx.createStereoPanner();
    pan.pan.value = 0.14;

    swell.connect(swellDepth);
    swellDepth.connect(gain.gain);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(pan);
    pan.connect(this.ambient);

    source.start();
    swell.start();
  }

  scheduleGull() {
    if (this.gullTimer) window.clearTimeout(this.gullTimer);

    this.gullTimer = window.setTimeout(() => {
      if (this.ctx && !this.muted && this.scene !== "paused") {
        this.playGull();
      }
      this.scheduleGull();
    }, 6500 + Math.random() * 9000);
  }

  playGull() {
    if (!this.isReady || this.muted) return;

    const now = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.3 - 0.65;
    pan.connect(this.master);

    const calls = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < calls; i += 1) {
      const at = now + i * (0.18 + Math.random() * 0.08);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(1250 + Math.random() * 240, at);
      osc.frequency.exponentialRampToValueAtTime(760 + Math.random() * 160, at + 0.21);

      filter.type = "bandpass";
      filter.frequency.value = 1350;
      filter.Q.value = 2.2;

      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.011, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(pan);
      osc.start(at);
      osc.stop(at + 0.28);
    }
  }

  playFlap() {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.playbackRate.value = 1.8;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(760, now);
    filter.frequency.exponentialRampToValueAtTime(210, now + 0.2);
    filter.Q.value = 0.72;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    const body = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    body.type = "sine";
    body.frequency.setValueAtTime(186, now);
    body.frequency.exponentialRampToValueAtTime(92, now + 0.14);
    bodyGain.gain.setValueAtTime(0.05, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    body.connect(bodyGain);
    bodyGain.connect(this.master);
    body.start(now);
    body.stop(now + 0.17);

    noise.start(now, Math.random() * 2.2, 0.28);
  }

  playScore(score = 0) {
    if (!this.isReady || this.muted) return;

    const scale = [523.25, 587.33, 659.25, 783.99, 880];
    const base = scale[Math.min(scale.length - 1, score % scale.length)];
    const now = this.ctx.currentTime;

    [1, 2.002, 3.004].forEach((partial, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = index === 0 ? "triangle" : "sine";
      osc.frequency.value = base * partial;
      filter.type = "lowpass";
      filter.frequency.value = 3700;
      filter.Q.value = 0.5;

      const level = 0.055 / (index + 1);
      const duration = index === 0 ? 0.45 : 0.28;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(level, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      if (this.reverb) {
        const send = this.ctx.createGain();
        send.gain.value = 0.2;
        gain.connect(send);
        send.connect(this.reverb);
      }
      osc.start(now);
      osc.stop(now + duration + 0.02);
    });
  }

  playHit(cause = "pipe") {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = cause === "water" ? "sine" : "triangle";
    osc.frequency.setValueAtTime(cause === "water" ? 120 : 92, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.34);

    filter.type = "lowpass";
    filter.frequency.value = 330;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.48);

    if (cause === "water") {
      this.playSplash();
    } else {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.playbackRate.value = 0.9;
      const scrape = this.ctx.createBiquadFilter();
      scrape.type = "bandpass";
      scrape.frequency.value = 1150;
      scrape.Q.value = 1.8;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.09, now + 0.008);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      noise.connect(scrape);
      scrape.connect(noiseGain);
      noiseGain.connect(this.master);
      noise.start(now, Math.random() * 2, 0.28);
    }
  }

  playSplash() {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = 1.2;

    const high = this.ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 520;

    const low = this.ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.setValueAtTime(4200, now);
    low.frequency.exponentialRampToValueAtTime(740, now + 0.7);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.17, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    source.connect(high);
    high.connect(low);
    low.connect(gain);
    gain.connect(this.master);
    source.start(now, Math.random() * 1.8, 0.85);
  }

  playNewRecord() {
    if (!this.isReady || this.muted) return;

    const now = this.ctx.currentTime;
    const notes = [392, 523.25, 659.25, 783.99];

    notes.forEach((frequency, index) => {
      const at = now + index * 0.13;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.055, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
      osc.connect(gain);
      gain.connect(this.master);
      if (this.reverb) {
        const send = this.ctx.createGain();
        send.gain.value = 0.32;
        gain.connect(send);
        send.connect(this.reverb);
      }
      osc.start(at);
      osc.stop(at + 0.75);
    });
  }

  playButton() {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.055);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

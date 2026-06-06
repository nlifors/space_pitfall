// All sound is synthesized at runtime with the Web Audio API — no asset files,
// no loading. One master gain feeds the speakers; muting just ramps it to zero
// so scheduled music keeps running silently and resumes seamlessly.
//
// Browsers forbid starting audio without a user gesture, so unlock() must be
// called from a click/keypress (the Launch button) before anything will sound.

// A short, space-y minor-pentatonic arpeggio for the background loop. `null` is
// a rest. Frequencies in Hz; one entry per eighth-note step.
const MUSIC = [
  220.0, 261.6, 329.6, 392.0, 329.6, 261.6, 196.0, 261.6,
  174.6, 261.6, 329.6, 440.0, 392.0, 329.6, 261.6, null,
];
const MUSIC_TEMPO = 0.26; // seconds per step

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicOn = false;
    this._musicTimer = null;
    this._step = 0;
    this._nextNoteTime = 0;
    this.VOL = 0.85;
  }

  // Create/resume the audio context. Safe to call repeatedly; only acts on a
  // real context. Must originate from a user gesture the first time.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return; // no Web Audio support -> game runs silently
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.VOL;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.VOL, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  // ---- low-level voices -----------------------------------------------------

  // A single enveloped oscillator. `at` is an absolute context time (used by the
  // music scheduler); omit it for "play now + optional `when` offset".
  _tone({ type = "square", freq = 440, dur = 0.15, vol = 0.3, attack = 0.005,
          glideTo = null, when = 0, at = null }) {
    if (!this.ctx) return;
    const t0 = at ?? this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Decaying filtered noise — for impacts/death.
  _noise({ dur = 0.3, vol = 0.3, cutoff = 1200 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  // ---- one-shot sound effects ----------------------------------------------

  jump() { this._tone({ type: "square", freq: 300, glideTo: 640, dur: 0.16, vol: 0.20 }); }
  grab() { this._tone({ type: "sine", freq: 480, glideTo: 920, dur: 0.12, vol: 0.20 }); }
  release() { this._tone({ type: "sine", freq: 720, glideTo: 360, dur: 0.14, vol: 0.16 }); }

  collect() {
    this._tone({ type: "triangle", freq: 880, dur: 0.08, vol: 0.22 });
    this._tone({ type: "triangle", freq: 1320, dur: 0.12, vol: 0.22, when: 0.07 });
  }

  death() {
    this._tone({ type: "sawtooth", freq: 420, glideTo: 70, dur: 0.5, vol: 0.28 });
    this._noise({ dur: 0.4, vol: 0.22, cutoff: 900 });
  }

  sector() {
    [523, 659, 784].forEach((f, i) =>
      this._tone({ type: "square", freq: f, dur: 0.12, vol: 0.18, when: i * 0.08 }));
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) =>
      this._tone({ type: "square", freq: f, dur: 0.20, vol: 0.20, when: i * 0.12 }));
  }

  // ---- background music (lookahead scheduler) -------------------------------

  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this._step = 0;
    this._nextNoteTime = this.ctx.currentTime + 0.1;
    // setInterval only *schedules* notes a little ahead of the audio clock, so
    // timing stays sample-accurate even if the timer itself is jittery.
    this._musicTimer = setInterval(() => this._schedule(), 25);
  }

  stopMusic() {
    this.musicOn = false;
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }

  _schedule() {
    if (!this.musicOn || !this.ctx) return;
    while (this._nextNoteTime < this.ctx.currentTime + 0.2) {
      const note = MUSIC[this._step];
      if (note) {
        // soft melodic voice
        this._tone({ type: "triangle", freq: note, dur: 0.24, vol: 0.07, at: this._nextNoteTime });
        // sub-octave bass pulse on the downbeats
        if (this._step % 4 === 0) {
          this._tone({ type: "sine", freq: note / 2, dur: 0.34, vol: 0.09, at: this._nextNoteTime });
        }
      }
      this._nextNoteTime += MUSIC_TEMPO;
      this._step = (this._step + 1) % MUSIC.length;
    }
  }
}

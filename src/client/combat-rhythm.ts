export type RhythmHit = { kind: 'low' | 'rim'; gain: number };
export function rhythmHit(
  step: number,
  beatsPerBar: number,
  phase: number,
  brutal: boolean,
): RhythmHit | undefined {
  const bar = Math.max(2, Math.round(beatsPerBar * 2));
  const at = ((step % bar) + bar) % bar;
  const p = Math.max(0, Math.min(3, Math.floor(phase)));
  if (at === 0) return { kind: 'low', gain: 0.12 + p * 0.012 };
  if (p >= 1 && at === Math.floor(bar / 2)) return { kind: 'low', gain: 0.085 };
  if (p >= 2 && at === bar - 2) return { kind: 'rim', gain: 0.06 };
  if (brutal && at === bar - 1) return { kind: 'rim', gain: 0.075 };
  return undefined;
}

export function rhythmWave(kind: 'low' | 'rim', rate: number) {
  const duration = kind === 'low' ? 0.19 : 0.085;
  const wave = new Float32Array(Math.ceil(rate * duration));
  let phase = 0,
    noise = 7183;
  for (let n = 0; n < wave.length; n++) {
    const t = n / rate;
    noise = (Math.imul(noise, 1664525) + 1013904223) >>> 0;
    const hz = kind === 'low' ? 58 + 115 * Math.exp(-t * 32) : 190 + 155 * Math.exp(-t * 48);
    phase += (2 * Math.PI * hz) / rate;
    const attack = Math.min(1, t / 0.0025);
    wave[n] =
      attack *
      Math.exp(-t / (kind === 'low' ? 0.043 : 0.018)) *
      (Math.sin(phase) * 0.82 + ((noise / 0xffffffff) * 2 - 1) * (kind === 'low' ? 0.06 : 0.18));
  }
  return wave;
}

// A quiet score-synchronized drum layer; original theme masters and user volume stay intact.
export class CombatRhythm {
  private context?: AudioContext;
  private bus?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private epoch = 0;
  private nextStep = 0;
  private bpm = 108;
  private meter = 4;
  private phase = 0;
  private brutal = false;
  private volume = 0;
  private duckUntil = 0;
  private buffers = new Map<string, AudioBuffer>();
  private voices = new Set<AudioBufferSourceNode>();
  constructor(private audible: () => boolean = () => true) {}
  start(context: AudioContext, bpm: number, beatsPerBar: number, epoch: number) {
    this.stop();
    this.context = context;
    this.epoch = epoch;
    this.nextStep = 0;
    this.bpm = Math.max(40, Math.min(240, bpm));
    this.meter = beatsPerBar;
    this.bus = context.createGain();
    this.bus.connect(context.destination);
    for (const kind of ['low', 'rim'] as const) {
      const wave = rhythmWave(kind, context.sampleRate),
        buffer = context.createBuffer(1, wave.length, context.sampleRate);
      buffer.copyToChannel(wave, 0);
      this.buffers.set(kind, buffer);
    }
    this.refreshGain();
    this.tick();
    this.timer = setInterval(() => this.tick(), 100);
  }
  configure(phase: number, brutal: boolean, volume: number, duckUntil: number) {
    this.phase = phase;
    this.brutal = brutal;
    this.volume = Math.max(0, Math.min(1, volume));
    this.duckUntil = duckUntil;
    this.refreshGain();
  }
  private refreshGain() {
    if (!this.bus || !this.context) return;
    const now = this.context.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setTargetAtTime(this.volume * (now < this.duckUntil ? 0.55 : 1), now, 0.025);
    if (now < this.duckUntil) this.bus.gain.setTargetAtTime(this.volume, this.duckUntil, 0.18);
  }
  tick() {
    const c = this.context;
    if (!c || !this.bus) return;
    const now = c.currentTime,
      secondsPerStep = 30 / this.bpm;
    this.nextStep = Math.max(this.nextStep, Math.ceil((now - this.epoch) / secondsPerStep));
    if (!this.audible() || this.volume <= 0 || c.state !== 'running') return;
    const end = now + 0.18;
    for (let guard = 0; guard < 4; guard++) {
      const at = this.epoch + this.nextStep * secondsPerStep;
      if (at > end) break;
      const hit = rhythmHit(this.nextStep++, this.meter, this.phase, this.brutal);
      if (!hit || this.voices.size >= 8) continue;
      const source = c.createBufferSource(),
        gain = c.createGain();
      source.buffer = this.buffers.get(hit.kind)!;
      gain.gain.value = hit.gain;
      source.connect(gain).connect(this.bus);
      this.voices.add(source);
      source.onended = () => {
        this.voices.delete(source);
        source.disconnect();
        gain.disconnect();
      };
      source.start(Math.max(at, now));
    }
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    for (const voice of this.voices)
      try {
        voice.stop();
      } catch {}
    this.voices.clear();
    this.bus?.disconnect();
    this.bus = undefined;
    this.context = undefined;
    this.buffers.clear();
  }
}

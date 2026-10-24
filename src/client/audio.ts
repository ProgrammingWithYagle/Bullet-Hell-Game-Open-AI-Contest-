import type { BossId } from '../shared/protocol.ts';
import { musicIdentity } from './boss-music.ts';
const sfx = import.meta.glob('../../assets/audio/sfx/*.wav', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const themes = import.meta.glob('../../assets/production/audio/boss-themes/*.wav', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
import city from '../../assets/audio/music/city-wake.wav?url';
export class AudioBus {
  private context?: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer>>();
  private music?: AudioBufferSourceNode;
  private voices = new Map<AudioBufferSourceNode, GainNode>();
  private active = 0;
  private last = new Map<string, number>();
  private loopRevision = 0;
  private duckUntil = 0;
  volume = 0.45;
  musicVolume = 0.3;
  async unlock() {
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') await this.context.resume();
  }
  private async buffer(url: string) {
    const old = this.buffers.get(url);
    if (old) return old;
    let promise = this.loading.get(url);
    if (!promise) {
      promise = fetch(url)
        .then((r) => {
          if (!r.ok) throw Error('Audio unavailable');
          return r.arrayBuffer();
        })
        .then((a) => this.context!.decodeAudioData(a));
      this.loading.set(url, promise);
    }
    try {
      const buffer = await promise;
      this.buffers.set(url, buffer);
      return buffer;
    } finally {
      this.loading.delete(url);
    }
  }
  private musicLevel(gain: GainNode, now: number) {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(this.musicVolume * (now < this.duckUntil ? 0.55 : 1), now, 0.025);
    if (now < this.duckUntil) gain.gain.setTargetAtTime(this.musicVolume, this.duckUntil, 0.18);
  }
  async sound(id: string) {
    if (!this.context || document.hidden || this.active >= 12) return;
    const now = performance.now();
    if (now - (this.last.get(id) ?? -Infinity) < 60) return;
    this.last.set(id, now);
    const url = sfx['../../assets/audio/sfx/' + id + '.wav'];
    if (!url) return;
    try {
      const buffer = await this.buffer(url);
      if (document.hidden || this.active >= 12) return;
      const source = this.context.createBufferSource(),
        gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = this.volume;
      source.connect(gain).connect(this.context.destination);
      this.active++;
      source.onended = () => {
        this.active--;
        source.disconnect();
        gain.disconnect();
      };
      if (['warning', 'boss-phase', 'downed', 'accord-success'].includes(id) && this.volume > 0) {
        const time = this.context.currentTime;
        this.duckUntil = time + 0.42;
        const musicGain = this.music && this.voices.get(this.music);
        if (musicGain) this.musicLevel(musicGain, time);
      }
      source.start();
    } catch {}
  }
  async loop(combat: boolean, boss: BossId = 'constable') {
    if (!this.context) return;
    const revision = ++this.loopRevision,
      id = musicIdentity(combat, boss);
    const url = combat ? themes['../../assets/production/audio/boss-themes/' + id + '.wav'] : city;
    if (!url) return;
    try {
      const buffer = await this.buffer(url);
      if (revision !== this.loopRevision || this.music?.buffer === buffer) return;
      const now = this.context.currentTime;
      for (const [old, gain] of this.voices) {
        gain.gain.cancelAndHoldAtTime(now);
        gain.gain.linearRampToValueAtTime(0, now + 0.75);
        old.stop(now + 0.76);
      }
      const source = this.context.createBufferSource(),
        gain = this.context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      source.connect(gain).connect(this.context.destination);
      gain.gain.linearRampToValueAtTime(
        this.musicVolume * (now < this.duckUntil ? 0.55 : 1),
        now + 0.75,
      );
      source.onended = () => {
        this.voices.delete(source);
        source.disconnect();
        gain.disconnect();
      };
      this.voices.set(source, gain);
      source.start();
      this.music = source;
      // Decoded music is larger than PCM. Keep at most three old theme buffers.
      const musicKeys = [...this.buffers.keys()].filter(
        (key) => key === city || Object.values(themes).includes(key),
      );
      for (const key of musicKeys
        .filter((key) => key !== url)
        .slice(0, Math.max(0, musicKeys.length - 3)))
        this.buffers.delete(key);
    } catch {}
  }
  setVolume(value: number, music: number) {
    this.volume = value;
    this.musicVolume = music;
    const gain = this.music && this.voices.get(this.music);
    if (gain && this.context) this.musicLevel(gain, this.context.currentTime);
  }
  stop() {
    this.loopRevision++;
    for (const source of this.voices.keys()) source.stop();
    this.music = undefined;
  }
}

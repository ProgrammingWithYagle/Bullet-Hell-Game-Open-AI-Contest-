import {isBellSound,playBellSound} from './bell-sound.ts';
import phaseTurn from '../../assets/production/audio/cues/phase-turn-v1.wav?url';
import { CombatRhythm } from './combat-rhythm.ts';
import tempos from './music-tempos.json';
import deliveryLibrary from '../../assets/production/audio/delivery/library.json';
import { chooseMusicBuffer } from './audio-delivery.ts';
const delivery = import.meta.glob('../../assets/production/audio/delivery/*.mp3', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
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

// Firefox and older WebKit do not consistently expose cancelAndHoldAtTime.
// Sample before cancellation so interrupting a fade does not jump to its endpoint.
function holdGain(param: AudioParam, now: number) {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    try { param.cancelAndHoldAtTime(now); return; } catch {}
  }
  const value = param.value;
  param.cancelScheduledValues(now);
  param.setValueAtTime(value, now);
}
export class AudioBus {
  private context?: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer>>();
  private music?: AudioBufferSourceNode;
  private voices = new Map<AudioBufferSourceNode, GainNode>();
  private active = 0;
  private last = new Map<string, number>();
  private loopRevision = 0;
  private failedDelivery = new Set<string>();
  private duckUntil = 0;
  private rhythm = new CombatRhythm(() => !document.hidden);
  private encounterPhase = 0;
  private encounterBrutal = false;
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
  setEncounterIntensity(phase: number, variant: string) {
    this.encounterPhase = phase;
    this.encounterBrutal = variant !== 'normal';
    this.rhythm.configure(phase, this.encounterBrutal, this.musicVolume, this.duckUntil);
  }
  private musicLevel(gain: GainNode, now: number) {
    this.rhythm.configure(
      this.encounterPhase,
      this.encounterBrutal,
      this.musicVolume,
      this.duckUntil,
    );
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(this.musicVolume * (now < this.duckUntil ? 0.55 : 1), now, 0.025);
    if (now < this.duckUntil) gain.gain.setTargetAtTime(this.musicVolume, this.duckUntil, 0.18);
  }
  async sound(id: string) {
    if (!this.context || document.hidden || this.active >= (id==='boss-phase'||id==='boss-defeated'?12:10)) return;
    const now = performance.now();
    if (now - (this.last.get(id) ?? -Infinity) < 60) return;
    this.last.set(id, now);
    if(isBellSound(id)){
      if(this.volume<=0)return;
      this.active++;
      try{playBellSound(this.context,id,this.volume,()=>this.active--);}catch{this.active--;}
      return;
    }
    const url = id==='boss-phase'?phaseTurn:sfx['../../assets/audio/sfx/' + (id==='boss-defeated'?'accord-success':id) + '.wav'];
    if (!url) return;
    try {
      const buffer = await this.buffer(url);
      if (document.hidden || this.active >= (id==='boss-phase'||id==='boss-defeated'?12:10)) return;
      const source = this.context.createBufferSource(),
        gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = this.volume*(id==='boss-phase'?1.15:1);
      source.connect(gain).connect(this.context.destination);
      this.active++;
      source.onended = () => {
        this.active--;
        source.disconnect();
        gain.disconnect();
      };
      if (['warning', 'boss-phase', 'downed', 'accord-success', 'boss-defeated'].includes(id) && this.volume > 0) {
        const time = this.context.currentTime;
        this.duckUntil = time + (id==='boss-phase'||id==='boss-defeated'?.9:.42);
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
    const track = deliveryLibrary.tracks.find((t) => t.id === id);
    if (!track) return;
    const compressed = delivery['../../' + track.deliveryPath],
      master = combat ? themes['../../' + track.masterPath] : city;
    if (!compressed || !master) return;
    try {
      const { buffer, url } = await chooseMusicBuffer(
        { compressed, master, frames: track.frames, rate: track.sampleRate },
        (url) => this.buffer(url),
        this.failedDelivery,
        (url) => {
          this.buffers.delete(url);
        },
      );
      if (revision !== this.loopRevision || this.music?.buffer === buffer) return;
      const now = this.context.currentTime;
      for (const [old, gain] of this.voices) {
        holdGain(gain.gain, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.75);
        old.stop(now + 0.76);
      }
      const source = this.context.createBufferSource(),
        gain = this.context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.setValueAtTime(0, now);
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
      this.rhythm.stop();
      if (combat) {
        const tempo = tempos[boss];
        this.rhythm.configure(
          this.encounterPhase,
          this.encounterBrutal,
          this.musicVolume,
          this.duckUntil,
        );
        this.rhythm.start(this.context, tempo.bpm, tempo.beatsPerBar, now);
      }
      this.music = source;
      // Decoded music is larger than PCM. Keep at most three old theme buffers.
      const musicKeys = [...this.buffers.keys()].filter(
        (key) =>
          key === city ||
          Object.values(themes).includes(key) ||
          Object.values(delivery).includes(key),
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
    this.rhythm.stop();
    this.loopRevision++;
    for (const source of this.voices.keys()) source.stop();
    this.music = undefined;
  }
}

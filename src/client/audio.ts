const sfx = import.meta.glob('../../assets/audio/sfx/*.wav', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
import city from '../../assets/audio/music/city-wake.wav?url';
import vigil from '../../assets/audio/music/vigil-engine.wav?url';
export class AudioBus {
  private context?: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer>>();
  private music?: AudioBufferSourceNode;
  private gain?: GainNode;
  private active = 0;
  private last = new Map<string, number>();
  private loopRevision = 0;
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
        .then((r) => r.arrayBuffer())
        .then((a) => this.context!.decodeAudioData(a));
      this.loading.set(url, promise);
    }
    const buffer = await promise;
    this.buffers.set(url, buffer);
    return buffer;
  }
  async sound(id: string) {
    if (!this.context || document.hidden || this.active >= 12) return;
    const now = performance.now();
    if (now - (this.last.get(id) ?? -Infinity) < 60) return;
    this.last.set(id, now);
    const url = sfx['../../assets/audio/sfx/' + id + '.wav'];
    if (!url) return;
    try {
      const buffer = await this.buffer(url),
        source = this.context.createBufferSource(),
        gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = this.volume;
      source.connect(gain).connect(this.context.destination);
      this.active++;
      source.onended = () => this.active--;
      source.start();
    } catch {}
  }
  async loop(combat: boolean) {
    if (!this.context) return;
    const revision = ++this.loopRevision,
      url = combat ? vigil : city;
    try {
      const buffer = await this.buffer(url);
      if (revision !== this.loopRevision || this.music?.buffer === buffer) return;
      this.music?.stop();
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      this.gain = this.context.createGain();
      this.gain.gain.value = this.musicVolume;
      source.connect(this.gain).connect(this.context.destination);
      source.start();
      this.music = source;
    } catch {}
  }
  setVolume(value: number, music: number) {
    this.volume = value;
    this.musicVolume = music;
    if (this.gain) this.gain.gain.value = music;
  }
  stop() {
    this.loopRevision++;
    this.music?.stop();
    this.music = undefined;
  }
}

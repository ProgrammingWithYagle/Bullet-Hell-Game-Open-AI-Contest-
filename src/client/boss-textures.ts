// A small atlas cache for the current replicated boss. Shared actors stay preloaded.
import references from '../../assets/delivery/boss-loading-v2/library.json';
export const bossTextureReferences = references;
export const BOSS_ATLAS_CAPACITY = 2;
export const BOSS_ATLAS_RETRY_MS = 5000;
const dynamic = new Set(references.lazyBossIds);
const support = new Set(references.alwaysLoadedIds);
const settledIds = new Set(references.settledReferences.map((entry) => entry.bossId));
export const isDeferredBoss = (id: string) => dynamic.has(id);
export const isSharedEncounter = (id: string) => support.has(id);

type BaseLoader = {
  image(key: string, url: string): unknown;
  spritesheet(
    key: string,
    url: string,
    options: { frameWidth: number; frameHeight: number },
  ): unknown;
};
export function preloadBossTextureBase(
  loader: BaseLoader,
  clips: { bossId: string; cellSize: number }[],
  animations: Record<string, string>,
  identities: Record<string, string>,
  settledIdentities: Record<string, string> = {},
) {
  for (const clip of clips) {
    if (!support.has(clip.bossId)) continue;
    const key = clip.bossId + '-action',
      url = animations[key];
    if (!url) throw new Error('Missing shared encounter URL: ' + key);
    loader.spritesheet(key, url, { frameWidth: clip.cellSize, frameHeight: clip.cellSize });
  }
  for (const reference of references.entries) {
    const key = reference.bossId + '-reference',
      url = identities[reference.bossId];
    if (!url) throw new Error('Missing boss identity URL: ' + key);
    loader.image(key, url);
  }
  for (const reference of references.settledReferences) {
    const key = reference.bossId + '-defeat-reference',
      url = settledIdentities[reference.bossId];
    if (!url) throw new Error('Missing boss settled identity URL: ' + reference.bossId);
    loader.image(key, url);
  }
}

export function bossTexturePose(id: string, frame: number, fullAtlasReady: boolean) {
  return !dynamic.has(id) || fullAtlasReady
    ? { key: id + '-action', frame }
    : {
        key: id + (settledIds.has(id) && frame >= 8 ? '-defeat-reference' : '-reference'),
        frame: 0,
      };
}

type Backend = { load(id: string): Promise<void>; evict(id: string): void };
export class BossTextureCache {
  private wanted: string | null = null;
  private inflight: string | null = null;
  private loaded = new Set<string>();
  private retryAt = new Map<string, number>();
  private disposed = false;
  private failures = 0;
  private lastClock = 0;
  constructor(
    private backend: Backend,
    private now: () => number,
  ) {}

  private time() {
    const value = this.now();
    if (Number.isFinite(value)) this.lastClock = Math.max(this.lastClock, value);
    return this.lastClock;
  }

  request(id: string) {
    if (this.disposed) return;
    this.wanted = dynamic.has(id) ? id : null;
    if (this.wanted && this.loaded.delete(this.wanted)) this.loaded.add(this.wanted);
    this.pump();
  }

  private trim(limit: number) {
    while (this.loaded.size > limit) {
      const oldest = this.loaded.values().next().value!;
      this.loaded.delete(oldest);
      this.backend.evict(oldest);
    }
  }

  private pump() {
    const id = this.wanted;
    if (
      this.disposed ||
      !id ||
      this.inflight ||
      this.loaded.has(id) ||
      this.time() < (this.retryAt.get(id) ?? 0)
    )
      return;
    // Reserve room before decoding the next image, so a completion cannot create a third atlas.
    this.trim(BOSS_ATLAS_CAPACITY - 1);
    this.inflight = id;
    let work: Promise<void>;
    try {
      work = this.backend.load(id);
    } catch (error) {
      work = Promise.reject(error);
    }
    void work.then(
      () => {
        if (this.disposed || this.wanted !== id) this.backend.evict(id);
        else {
          this.loaded.add(id);
          this.retryAt.delete(id);
        }
        this.inflight = null;
        this.pump();
      },
      () => {
        this.inflight = null;
        if (this.disposed) return;
        this.failures++;
        this.retryAt.set(id, this.time() + BOSS_ATLAS_RETRY_MS);
        this.pump();
      },
    );
  }

  diagnostics() {
    return {
      wanted: this.wanted,
      loading: this.inflight,
      loaded: [...this.loaded],
      capacity: BOSS_ATLAS_CAPACITY,
      failedLoads: this.failures,
      disposed: this.disposed,
    };
  }

  dispose() {
    this.disposed = true;
    this.wanted = null;
    this.inflight = null;
    for (const id of this.loaded) this.backend.evict(id);
    this.loaded.clear();
    this.retryAt.clear();
  }
}

type TextureHolder = {
  frame?: { name: number | string };
  texture?: { key: string };
  anims?: { stop(): unknown };
  setTexture(key: string, frame?: number | string): unknown;
};
export function retireBossTexture(
  id: string,
  holder: TextureHolder | undefined,
  textures: { exists(key: string): boolean; remove(key: string): unknown },
) {
  const key = id + '-action';
  // Phaser requires users to release the texture before its GPU resource is destroyed.
  if (holder?.texture?.key === key) {
    holder.anims?.stop();
    const settled = settledIds.has(id) && Number(holder.frame?.name) >= 8;
    holder.setTexture(id + (settled ? '-defeat-reference' : '-reference'), 0);
  }
  if (textures.exists(key)) textures.remove(key);
}

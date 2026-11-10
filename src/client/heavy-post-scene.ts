import {
  nativePostedTextureDefinitions, postedRenderPlan, applyPostedSprite,
  PostedWeaponLayer, type DrawnSprite, type PostedRenderPlan,
} from "./heavy-post-renderer.ts";

type BodySprite = DrawnSprite & { anims: { stop(): unknown }; setFlipX(flip: boolean): unknown };
type Atlas = ReturnType<typeof nativePostedTextureDefinitions>[number]['atlas'];
type AtlasLoader = { atlas(key: string, textureURL: string, data: Atlas): unknown };
type Visual = Parameters<typeof postedRenderPlan>[3];
type Actor = Parameters<typeof postedRenderPlan>[0];
type Frame = Parameters<typeof postedRenderPlan>[1];
type Point = { x: number; y: number };

/** Keep odd-sized native sheets intact; Phaser receives measured atlas rectangles. */
export function preloadPostedHeavy(load: AtlasLoader, urls: Readonly<Record<string, string>>) {
  const definitions = nativePostedTextureDefinitions();
  const resolved = definitions.map(t => {
    const url = urls[t.key];
    if (!url) throw Error('Missing posted Heavy texture: ' + t.key);
    return { ...t, url };
  });
  for (const t of resolved) load.atlas(t.key, t.url, t.atlas);
}

/** Scene lifecycle adapter: reuse the actor sprite, own only the actual posted weapon. */
export class PostedHeavyScene {
  private plans: PostedRenderPlan[] = [];
  private weapons: PostedWeaponLayer;
  constructor(createWeapon: () => DrawnSprite) {
    this.weapons = new PostedWeaponLayer(createWeapon);
  }
  beginFrame() { this.plans = []; }
  apply(body: BodySprite, actor: Actor, view: Frame, localId: string, visual: Visual) {
    const plan = postedRenderPlan(actor, view, localId, visual);
    if (!plan) return undefined;
    body.anims.stop();
    body.setFlipX(false);
    applyPostedSprite(body, plan.body);
    this.plans.push(plan);
    return plan;
  }
  endFrame(line: (a: Point, b: Point) => void) {
    this.weapons.sync(this.plans, line);
    this.plans = [];
  }
  clear() { this.plans = []; this.weapons.clear(); }
}

import art from "../../assets/production/motion/heavy-post-2026-11-10/library.json";
import { tetherRadius } from "../shared/heavy-traverse.ts";
import { HZ } from "../shared/protocol.ts";
import { postFrame } from "./heavy-post-presentation.ts";
import type { PlayerView, View } from "../shared/view.ts";
import type { SurvivorFacing } from "./survivor-visual-motion.ts";
type Point = { x: number; y: number };
type BodyAction = { action: string; facing: SurvivorFacing; frame: number };
type SpritePlan = { texture: string; frame: number; at: Point; origin: readonly number[]; scale: number; rotation: number; depth: number };
export type PostedRenderPlan = { owner: string; body: SpritePlan; weapon: SpritePlan; actualPaidFiringFrame: boolean; localControlLine?: readonly [Point, Point] };

/** Phaser JSON-hash atlas descriptors use the native PNG unchanged, including odd-sized cells. */
export function nativePostedTextureDefinitions() {
  const textures = [...art.textures, { ...art.weapon, frames: [{ index: 0, x: 0, y: 0, width: art.weapon.nativeSize[0], height: art.weapon.nativeSize[1] }] }];
  return textures.map(t => ({ key: t.key, file: t.file, sha256: t.sha256, atlas: {
    frames: Object.fromEntries(t.frames.map(f => [String(f.index), { frame: { x: f.x, y: f.y, w: f.width, h: f.height }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: f.width, h: f.height }, sourceSize: { w: f.width, h: f.height } }])),
    meta: { size: { w: t.nativeSize[0], h: t.nativeSize[1] } },
  } }));
}

/** Actual post authority selects body-only art; prediction may move only the same visible body. */
export function postedRenderPlan(p: PlayerView, view: Pick<View, 'phase' | 'combatTick'>, localId: string,
  visual: { moving: boolean; facing: SurvivorFacing; combatTick: number; reduceMotion?: boolean; action?: BodyAction; drawnBody?: Pick<PlayerView, 'id' | 'x' | 'y'> }): PostedRenderPlan | undefined {
  const post = postFrame(p, view.phase, view.combatTick, localId);
  if (!post) return;
  const hurt = visual.action?.action === 'hurt';
  const facing = hurt ? visual.action!.facing : visual.facing;
  const key = hurt ? 'hux-free-hurt' : visual.moving && !visual.reduceMotion ? 'hux-free-walk-' + facing : 'hux-free-idle';
  const texture = art.textures.find(t => t.key === key)!;
  const index = hurt ? art.facings.indexOf(facing) + (Math.min(1, Math.max(0, visual.action!.frame)) * 4) : key.startsWith('hux-free-walk-') ? Math.floor(Math.max(0, visual.combatTick) * texture.fps / HZ) % 8 : art.facings.indexOf(facing);
  const frame = texture.frames[index];
  const drawn = visual.drawnBody, validDrawn = p.id === localId && drawn?.id === p.id && [drawn.x, drawn.y].every(Number.isFinite) && Math.hypot(drawn.x - post.origin.x, drawn.y - post.origin.y) <= tetherRadius;
  const body = validDrawn ? { x: drawn!.x, y: drawn!.y } : { ...post.body };
  return { owner: p.id,
    body: { texture: key, frame: index, at: body, origin: frame.origin, scale: texture.displayScale, rotation: 0, depth: 5 + body.y / 1000 },
    weapon: { texture: art.weapon.key, frame: 0, at: { ...post.origin }, origin: art.weapon.origin, scale: art.weapon.displayScale, rotation: post.bearing, depth: 5 + post.origin.y / 1000 + 0.001 },
    actualPaidFiringFrame: post.firing,
    ...(post.localControlLine ? { localControlLine: [{ ...body }, { ...post.origin }] as const } : {}),
  };
}

export type DrawnSprite = {
  setTexture(key: string, frame: number): DrawnSprite; setPosition(x: number, y: number): DrawnSprite;
  setOrigin(x: number, y: number): DrawnSprite; setScale(scale: number): DrawnSprite;
  setRotation(radians: number): DrawnSprite; setDepth(depth: number): DrawnSprite; destroy(): void;
};
export function applyPostedSprite(sprite: DrawnSprite, plan: SpritePlan) {
  sprite.setTexture(plan.texture, plan.frame).setPosition(plan.at.x, plan.at.y).setOrigin(plan.origin[0], plan.origin[1]).setScale(plan.scale).setRotation(plan.rotation).setDepth(plan.depth);
}

/** One actual posted weapon per actor; the scene applies the body plan to its existing actor sprite. */
export class PostedWeaponLayer {
  private weapons = new Map<string, DrawnSprite>();
  constructor(private create: () => DrawnSprite) {}
  sync(plans: readonly PostedRenderPlan[], line: (a: Point, b: Point) => void) {
    const active = new Set<string>();
    for (const plan of plans) {
      active.add(plan.owner);
      let sprite = this.weapons.get(plan.owner);
      if (!sprite) { sprite = this.create(); this.weapons.set(plan.owner, sprite); }
      applyPostedSprite(sprite, plan.weapon);
      if (plan.localControlLine) line(plan.localControlLine[0], plan.localControlLine[1]);
    }
    for (const [owner, sprite] of this.weapons) if (!active.has(owner)) { sprite.destroy(); this.weapons.delete(owner); }
  }
  clear() { for (const sprite of this.weapons.values()) sprite.destroy(); this.weapons.clear(); }
}

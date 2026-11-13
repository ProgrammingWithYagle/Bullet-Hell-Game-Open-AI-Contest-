import catalog from '../../content/catalog.json';
import { constructHit, type Construct } from './class-kits.ts';
import { distance, segmentRect, type Rect } from './geometry.ts';
import type { Vec } from './protocol.ts';

const lineRules = catalog.rules.heavyLinework;
const rules = catalog.rules.heavyLineworkGuide;
const rollerOffset = catalog.rules.playerRadius + 3;

export type GuideSupport = { point: Vec; foot: Vec; support: Rect };
export type LineworkGuide = GuideSupport & { at: number };
type GuideWorld = {
  obstacles: readonly Rect[];
  masonry: readonly Rect[];
  bounds?: Rect;
  constructs?(): readonly Construct[];
};
type GuideAnchor = { origin: Vec; normal: Vec; paidLength: number };

export function lineworkEye(line: GuideAnchor) {
  return { x: line.origin.x + line.normal.x * 1.25, y: line.origin.y + line.normal.y * 1.25 };
}

export function clearLineworkSpan(
  from: Vec,
  to: Vec,
  world: Pick<GuideWorld, 'obstacles' | 'constructs'>,
) {
  return (
    !world.obstacles.some((rect) => segmentRect(from, to, rect, 1) !== null) &&
    !(world.constructs?.() ?? []).some((body) => constructHit(from, to, body, 1) !== null)
  );
}

export function lineworkLength(body: Vec, line: GuideAnchor & { guide?: LineworkGuide }) {
  return line.guide
    ? distance(body, line.guide.point) + distance(line.guide.point, line.origin)
    : distance(body, line.origin);
}

export function canRedirectLinework(
  body: Vec,
  line: GuideAnchor & { guide?: LineworkGuide },
  world: GuideWorld,
) {
  return (
    !!line.guide &&
    distance(body, line.guide.point) <= rules.redirectReach &&
    clearLineworkSpan(body, lineworkEye(line), world)
  );
}

/** Select a nearby supported corner in the aimed cone, or intersect an actual wall face. */
export function pickLineworkGuide(
  body: Vec,
  aim: number,
  line: GuideAnchor,
  world: GuideWorld,
): GuideSupport | undefined {
  const direction = { x: Math.cos(aim), y: Math.sin(aim) };
  const eye = lineworkEye(line);
  const { bounds } = world;
  if (!bounds) return;
  const radius = catalog.rules.playerRadius;
  const legal = (point: Vec, length: number) =>
    length >= 1 &&
    length <= rules.setReach &&
    point.x >= bounds.x + radius &&
    point.x <= bounds.x + bounds.width - radius &&
    point.y >= bounds.y + radius &&
    point.y <= bounds.y + bounds.height - radius &&
    length + distance(point, line.origin) <=
      Math.min(lineRules.maximumLength, line.paidLength + lineRules.slack) &&
    !world.obstacles.some((rect) => segmentRect(point, point, rect, radius) !== null) &&
    clearLineworkSpan(body, point, world) &&
    clearLineworkSpan(point, eye, world);

  let selected: GuideSupport | undefined,
    bestAlignment = Math.cos(rules.cornerHalfAngle);
  for (const support of world.masonry)
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        const foot = {
          x: support.x + (sx > 0 ? support.width : 0),
          y: support.y + (sy > 0 ? support.height : 0),
        };
        const point = { x: foot.x + sx * rollerOffset, y: foot.y + sy * rollerOffset };
        const length = distance(body, point);
        const alignment =
          ((point.x - body.x) * direction.x + (point.y - body.y) * direction.y) / length;
        if (alignment <= bestAlignment || !legal(point, length)) continue;
        bestAlignment = alignment;
        selected = { point, foot, support: { ...support } };
      }
  if (selected) return selected;

  const end = {
    x: body.x + direction.x * rules.setReach,
    y: body.y + direction.y * rules.setReach,
  };
  let first = Infinity;
  for (const support of world.masonry) {
    const hit = segmentRect(body, end, support, rollerOffset);
    if (!hit || hit.t <= 0 || hit.t >= first || (!hit.normal.x && !hit.normal.y)) continue;
    const length = hit.t * rules.setReach;
    const point = { x: body.x + direction.x * length, y: body.y + direction.y * length };
    const foot = {
      x: point.x - hit.normal.x * rollerOffset,
      y: point.y - hit.normal.y * rollerOffset,
    };
    const tangentInBounds = hit.normal.x
      ? foot.y >= support.y && foot.y <= support.y + support.height
      : foot.x >= support.x && foot.x <= support.x + support.width;
    if (!tangentInBounds || !legal(point, length)) continue;
    first = hit.t;
    selected = { point, foot, support: { ...support } };
  }
  return selected;
}

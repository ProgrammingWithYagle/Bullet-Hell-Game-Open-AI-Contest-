// Protocol 5 projectile transport. Offline simulation keeps ordinary Event objects.
import type { Event, Shot } from './protocol.ts';

type PlainEvent = Exclude<Event, { type: 'shots' }>;
export type ShotBatch = {
  type: 'shot-batch';
  owner: string;
  radius: number;
  damage: number;
  expires: number;
  pierce: number;
  data: Uint8Array;
};
export type WireEvent = PlainEvent | ShotBatch;
const stride = 5 * Float64Array.BYTES_PER_ELEMENT;
const maximumShots = 6000;

export function encodeEvents(events: Event[]): WireEvent[] {
  const output: WireEvent[] = [];
  const groups = new Map<string, Shot[]>();
  const flush = () => {
    for (const [owner, shots] of groups) {
      for (let start = 0; start < shots.length;) {
        const common = shots[start];
        let end = start + 1;
        while (
          end < shots.length &&
          ['radius', 'damage', 'expires', 'pierce'].every(
            (key) => shots[end][key as keyof Shot] === common[key as keyof Shot],
          )
        )
          end++;
        const data = new Uint8Array((end - start) * stride);
        const view = new DataView(data.buffer);
        for (let index = start; index < end; index++) {
          const shot = shots[index],
            offset = (index - start) * stride;
          view.setFloat64(offset, shot.id, true);
          view.setFloat64(offset + 8, shot.x, true);
          view.setFloat64(offset + 16, shot.y, true);
          view.setFloat64(offset + 24, shot.vx, true);
          view.setFloat64(offset + 32, shot.vy, true);
        }
        output.push({
          type: 'shot-batch',
          owner,
          radius: common.radius,
          damage: common.damage,
          expires: common.expires,
          pierce: common.pierce,
          data,
        });
        start = end;
      }
    }
    groups.clear();
  };
  for (const event of events) {
    if (event.type === 'shots') {
      for (const shot of event.shots) {
        let group = groups.get(shot.owner);
        if (!group) {
          group = [];
          groups.set(shot.owner, group);
        }
        group.push(shot);
      }
    } else {
      flush();
      output.push(event);
    }
  }
  flush();
  return output;
}

export function decodeEvents(events: WireEvent[]): Event[] {
  if (!Array.isArray(events) || events.length > 12000) throw Error('invalidProjectilePacket');
  let count = 0;
  return events.map((event): Event => {
    if (!event || typeof event !== 'object') throw Error('invalidProjectilePacket');
    if (event.type !== 'shot-batch') {
      if (!['remove', 'sound', 'notice'].includes(event.type))
        throw Error('invalidProjectilePacket');
      return event;
    }
    const { data, owner, radius, damage, expires, pierce } = event;
    if (
      !(data instanceof Uint8Array) ||
      data.byteLength % stride !== 0 ||
      typeof owner !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(owner) ||
      (count += data.byteLength / stride) > maximumShots
    )
      throw Error('invalidProjectilePacket');
    if (
      ![radius, damage, expires, pierce].every(Number.isFinite) ||
      radius < 0 ||
      damage < 0 ||
      !Number.isSafeInteger(expires) ||
      expires < 0 ||
      !Number.isSafeInteger(pierce) ||
      pierce < 0
    )
      throw Error('invalidProjectilePacket');
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const shots: Shot[] = [];
    for (let offset = 0; offset < data.byteLength; offset += stride) {
      const id = view.getFloat64(offset, true),
        x = view.getFloat64(offset + 8, true),
        y = view.getFloat64(offset + 16, true),
        vx = view.getFloat64(offset + 24, true),
        vy = view.getFloat64(offset + 32, true);
      if (![id, x, y, vx, vy].every(Number.isFinite) || !Number.isSafeInteger(id) || id < 1)
        throw Error('invalidProjectilePacket');
      shots.push({ id, owner, x, y, vx, vy, radius, damage, expires, pierce });
    }
    return { type: 'shots', shots };
  });
}

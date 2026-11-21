import test from "node:test";
import assert from "node:assert/strict";
import { encodeEvents, decodeEvents } from "../src/shared/wire-events.ts";
import type { Shot, Event } from "../src/shared/protocol.ts";
const shot = (id: number, visual?: Shot["visual"]): Shot => ({
  id,
  owner: "hux",
  x: 600 + id,
  y: 600,
  vx: 450,
  vy: 0,
  radius: 3,
  damage: 0,
  pierce: 0,
  expires: 100,
  ...(visual ? { visual } : {}),
});
test("physical flak, the issued canister tag and ordinary shots remain distinct through real binary projectile transport", () => {
  const input: Event[] = [
      { type: "shots", shots: [shot(1, "flak"), shot(2, "canister"), shot(3)] },
      { type: "remove", ids: [1] },
    ],
    packed = encodeEvents(input),
    decoded = decodeEvents(packed),
    shots = decoded.flatMap((e) => (e.type === "shots" ? e.shots : []));
  assert.deepEqual(shots, [shot(1, "flak"), shot(2, "canister"), shot(3)]);
  assert.deepEqual(decoded.at(-1), { type: "remove", ids: [1] });
  assert.equal(packed.filter((e) => e.type === "shot-batch").length, 3);
});
test("unknown projectile visual tags remain rejected by the exact current decoder", () => {
  const packet = encodeEvents([{ type: "shots", shots: [shot(1, "flak")] }]);
  assert.throws(
    () =>
      decodeEvents(packet.map((e) => ({ ...e, visual: "imaginary" })) as any),
    /invalidProjectilePacket/,
  );
});

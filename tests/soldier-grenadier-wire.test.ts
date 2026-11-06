import test from "node:test";
import assert from "node:assert/strict";
import { encodeEvents, decodeEvents } from "../src/shared/wire-events.ts";
import type { Shot } from "../src/shared/protocol.ts";
test("mixed same-owner canister and primary batches preserve only the explicit public visual through binary transport", () => {
  const plain: Shot = {
    id: 1,
    owner: "solo",
    x: 80,
    y: 90,
    vx: 10,
    vy: 20,
    radius: 5,
    damage: 0,
    expires: 100,
    pierce: 0,
  };
  const grenade: Shot = { ...plain, id: 2, visual: "canister" };
  const other: Shot = { ...plain, id: 3 };
  const packets = encodeEvents([
    { type: "shots", shots: [plain, grenade, other] },
  ]);
  assert.equal(packets.length, 3);
  assert.deepEqual(decodeEvents(packets), [
    { type: "shots", shots: [plain] },
    { type: "shots", shots: [grenade] },
    { type: "shots", shots: [other] },
  ]);
  for (const packet of packets)
    for (const key of ["pinUsed", "kicked", "caught", "required", "variant"])
      assert(!(key in packet));
  assert.throws(
    () => decodeEvents([{ ...packets[1], visual: "invented" }] as any),
    /invalidProjectilePacket/,
  );
});

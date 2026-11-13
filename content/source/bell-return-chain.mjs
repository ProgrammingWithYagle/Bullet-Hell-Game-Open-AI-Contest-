import fs from "node:fs";
const read = (p) =>
  JSON.parse(
    fs.readFileSync(new URL("../../src/shared/" + p, import.meta.url), "utf8"),
  );
export function applyBellReturnChain(c) {
  const b = c.bosses.find((b) => b.id === "bellringer");
  if (!b) throw Error("Bellringer missing");
  b.signature.behavior =
    "Approach a survivor, then perform paired, procession and counterstroke peals with independently aimed clappers. Standard uses wider fixed openings, slower spacing and a shorter clapper reach. Brutal adds one tethered clapper throw with a separately warned return. Crazed keeps the thrown clapper and concurrent responding bell.";
  b.signature.counterplay =
    "The approach path is harmless. Standard has a46-degree wave opening; advanced forms retain35degrees. Leave each marked clapper sector. The thrown head follows a locked outbound lane; after landing, shoot its cracked white head during the fresh return warning to break it, or sidestep the returning head. The thin tether itself is harmless. Every peal, swing and throw leg has its own contact budget. Phase entry preserves the issued score; only earned counterplay or natural expiry interrupts it.";
  b.signature.parameters.carillon = read("bell-carillon-rules.json");
  b.signature.parameters.returnChain = read("bell-return-chain-rules.json");
  for (const [form, phases] of [
    ["normal", b.phases],
    ["brutal", b.variants.brutal.phases],
    ["crazed", b.variants.crazed.phases],
  ]) {
    if (form !== "normal")
      b.variants[form].additionalPatterns = [
        ...new Set([
          ...(b.variants[form].additionalPatterns ?? []),
          "tethered-clapper-return",
        ]),
      ];
    for (const p of phases) {
      p.tetheredClapper = form !== "normal";
      p.ringGapDegrees = form === "normal" ? 46 : 35;
      p.clapperReach = form === "normal" ? 260 : 340;
    }
  }
}

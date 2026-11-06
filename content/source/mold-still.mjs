import fs from "node:fs";
const rules = () =>
  JSON.parse(
    fs.readFileSync(
      new URL("../../src/shared/mold-still-rules.json", import.meta.url),
      "utf8",
    ),
  );
export function applyMoldStills(c) {
  const b = c.bosses.find((b) => b.id === "alchemist");
  if (!b) throw Error("Alchemist missing");
  const behavior =
    " Crazed distillation columns add independently warned aerosol lanes while ordinary recipes continue: fixed first-phase trains, later fresh aiming, two staggered sources and final inward reflux.";
  const counter =
    " Crazed columns cool when mixed coolant reaches their base, canceling future and pending releases. Already released clouds keep their locked path until expiry or coolant contact. Coolant condenses one or more clouds during its0.9-second spent grace; clouds slow and hit once, pass over masonry and warn their complete route for1.8seconds. Apparatus is not shootable.";
  if (!b.signature.behavior.includes("Crazed distillation columns"))
    b.signature.behavior += behavior;
  if (!b.signature.counterplay.includes("Crazed columns cool"))
    b.signature.counterplay += counter;
  b.signature.parameters.volatileDistillation = rules();
  b.variants.crazed.additionalPatterns = [
    ...new Set([
      ...b.variants.crazed.additionalPatterns,
      "volatile-still",
      "aerosol-condensation",
      "reflux-column",
    ]),
  ];
  for (const [i, p] of b.variants.crazed.phases.entries()) {
    p.distillationColumns = [1, 1, 2, 2][i];
    p.aerosolsPerColumn = [2, 3, 2, 3][i];
    p.freshAerosolAim = i > 0;
    p.finalReflux = i === 3;
  }
}

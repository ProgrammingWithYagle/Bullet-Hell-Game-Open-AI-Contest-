export function applyStitchwork(c) {
  const b = c.bosses.find((b) => b.id === "stitchwright");
  if (!b) throw Error("Stitchwright missing");
  b.lore =
    "A surgeon of uniforms now mends the people who wore them. Before the quarantine, Elian Vey kept a tailoring stall beside the infirmary. People who could not pay left a button in a jar. Vey remembered their names by the cloth they brought: the courier’s blue cuff, the watchwoman’s coat, the little yellow sleeve that needed lengthening each spring.\n\nWhen the council ordered every household sewn into the civic register, the stall became a checkpoint. Vey was told to stitch numbered tags into evacuation clothes. Those without a number were turned back. On the final night, Vey cut the tags from a basket of children’s coats and sewed the doors shut behind the fleeing families. The bells found a person still holding a needle.\n\nNow the Stitchwright tries to repair every gap, even the spaces living people need to breathe. A cut thread briefly breaks the old command. Under the last hem lies the button jar, its lid marked in a cramped hand: No account required. Iona recognizes the yellow sleeve. She takes it to the gate, where there is still someone waiting for it.";
  b.signature.behavior =
    "A harmless short approach leads to locked, destructible needle seams. Basting Line lays one thread; Backstitch returns along surviving needles after a fresh warning and adds the existing rescue tether. Closing Hem contracts three sides around a clear patch with one permanently open escape side. Last Alteration uses two sequential hems. Crazed adds its own warned crossing stitch; it never closes the hem escape while the hem is active.";
  b.signature.counterplay =
    "Leave dashed thread warnings before they become solid; each stroke can hit once. Shoot either needle to sever all threads attached to it, including pending backstitches. Escape a closing hem through the hollow arrow or destroy a needle. Existing tethers can still be shot or released by one second of interaction. The original art and theme remain; these are new shared-authority techniques, not new directional animation.";
  b.signature.parameters.stitchwork = {
    module: "src/shared/stitchwork.ts",
    rules: "src/shared/stitchwork-rules.json",
    maximumSequencePins: 12,
    needleSevering: true,
    hemOpenSides: 1,
  };
  b.variants.crazed.additionalPatterns = [
    "warned-cross-stitch",
    "surviving-needle-backstitch",
    "open-hem-followup",
  ];
  for (const phases of [
    b.phases,
    b.variants.brutal.phases,
    b.variants.crazed.phases,
  ])
    for (const p of phases) {
      p.phaseNameKey = "boss.stitchwright.phase." + p.patternPhase;
      p.signatureOwner = "stitchwork";
    }
}

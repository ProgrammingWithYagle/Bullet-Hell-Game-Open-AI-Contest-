export function applyLamplightWatch(c) {
  const b = c.bosses.find((b) => b.id === "lamplighter");
  b.lore =
    "Tavin Orr inspected Lorn's street lamps and signed off on its three-lamp standard. Night nurses brought him sketches of the blind corners between them; he filed the sketches as complaints about the dark. On his last round he moved one lamp to the infirmary road, then wrote the approved spacing in his report. His ladder still offers refuges by a rule he learned to bend in private.";
  b.signature.behavior =
    "Three shootable civic candles cast reachable refuges for active survivors. Static shelters become moving shadows, a double watch and a final triple watch. Breaking a candle banks and widens only its linked announced refuges. Advanced echoes retain their issuing phase and receive new warnings.";
  b.signature.counterplay =
    "Reach a white outlined destination before the full 2.8-second warning ends. Shadows stop moving before the pulse. Match a candle’s marks to its refuges; breaking it anchors and widens their promised destination. Only lamp pulses are blocked by these refuges; lava and other hazards still hurt. Crossing an exposed gap during a pulse can hit once, even if both endpoints are safe. No General purchase is required.";
  b.signature.parameters = {
    candles: 3,
    warningSeconds: 2.8,
    pulseSeconds: 0.9,
    shadowWidthPx: 170,
    shadowHeightPx: 130,
    finalShadowWidthPx: 140,
    finalShadowHeightPx: 110,
    bankedGrowthPx: 60,
    wickHealthHP: 30,
    maximumWickHealthHP: 60,
    damageHP: 12,
    waveSpacingSeconds: 4.8,
    brutalAfterLastWaveSeconds: 6,
    crazedAfterReturnSeconds: 4.8,
    minimumCycleSeconds: 9,
    quietRecoverySeconds: 3,
    walkingSpeedPxPerSecond: 45,
  };
  b.mechanics = { ...b.signature.parameters };
  const phase = (n, form = "normal") => ({
    healthThreshold: (form === "normal"
      ? [1, 0.75, 0.4]
      : [1, 0.75, 0.5, 0.25])[n],
    accordBreak: form === "normal" && n > 0,
    patternPhase: n,
    attacks: [
      {
        kind: "zone",
        count: [1, 1, 2, 3][n],
        speed: 0,
        damage: 12,
        interval: (form === "normal"
          ? [9, 9, 11.5, 16.3]
          : form === "brutal"
            ? [12.7, 12.7, 17.5, 22.3]
            : [17.5, 17.5, 22.3, 27.1])[n],
        telegraph: 2.8,
        duration: 0.9,
      },
    ],
  });
  b.phases = Array.from({ length: 3 }, (_, n) => phase(n));
  for (const form of ["brutal", "crazed"])
    b.variants[form].phases = Array.from({ length: 4 }, (_, n) => ({
      ...phase(n, form),
      signatureRepeatOffsetSeconds: 0,
      attacks: phase(n, form).attacks.map((a) => ({
        ...a,
        comboOffsetSeconds: 0,
      })),
    }));
}

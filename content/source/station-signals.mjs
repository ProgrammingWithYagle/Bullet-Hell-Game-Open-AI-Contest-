export function applyStationSignals(c) {
  const b = c.bosses.find((b) => b.id === "stationmaster");
  b.lore =
    "Neris Vale held the last train while the council ordered the lower platform sealed. She counted the wounded aboard instead of checking their permits. The departure bell rang after the gates closed, but no arrival was ever recorded. Her signal still promises one clear track to anyone willing to cross the platform.";
  b.signature.behavior =
    "Bounded train dispatches change from paired tracks to a rotating three-track timetable, then freshly warned crossings. Every wave retains an open track. Shootable signals can open another track; advanced returns retain their issuing phase.";
  b.signature.counterplay =
    "Arrows mark an open track; crosses mark an incoming train. Each wave warns for two seconds. Only the visible moving car hurts, once per entire dispatch, including its later crossing. Leave its path or shoot its signal. Trains pass through cover. No General purchase is required.";
  b.signature.parameters = {
    warningSeconds: 2,
    trainTravelSeconds: 2.6,
    railWidthPx: 100,
    carLengthPx: 125,
    signalHealthHP: 30,
    maximumSignalHealthHP: 60,
    damageHP: 20,
    crossingDelaySeconds: 4,
    finalCrossingDelaySeconds: 3.6,
    brutalReturnDelaySeconds: 7,
    crazedReturnDelaySeconds: 12,
    walkingSpeedPxPerSecond: 50,
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
        count: [2, 3, 5, 4][n],
        speed: 0,
        damage: 20,
        interval: form === "crazed" ? 23 : form === "brutal" ? 18 : 11,
        telegraph: 2,
        duration: 2.6,
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

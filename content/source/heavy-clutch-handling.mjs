export const keyedId = "heavy-traverse-keyed-1",
  openId = "heavy-traverse-open-1";
export function applyHeavyClutchHandling(c) {
  c.specializationSkills = c.specializationSkills.filter(
    (s) => ![keyedId, openId].includes(s.id),
  );
  const base = {
    classId: "heavy",
    branchId: "heavy-pathways",
    branchName: "Specializations",
    subbranchId: "heavy-traverse-1",
    subbranchName: "Siege Gunner",
    subbranchNameKey: "pathway.heavy-traverse-1.name",
    grade: "B+",
    depth: 4,
    cost: 3,
    freePlaySpRequired: 13,
    prerequisite: "heavy-traverse-clutch-1",
    role: "evolution",
    capstone: false,
    effects: {},
  };
  c.specializationSkills.push({
    ...base,
    id: keyedId,
    name: "Keyed Clutch",
    nameKey: "skill." + keyedId + ".name",
    sourceSkillId: keyedId,
    description:
      "While Feed Clutch is lifted, manually crank the real barrel within its original sector and slew speed, including a Floating Cradle. Your separate re-engagement keys its actual current bearing for every remaining original C slot; later aim cannot steer it. Loose and Set Spade can aim their issued Suppressing Cone elsewhere but give up later barrel tracking. Floating gains this one bounded calibration window before keeping the new world bearing as it walks. Primary still waits throughout retained C work. Lifting still loses slots that pass unpaid; neither command adds a round, snaps the barrel to the cursor, catches up a missed slot or changes deadline/recovery. Choose this handling instead of Open Feed; omitting both keeps the original Clutch handling.",
  });
  c.specializationSkills.push({
    ...base,
    effects: {},
    id: openId,
    name: "Open Feed",
    nameKey: "skill." + openId + ".name",
    sourceSkillId: openId,
    description:
      "Ordinary primary can fire while Feed Clutch is lifted. Each actually admitted and paid primary round consumes the earliest remaining original C opportunity once, regardless of its number of pellets. It spends real magazine ammunition at the issued primary cadence; the complete real volley must fit capacity before any payment. Empty, busy or capacity rejection converts no slot. Re-engagement keeps only the unconverted original C times; slots passed while lifted are still lost unpaid. This trades later committed C fire for earlier ordinary fire while walking, without reserving or refunding rounds, adding a C slot, extending the stroke or resetting recovery. A simultaneous Action 1 still cancels all unpaid C work first. Choose this handling instead of Keyed Clutch; omitting both retains primary commitment during the original Clutch.",
  });
}
export const copy = {
  "pathway.heavy-traverse-keyed-1.summary":
    "Calibrate while lifted; re-engage at the actual barrel bearing and trade later tracking for a fixed lane.",
  "pathway.heavy-traverse-open-1.summary":
    "Trade future C opportunities for real ordinary primary rounds while the feed is lifted.",
  "ui.heavy.keyedHelp":
    "Action 2 lifts the feed once and frees walking. Manually crank the lifted barrel within its original sector, including Floating. A separate Action 2 keys its actual bearing for the remaining original slots; Q keeps independent aim, but primary still waits. Set Spade needs stationary input to replant. Slots passed while lifted are lost unpaid. Paid recoil stays real; Action 1 abandons unpaid work. The short local marker shows the stored C bearing. No extra round, deadline or recovery reset.",
  "ui.heavy.openHelp":
    "Action 2 lifts the feed once and frees walking. Primary works while lifted: each actual paid round trades the next original C opportunity once, even with several pellets. Capacity or empty rejection trades nothing. A separate Action 2 re-engages only the remaining original times; slots passed while lifted are lost unpaid. Set Spade needs stationary input to replant; Floating keeps its first bearing. Paid recoil stays real, and Action 1 abandons unpaid work. No extra round, deadline or recovery reset.",
  "ui.heavy.keyedEngage": "Key bearing · {slots} left",
  "ui.heavy.keyedSpent": "Barrel keyed for this stroke",
  "ui.heavy.openEngage": "Re-engage · {slots} C left",
  "ui.heavy.handlingFeedRemaining":
    "Release · {rounds} C fired · {converted} traded · {lost} passed",
};

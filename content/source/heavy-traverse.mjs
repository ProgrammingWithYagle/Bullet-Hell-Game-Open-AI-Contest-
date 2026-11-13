export const traverseIds = {
  entry: "heavy-traverse-1",
  spade: "heavy-traverse-spade-1",
  floating: "heavy-traverse-floating-1",
};
export const traverseRules = {
  rounds: 4,
  intervalTicks: 10,
  deadlineTicks: 31,
  cooldown: 8,
  damage: 45,
  speed: 1050,
  radius: 4,
  lifeSeconds: 1,
  recoilDistance: 8,
  recoilTicks: 4,
  halfArc: Math.PI / 3,
  turnPerSecond: 2.4,
};
export function applyHeavyTraverse(c) {
  const ids = Object.values(traverseIds);
  c.specializationSkills = c.specializationSkills.filter(
    (s) => !ids.includes(s.id),
  );
  const common = {
    classId: "heavy",
    branchId: "heavy-pathways",
    branchName: "Specializations",
    subbranchId: traverseIds.entry,
    subbranchName: "Siege Gunner",
    subbranchNameKey: "pathway." + traverseIds.entry + ".name",
    capstone: false,
    effects: {},
  };
  const node = (
    id,
    name,
    grade,
    depth,
    cost,
    earned,
    prerequisite,
    role,
    description,
  ) => ({
    ...common,
    id,
    name,
    nameKey: "skill." + id + ".name",
    sourceSkillId: id,
    grade,
    depth,
    cost,
    freePlaySpRequired: earned,
    prerequisite,
    role,
    description,
  });
  c.specializationSkills.push(
    node(
      traverseIds.entry,
      "Traverse Stroke",
      "D-",
      1,
      2,
      3,
      "heavy-ordnance-1",
      "active",
      "Start a finite four-round firing stroke with Action 1. The first physical round leaves immediately; three later rounds each require and spend their own actual magazine round over the next second. Walking pauses while the barrel slews toward manual aim, within sixty degrees of its first bearing. Every admitted round recoils your body eight pixels over the following four combat steps, with real cover blocking movement. Another separate Action 1 releases the feed and lets you walk; fired rounds and their recoil remain. Reload, dodge, channeling or overdrive stops unpaid future rounds. Empty or full-pool rejection spends nothing; a failed later slot ends the feed. Primary waits through the stroke. Each round deals 45 base weapon-scaled damage through ordinary bodies, cover, time and armor. Eight-second base recovery starts with the first admitted round. Choose Siege Gunner instead of Flak Gunner.",
    ),
    node(
      traverseIds.spade,
      "Set Spade",
      "D",
      2,
      2,
      5,
      traverseIds.entry,
      "evolution",
      "Plant this carriage on stable ground before starting a Traverse Stroke: walking input rejects the start without payment. The stroke adds no recoil and keeps its manual barrel slew, while holding walking input. Any actual external ground displacement breaks the post and ends unpaid future rounds; fired rounds remain. Terrain, moving cover and forced movement still apply. The same four actual rounds, original stroke slots and recovery remain. Choose this fitting instead of Floating Cradle.",
    ),
    node(
      traverseIds.floating,
      "Floating Cradle",
      "D",
      2,
      2,
      5,
      traverseIds.entry,
      "evolution",
      "Walk normally during a Traverse Stroke and retain each paid round’s actual recoil. Every round keeps the initial world bearing: later mouse aim cannot steer the barrel. Relocate the actual muzzle to find new clear lanes, or release the feed when that bearing becomes useless. This grants no movement bonus, protection or extra round and changes no original stroke slots or recovery. Choose this fitting instead of Set Spade.",
    ),
  );
  c.rules.heavyTraverse = { ...traverseRules };
}
export const copy = {
  "pathway.heavy-traverse-1.name": "Siege Gunner",
  "pathway.heavy-traverse-1.summary":
    "Maintain a paid firing stroke; steer, release, or relocate its real muzzle.",
  "pathway.heavy-traverse-spade-1.summary":
    "Hold a steerable stable post without adding recoil; displacement breaks the feed.",
  "pathway.heavy-traverse-floating-1.summary":
    "Walk with a locked world bearing and real recoil.",
  "ui.heavy.traverseAction": "Traverse Stroke / Release Feed",
  "ui.heavy.traverseRemaining": "Release feed · {rounds} of {maximum} fired",
  "ui.heavy.traverseHelp":
    "Action 1 starts a four-round stroke, paying for each real round only when it leaves. A separate Action 1 releases the feed without a refund or recovery reset. Ordinary primary waits; reload, dodge, channeling, overdrive, an empty magazine or failed later admission ends unpaid work. Default carriage holds walking and recoils against actual cover; its barrel slews within the first firing sector.",
};

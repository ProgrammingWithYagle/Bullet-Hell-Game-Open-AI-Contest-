export const lanyardId = "heavy-traverse-lanyard-1";
export const tetheredTraverseNode = {
  "classId": "heavy",
  "branchId": "heavy-pathways",
  "branchName": "Specializations",
  "subbranchId": "heavy-traverse-1",
  "subbranchName": "Siege Gunner",
  "subbranchNameKey": "pathway.heavy-traverse-1.name",
  "grade": "S-",
  "depth": 5,
  "cost": 4,
  "freePlaySpRequired": 19,
  "prerequisite": "heavy-traverse-clutch-1",
  "role": "capstone",
  "capstone": true,
  "effects": {},
  "id": "heavy-traverse-lanyard-1",
  "name": "Tethered Traverse",
  "nameKey": "skill.heavy-traverse-lanyard-1.name",
  "sourceSkillId": "heavy-traverse-lanyard-1",
  "description": "After lifting and re-engaging the feed, press Action 2 separately again to stake this same gun at its actual muzzle and bearing, with at least two original firing opportunities left. Walk within its 64 px control lead while remaining original rounds still pay and travel from that fixed muzzle. Cover cutting the lead, leaving its reach or interruption ends unpaid work. Action 1 releases the stroke. An admitted Suppressing Cone retrieves the gun before firing from your body. No extra round, resource, deadline, recovery reset or autonomous weapon is added."
};
export const copy = {
  "skill.heavy-traverse-lanyard-1.name": "Tethered Traverse",
  "skill.heavy-traverse-lanyard-1.description": "After lifting and re-engaging the feed, press Action 2 separately again to stake this same gun at its actual muzzle and bearing, with at least two original firing opportunities left. Walk within its 64 px control lead while remaining original rounds still pay and travel from that fixed muzzle. Cover cutting the lead, leaving its reach or interruption ends unpaid work. Action 1 releases the stroke. An admitted Suppressing Cone retrieves the gun before firing from your body. No extra round, resource, deadline, recovery reset or autonomous weapon is added.",
  "pathway.heavy-traverse-lanyard-1.summary": "Stake the real gun after re-engaging; move around its fixed lane within a breakable control lead.",
  "ui.heavy.lanyardHelp": "Action 1 starts the ordinary finite Traverse Stroke. Action 2 lifts the feed; a separate Action 2 re-engages it. With at least two original firing opportunities left, another separate Action 2 stakes the same gun at its actual muzzle and bearing. Walk within its 64 px control lead. Cover cutting the lead or leaving its reach ends unpaid work. Remaining rounds keep their original times, magazine costs and recovery; primary stays committed. Action 1 releases the stroke. An available Suppressing Cone retrieves the gun before firing from your body; an unavailable ability leaves it posted.",
  "ui.heavy.lanyardLooseHelp": "Loose gives up later carried-barrel tracking when posted, gaining room to move around the fixed firing lane. Paid recoil still moves your body.",
  "ui.heavy.lanyardSpadeHelp": "Set Spade needs stationary input to replant before the separate staking command. Once posted, your body can leave that point within the lead; the original stable gun keeps its issued handling.",
  "ui.heavy.lanyardFloatingHelp": "Floating keeps its stored world bearing when posted. The gun stays at its actual post as your body walks, and paid recoil still applies.",
  "ui.heavy.lanyardPlainHelp": "The original lift and re-engagement remain useful; neither optional handling choice is required.",
  "ui.heavy.lanyardKeyedHelp": "Keyed still permits bounded cranking while lifted. Re-engagement fixes the calibrated bearing before the separate staking command; later aim does not steer the posted gun.",
  "ui.heavy.lanyardOpenHelp": "Open still permits ordinary primary only while lifted, trading one original opportunity per paid round. Re-engaging commits primary again. Staking requires at least two unspent original opportunities.",
  "ui.heavy.lanyardIdle": "Needs an active Traverse Stroke",
  "ui.heavy.lanyardLift": "Lift feed",
  "ui.heavy.lanyardEngage": "Re-engage feed · {slots} left",
  "ui.heavy.lanyardPost": "Stake the gun · {slots} left",
  "ui.heavy.lanyardPosted": "Gun posted · {slots} left",
  "ui.heavy.lanyardSpent": "Too late to stake this stroke",
  "ui.heavy.lanyardRemaining": "Release posted stroke · {slots} left"
};
export function applyHeavyTetheredTraverse(c) {
  c.specializationSkills = c.specializationSkills.filter(s => s.id !== lanyardId);
  c.specializationSkills.push(structuredClone(tetheredTraverseNode));
}

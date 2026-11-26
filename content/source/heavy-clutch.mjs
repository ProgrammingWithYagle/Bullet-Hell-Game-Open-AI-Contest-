export const clutchId = "heavy-traverse-clutch-1";
export function applyHeavyClutch(c) {
  c.specializationSkills = c.specializationSkills.filter(
    (s) => s.id !== clutchId,
  );
  c.specializationSkills.push({
    id: clutchId,
    classId: "heavy",
    branchId: "heavy-pathways",
    branchName: "Specializations",
    subbranchId: "heavy-traverse-1",
    subbranchName: "Siege Gunner",
    subbranchNameKey: "pathway.heavy-traverse-1.name",
    name: "Feed Clutch",
    nameKey: "skill." + clutchId + ".name",
    sourceSkillId: clutchId,
    grade: "B-",
    depth: 3,
    cost: 3,
    freePlaySpRequired: 11,
    prerequisite: "heavy-traverse-1",
    role: "active",
    capstone: false,
    effects: {},
    description:
      "After the first paid Traverse round, a separate Action 2 lifts its feed and frees walking immediately. Original firing slots keep passing: each slot crossed while lifted is lost without firing or spending a round. A separate later Action 2 re-engages the remaining original slots. Use one lift and re-engage pair per stroke; neither command adds a round, catches up a missed slot, extends the one-second stroke or resets recovery. Primary still waits while future stroke work remains. Set Spade deliberately lifts its post and requires stationary input to replant at the actual new body point; an already broken post cannot be rescued. Floating Cradle keeps its original world bearing. Paid recoil remains physical while lifted. Action 1 still abandons all unpaid work. Reload, dodge, channeling and overdrive end unpaid work. No fitting is required.",
  });
}
export const copy = {
  "pathway.heavy-traverse-clutch-1.summary":
    "Lift once, relocate while slots pass unpaid, then re-engage what remains.",
  "ui.heavy.clutchAction": "Feed Clutch / Re-engage",
  "ui.heavy.clutchLift": "Lift feed",
  "ui.heavy.clutchEngage": "Re-engage · {slots} left",
  "ui.heavy.clutchSpent": "Clutch used for this stroke",
  "ui.heavy.clutchIdle": "Feed Clutch · no active stroke",
  "ui.heavy.clutchFeedRemaining":
    "Release feed · {rounds} fired · {lost} missed",
  "ui.heavy.clutchHelp":
    "Action 2 lifts the active feed once, freeing walking while the original firing slots continue. Slots passed while lifted are lost without spending a round. A separate Action 2 re-engages the remaining slots; primary still waits. Set Spade needs stationary input to replant. Floating keeps its first bearing. Paid recoil remains. Action 1 abandons all unpaid work. The original deadline and recovery never reset.",
};

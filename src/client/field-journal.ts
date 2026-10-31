import { storyProgress } from "./story-progress.ts";
import catalog from "../../content/catalog.json";
import {
  implementedClassIds,
  type ClassId,
  type ModeId,
} from "../shared/protocol.ts";
import type { ProfileV1, RunReceipt } from "./profile.ts";

export type JournalCategory =
  "classes" | "routes" | "discoveries" | "cooperation";
export type JournalPlan = {
  classId: ClassId;
  mode: ModeId;
  difficulty: "baby" | "normal";
  team: boolean;
  goalId: string;
};
export type JournalGoal = {
  id: string;
  category: JournalCategory;
  kind:
    | "class"
    | "route"
    | "collection"
    | "endless"
    | "rescues"
    | "ensemble"
    | "storyActs"
    | "storyEndings";
  classId?: ClassId;
  mode?: ModeId;
  progress: number;
  thresholds: readonly number[];
  tier: number;
  target: number;
  complete: boolean;
};
const modes = ["short", "standard", "long", "raid"] as const;
const uniqueRuns = (profile: ProfileV1) => {
  // A receipt is a personal run, not one reward per view, peer, restore or reconnect.
  const runs = new Map<string, RunReceipt>();
  for (const r of profile.runs) {
    const key = r.runId + ":" + r.playerId,
      old = runs.get(key);
    if (!old) runs.set(key, structuredClone(r));
    else if (
      old.classId === r.classId &&
      old.mode === r.mode &&
      old.difficulty === r.difficulty &&
      old.firstEncounter === r.firstEncounter
    ) {
      old.clears = Math.max(old.clears, r.clears);
      old.rescues = Math.max(old.rescues, r.rescues);
      old.bossIds = [...new Set([...old.bossIds, ...r.bossIds])];
      if (
        old.mode === "story" &&
        !old.fullCampaign &&
        (r.fullCampaign ||
          (r.storyChoices?.length ?? 0) > (old.storyChoices?.length ?? 0))
      )
        old.storyChoices = [...(r.storyChoices ?? [])];
      old.campaignClears = Math.max(old.campaignClears, r.campaignClears);
      old.teamClears = Math.max(old.teamClears, r.teamClears);
      old.combatTicks = Math.max(old.combatTicks, r.combatTicks);
      old.fullCampaign ||= r.fullCampaign;
    }
  }
  return [...runs.values()];
};
function goal(
  value: Omit<JournalGoal, "tier" | "target" | "complete">,
): JournalGoal {
  const tier = value.thresholds.filter((n) => value.progress >= n).length;
  return {
    ...value,
    tier,
    target: value.thresholds[Math.min(tier, value.thresholds.length - 1)],
    complete: tier === value.thresholds.length,
  };
}
/** Local, personal, cosmetic goals. Legacy campaign claims never grant stamps or letters. */
export function fieldJournal(profile: ProfileV1) {
  const runs = uniqueRuns(profile),
    goals: JournalGoal[] = [];
  const classClears = Object.fromEntries(
    implementedClassIds.map((id) => [
      id,
      runs.filter((r) => r.classId === id).reduce((n, r) => n + r.clears, 0),
    ]),
  ) as Record<ClassId, number>;
  for (const classId of implementedClassIds)
    goals.push(
      goal({
        id: "class-" + classId,
        category: "classes",
        kind: "class",
        classId,
        progress: classClears[classId],
        thresholds: [5, 15, 30],
      }),
    );
  for (const mode of [...modes, "story"] as const)
    goals.push(
      goal({
        id: "route-" + mode,
        category: "routes",
        kind: "route",
        mode,
        progress: runs.filter((r) => r.mode === mode && r.fullCampaign).length,
        thresholds: [1, 3, 7],
      }),
    );
  const known = new Set<string>(runs.flatMap((r) => r.bossIds));
  for (const mode of [...modes, "endless"] as const) {
    const ids = catalog.bosses
      .filter((b) => b.route === mode && !b.secret)
      .map((b) => b.id);
    goals.push(
      goal({
        id: "collection-" + mode,
        category: "discoveries",
        kind: "collection",
        mode,
        progress: ids.filter((id) => known.has(id)).length,
        thresholds: [
          Math.ceil(ids.length / 3),
          Math.ceil((ids.length * 2) / 3),
          ids.length,
        ],
      }),
    );
  }
  goals.push(
    goal({
      id: "endless",
      category: "routes",
      kind: "endless",
      mode: "endless",
      progress: Math.max(
        0,
        ...runs.filter((r) => r.mode === "endless").map((r) => r.clears),
      ),
      thresholds: [10, 20, 40],
    }),
  );
  goals.push(
    goal({
      id: "rescues",
      category: "cooperation",
      kind: "rescues",
      classId: "medic",
      mode: "short",
      progress: runs.reduce((n, r) => n + r.rescues, 0),
      thresholds: [5, 20, 50],
    }),
  );
  goals.push(
    goal({
      id: "ensemble",
      category: "cooperation",
      kind: "ensemble",
      mode: "short",
      progress: new Set(
        runs.filter((r) => r.fullCampaign).map((r) => r.classId),
      ).size,
      thresholds: [3, 5, 7],
    }),
  );
  const story = storyProgress({ ...profile, runs });
  goals.push(
    goal({
      id: "story-acts",
      category: "routes",
      kind: "storyActs",
      mode: "story",
      progress: story.acts,
      thresholds: [1, 2, 3],
    }),
  );
  goals.push(
    goal({
      id: "story-endings",
      category: "discoveries",
      kind: "storyEndings",
      mode: "story",
      progress: story.endings.size,
      thresholds: [1, 2, 3],
    }),
  );
  const leastPlayed = implementedClassIds.toSorted(
    (a, b) =>
      classClears[a] - classClears[b] ||
      implementedClassIds.indexOf(a) - implementedClassIds.indexOf(b),
  )[0];
  const letters = implementedClassIds.filter((id) => classClears[id] >= 5);
  const next =
    goals
      .filter((g) => !g.complete)
      .toSorted((a, b) => {
        const fraction = (g: JournalGoal) => g.progress / g.target;
        return fraction(b) - fraction(a) || goals.indexOf(a) - goals.indexOf(b);
      })[0] ?? goals[0];
  return {
    goals,
    letters,
    leastPlayed,
    next,
    stamps: goals.reduce((n, g) => n + g.tier, 0),
    maximumStamps: goals.length * 3,
  };
}
export function journalPlan(profile: ProfileV1, goalId: string): JournalPlan {
  const model = fieldJournal(profile),
    target = model.goals.find((g) => g.id === goalId);
  if (!target) throw Error("Unknown field journal goal");
  const fullClasses = new Set(
    profile.runs.filter((r) => r.fullCampaign).map((r) => r.classId),
  );
  const classId =
    target.classId ??
    (target.kind === "ensemble"
      ? implementedClassIds.find((id) => !fullClasses.has(id))
      : undefined) ??
    model.leastPlayed;
  const mode = target.mode ?? "short";
  return {
    classId,
    mode,
    difficulty: profile.runs.some((r) => r.clears > 0) ? "normal" : "baby",
    team: target.kind === "rescues",
    goalId,
  };
}

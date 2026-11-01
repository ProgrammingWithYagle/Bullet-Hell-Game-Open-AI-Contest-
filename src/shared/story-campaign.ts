import catalog from "../../content/catalog.json";
import { rankedThreatCandidates } from "./boss-threat.ts";
import type { Random } from "./random.ts";
import type { BossId, Phase } from "./protocol.ts";
export const storyCampaign = catalog.storyCampaign;
export const storyLength = storyCampaign.beats.length;
export function validStoryChoices(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length <= storyLength - 1 &&
    value.every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 2)
  );
}
export function storyArena(encounter: number, choices: readonly number[]) {
  const stage = Math.max(0, Math.min(storyLength - 1, Math.floor(encounter)));
  return stage === 0
    ? "gatehouse"
    : storyCampaign.beats[stage - 1].choices[choices[stage - 1] ?? 0].arenaId;
}
export function storyEnding(choices: readonly number[]) {
  const counts = [0, 0, 0];
  for (const n of choices) if (n >= 0 && n <= 2) counts[n]++;
  const max = Math.max(...counts);
  return [...choices].reverse().find((n) => counts[n] === max) ?? 0;
}
export function storyBossOffers(
  pool: readonly BossId[],
  target: number,
  rng: Random,
) {
  const chosen: BossId[] = [];
  for (const affinity of ["standard", "short", "long"]) {
    const id = rankedThreatCandidates(
      pool.filter((id) => !chosen.includes(id)),
      target,
      rng,
      affinity,
    )[0];
    if (!id) throw Error("Story route lacks three distinct contracts");
    chosen.push(id);
  }
  return chosen;
}
/** Intermissions before a vote carry one fewer committed choice than deployments. */
export function validStoryBoundary(
  mode: string,
  choices: unknown,
  encounter: number,
  phase: Phase,
) {
  if (mode !== "story")
    return (
      choices === undefined || (Array.isArray(choices) && choices.length === 0)
    );
  if (
    !Number.isSafeInteger(encounter) ||
    encounter < 0 ||
    encounter > storyLength
  )
    return false;
  if (!validStoryChoices(choices)) return false;
  const maximum = Math.min(encounter, storyLength - 1),
    minimum = Math.max(0, Math.min(encounter - 1, storyLength - 1));
  if (choices.length < minimum || choices.length > maximum) return false;
  if (phase === "lobby") return encounter === 0 && choices.length === 0;
  if (
    encounter === 0 &&
    phase !== "combat" &&
    phase !== "defeat"
  )
    return false;
  if (phase === "storyScene" || phase === "mutationVote" || phase === "contractVote")
    return choices.length === minimum;
  if (phase === "shop" || phase === "loading")
    return choices.length === maximum;
  if (phase === "victory" || phase === "secretOffer")
    return encounter >= storyLength && choices.length === storyLength - 1;
  return true;
}

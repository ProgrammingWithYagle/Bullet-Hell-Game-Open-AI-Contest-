import type { ProfileV1 } from "./profile.ts";
import {
  storyEnding,
  storyLength,
  validStoryChoices,
} from "../shared/story-campaign.ts";
/** Personal receipts only: a late arrival never inherits an earlier act or ending. */
export function storyProgress(profile: ProfileV1) {
  const endings = new Set<number>();
  let clears = 0;
  for (const r of profile.runs) {
    if (
      r.mode !== "story" ||
      r.firstEncounter !== 0 ||
      !validStoryChoices(r.storyChoices)
    )
      continue;
    clears = Math.max(clears, Math.min(storyLength, r.clears));
    if (
      r.fullCampaign &&
      r.campaignClears === storyLength &&
      r.storyChoices.length === storyLength - 1
    )
      endings.add(storyEnding(r.storyChoices));
  }
  return { endings, clears, acts: Math.floor(clears / 5) };
}

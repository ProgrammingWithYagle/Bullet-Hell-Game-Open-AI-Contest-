import arabic from "./story/translations/ar.json";
import { storyCampaign } from "../shared/story-campaign.ts";
import spanish from "./story/translations/es.json";
export type StoryPassage = { title: string; speaker: string; text: string };
export type StoryBook = {
  language: string;
  title: string;
  intro: string;
  acts: StoryPassage[];
  beats: (StoryPassage & { choices: { title: string; text: string }[] })[];
  endings: StoryPassage[];
};
const keys = (
  value: unknown,
  expected: readonly string[],
): value is Record<string, unknown> =>
  Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === expected.length &&
    expected.every((k) => Object.hasOwn(value, k)),
  );
const text = (value: unknown, maximum = 4000): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= maximum &&
  value.normalize("NFC") === value;
/** Translation packages contain prose only; canonical route IDs, votes and rewards stay in shared rules. */
export function validStoryBook(
  value: unknown,
  language: string,
): value is StoryBook {
  if (
    !keys(value, ["language", "title", "intro", "acts", "beats", "endings"]) ||
    value.language !== language ||
    !text(value.title, 100) ||
    !text(value.intro)
  )
    return false;
  const passage = (
    p: unknown,
    speaker: string,
    extra: readonly string[] = [],
  ) =>
    keys(p, ["title", "speaker", "text", ...extra]) &&
    text(p.title, 120) &&
    p.speaker === speaker &&
    text(p.text);
  if (
    !Array.isArray(value.acts) ||
    value.acts.length !== storyCampaign.acts.length ||
    !value.acts.every((p, i) => passage(p, storyCampaign.acts[i].speaker))
  )
    return false;
  if (
    !Array.isArray(value.endings) ||
    value.endings.length !== storyCampaign.endings.length ||
    !value.endings.every((p, i) => passage(p, storyCampaign.endings[i].speaker))
  )
    return false;
  if (
    !Array.isArray(value.beats) ||
    value.beats.length !== storyCampaign.beats.length
  )
    return false;
  return value.beats.every(
    (p, i) =>
      passage(p, storyCampaign.beats[i].speaker, ["choices"]) &&
      Array.isArray(p.choices) &&
      p.choices.length === storyCampaign.beats[i].choices.length &&
      p.choices.every(
        (choice: unknown) =>
          keys(choice, ["title", "text"]) &&
          text(choice.title, 150) &&
          text(choice.text, 500),
      ),
  );
}
if (!validStoryBook(spanish, "es"))
  throw Error("Invalid Spanish Story narrative package");
if (!validStoryBook(arabic, "ar"))
  throw Error("Invalid Arabic Story narrative package");
const translations: Record<string, StoryBook> = { es: spanish, ar: arabic };
export const storyNarrativeLanguages = ["en", ...Object.keys(translations)];
export const storyBook = (language: string): StoryBook =>
  translations[language] ?? storyCampaign;
export const storyDirection = (language: string) =>
  language === "ar" || language === "ur" ? "rtl" : "ltr";

import story from "./the-open-ledger.json" with { type: "json" };
export function applyStoryCampaign(c) {
  c.storyCampaign = structuredClone(story);
  c.storyCampaign.choiceSeconds = 45;
  const previous = c.modes.findIndex((m) => m.id === "story");
  if (previous >= 0) c.modes.splice(previous, 1);
  c.modes.push({
    id: "story",
    name: "Story: The Open Ledger",
    kind: "campaign",
    maxPlayers: 8,
    encounters: 15,
    targetMinutes: [40, 60],
    threats: [1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7, 8, 8, 9, 10],
    arenas: [
      "gatehouse",
      "triage-yard",
      "gatehouse",
      "ossuary-works",
      "triage-yard",
      "sunken-chapel",
      "bell-foundry",
      "ossuary-works",
      "sunken-chapel",
      "crown-crypt",
      "gatehouse",
      "triage-yard",
      "crown-crypt",
      "bell-foundry",
      "crown-crypt",
    ],
    description:
      "A fifteen-fight story campaign in three acts. Party votes choose regions and contracts, and shape one of three recorded endings. Party Ready leads directly to route decisions; mutations are reserved for Free Play. Uses the current prototype build budget.",
    minPlayers: 1,
    public: true,
    private: true,
    offlineSolo: true,
  });
  const finales = ["city-eater", "last-breath-saint", "last-knocker"];
  c.bossPools.story = {
    regular: c.bosses
      .filter((b) => !b.secret && !finales.includes(b.id))
      .map((b) => b.id),
    finale: finales,
  };
  const boards = c.leaderboards.boards,
    oldBoard = boards.findIndex((b) => b.mode === "story");
  if (oldBoard >= 0) boards.splice(oldBoard, 1);
  boards.push({
    ...structuredClone(boards.find((b) => b.mode === "short")),
    mode: "story",
    label: "Story campaign",
    requiredClears: 15,
    maximumPlayers: 8,
  });
  const visit = (v) => {
    if (!v || typeof v !== "object") return;
    for (const [key, value] of Object.entries(v)) {
      if (
        key === "enum" &&
        Array.isArray(value) &&
        value.includes("short") &&
        value.includes("standard") &&
        value.includes("long") &&
        value.includes("raid") &&
        !value.includes("story")
      )
        value.push("story");
      else visit(value);
    }
  };
  visit(c.leaderboards.jsonSchema);
}

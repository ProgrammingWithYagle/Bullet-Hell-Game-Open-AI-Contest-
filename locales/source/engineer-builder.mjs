const entries = {
  entry: [
    "Field Screen",
    "Q assembles a 100-base-health screen 120 pixels ahead instead of Rivet Turret. Its 220-pixel frontage takes 0.5 seconds to brace before it blocks hostile shots. It lasts 30 seconds; friendly movement stays clear. One owned Q group at a time. Blocked ground, lava, map edges or full capacity spend no cooldown. Q keeps its 18-second base recovery. Barricade and Impossible Machine retain their roles.",
  ],
  longspan: [
    "Longspan Panels",
    "The Q screen spans 380 pixels instead of 220, with the same total health. More frontage means more incoming fire can wear it down. Excludes Return Wings.",
  ],
  wings: [
    "Return Wings",
    "Replace the front screen with two angled 150-pixel side panels, sharing the original 100-base-health budget. They protect the flanks and leave the central approach exposed. The pair counts as one Q group. Excludes Longspan Panels.",
  ],
  hinge: [
    "Hinged Assembly",
    "Adds action 1 (default C; remappable). Fold a nearby Q group and pivot it to your fixed aimed heading over 0.5 seconds. Folded panels do not stop bullets. Reach 320 pixels; base cooldown 6 seconds. The whole rotation must clear cover, lava and map edges. Health and original expiry stay unchanged.",
  ],
  repair: [
    "Field Maintenance",
    "Adds action 2 (default B; remappable). Remain within 8 pixels of your starting point for 0.8 seconds to restore up to 45 base health to the nearest damaged owned wall within 180 pixels. Movement, folding, cover, owner loss or destruction interrupts the work. Base cooldown 16 seconds. No resurrection, lifetime extension, player healing or shield gain.",
  ],
  linked: [
    "Linked Foundations",
    "Maintain two separate Q screen groups. Each keeps its own construction delay, health and original 30-second lifetime. Existing Barricade and redoubt panels use their own limits. No extra turret purchase is needed.",
  ],
  survey: [
    "Survey Frame",
    "Evolve action 1: fold, pivot and shift a nearby Q group up to 120 pixels toward a fixed point 120 pixels ahead of your aim, then rebrace. The whole path must be clear. Construction takes 0.8 seconds; base cooldown 8 seconds. No protection while folded, no health reset and no lifetime extension.",
  ],
  redoubt: [
    "Keystone Redoubt",
    "SS+ capstone: your ultimate still deploys Impossible Machine with its issued health, fire, duration and optional mobility. On clear ground it also assembles three 90-base-health panels around that initial position over 0.8 seconds. They last at most 12 seconds and disappear if the linked machine or owner is lost. The opening stays accessible and teammates can pass through. A moving machine leaves its fortification behind. Blocked fortification ground preserves the machine without adding panels. Uses the run’s single capstone.",
  ],
};
export function engineerBuilderMessages() {
  const messages = {
    "pathway.engineer-builder-1.name": "Builder",
    "pathway.engineer-builder-1.summary":
      "Choose the shape of your cover, then maintain or reposition it. The work takes time; panels have finite health and lifetimes.",
    "ui.pathwayOverview": "All routes",
    "ui.pathwayRoutes": "Choose a route to inspect",
    "ui.pathwayRouteHelp":
      "Compare all three Q identities, or open one route for a closer view. Inspection spends nothing; choosing an entry commits this run.",
    "ui.pathwayUltimate": "Ultimate evolution",
    "ui.engineer.builderGroups": "{count}/{capacity} screen groups",
  };
  for (const [suffix, [name, description]] of Object.entries(entries)) {
    const id =
      suffix === "entry"
        ? "engineer-builder-1"
        : "engineer-builder-" + suffix + "-1";
    messages["skill." + id + ".name"] = name;
    messages["skill." + id + ".description"] = description;
    messages["pathway." + id + ".summary"] = description;
  }
  return messages;
}

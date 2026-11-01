# Story and shared gameplay

The user explicitly requests that narrative danger and character techniques agree with the game's mechanics, and that new playable story content also become usable in Free Play. Story presentation stays in the Story hub; gameplay content belongs to the shared simulation and catalog.

## Owning rules

Boss classifications come from `src/shared/boss-threats.json` and the helpers in `src/shared/boss-threat.ts`. Ordinary identities have fixed levels1–10 and five subtiers. Brutal/Crazed are editions of an identity with their own declared pressure; global difficulty, team size, mutations and Endless pressure are separate. The secret above10 category keeps its existing discovery/consent rules. An author should read the current source rather than a historical document header when describing a form or resource restriction.

Class D- through SS+ grades already exist on specialization nodes in `content/catalog.json`. Each class has three parent branches, each containing eighteen graded techniques across three six-depth paths. The letter bands follow investment depth; the three same-cost alternatives in a band have differing benefits and complexity. A label alone does not establish strict superiority over every alternative. A full path costs21SP; normal campaign budgets arrive at27SP. The story must not treat this as a permanent ranking that makes one entire class inherently inferior to another.

Equipped builds also have a shared D- through SS+ assessment in `src/shared/build-rating.ts`: weapon performance, survival and support are normalized to the class baseline, then combined with the published weights. Contract recommendations compare party capacity with the required rating. This is a field-preparation estimate, not a guarantee of victory or a permanent measure of someone's worth. Temporary mutations, auras and player execution do not change the published rating. Story references should distinguish this equipped grade from a technique's individual grade.

Use the actual technique grade, prerequisites, cost, effect and limitations when writing training or mastery. All seven classes retain narrative competence and useful play. A medical or defensive technique is not judged solely by weapon damage. General Sprint/Double Dash retain their earned costs and optional status. Respec and field preparation do not imply that a survivor forgets their life history.

## Authoring record for a gameplay-bearing scene

Record its place in the chronology and its viewpoint, then bind every relevant encounter, map, class, skill, weapon and form to a canonical content ID. Describe what the technique can do, its visible counterplay, the resources it uses, the conditions that limit it and what changes afterward. Separate observed facts from a character's belief about them.

For example, the gate draft leads to `constable` on `gatehouse`. Its danger is the repeated lever/gate instruction and the people caught at the opening. It does not establish a new superhuman rank for Mara or invent an instant victory over the boss. The draft leaves the actual encounter to the simulation. Its post-fight scene must respect the result and carry the practical commitments forward.

An ability used to solve a major conflict should already have rules the player can understand. A new story technique needs an implementation and an appropriate demonstration, not only an impressive name. If a scene requires temporary or borrowed power, make its source and limits explicit and provide a playable scenario for that condition. Do not silently grant a permanent skill or bypass the ordinary earned budget.

The long campaign will need to distinguish lasting character knowledge from the techniques prepared for a particular expedition. That multi-volume progression design is not implemented yet. Do not claim persistent skill advancement simply because the current run allows purchases or the prose mentions training.

## Shared-content delivery

- New bosses and forms enter the shared catalog, threat profiles, encounter director, art/audio references and appropriate offer pools. Story can give an encounter narrative context; Free Play can offer a rematch through its supported setup or route. Secret content retains deliberate reveal/consent handling.
- New maps use the same floor geometry, cover, hazards, movement and aim rules in Story and Free Play. If the story changes a location, model a real state or variant and expose it through an appropriate Free Play scenario. A backdrop alone is not a new playable map.
- New class techniques enter the shared skill/purchase/effect system. Story can establish learning and personal meaning, while Free Play exposes a compatible loadout or challenge. Keep technique costs, prerequisites, resource restrictions and effects consistent.
- Story-specific objectives should have a meaningful replay configuration when feasible, with narrative choices and earned story progress kept separate. Explicit customized/practice runs retain their existing record exclusions. A Free Play rematch does not rewrite the Story chronology.
- New content must receive solo and cooperative checks, relevant map/form/difficulty coverage, localization, readable counters, safe-boundary behavior and appropriate record handling. Software checks do not replace balance or human acceptance.

## Narrative calibration

A low-rated boss can be personally or politically important. A high-rated one should justify its rating through reach, pressure, capabilities or the resources needed to contain it. Terrain, objectives, preparation and cooperation can matter without falsifying a fixed classification. A difficult global setting is not a new canonical biography for the same boss.

Keep a record of established power limits, costs and exceptions. Future revelations can explain an earlier effect or expose a mistaken assessment, but should not casually erase visible evidence or introduce an unimplemented solution. Long-form escalation can also concern responsibility, alliances, knowledge and consequences; it need not add endlessly larger numeric tiers.

This is the accepted integration direction and an authoring contract, not a claim that the multi-volume campaign, character arcs or additional content are complete.

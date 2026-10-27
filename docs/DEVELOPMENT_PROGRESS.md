# Development progress

Updated 2026-10-27 for **2026.10.27-shifting-writ**. These counts track specific requested passes; they do not imply that earlier playable content is absent. The game is still in development.

66 playable identities: 65 ordinary and 1 secret. Three ordinary bosses in every one of fifty subtiers requires 150 ordinary identities, plus secrets; 85 additional ordinary bosses remain.

| Area | Implemented | Work remaining | Review status |
| --- | --- | --- | --- |
| New ordinary bosses | 65 / 150 | 85 new identities | 0 unintegrated art-only concepts; Early Watch and Small Wakes integrations are implemented |
| Existing-boss phase / mobility / Brutal quality passes | 7 / 60 | 53 | Constable, Warden, Courier, Ratcatcher, Clerk, Tollkeeper and Chain Marshal individual phase/mobility/advanced-form implementations complete; human acceptance remains open. Other 53 original-roster encounters await assessment/redesign. |
| Ability-changing class-upgrade revamps | 7 / 7 | 0 | Three actual ability transformations per class (21 total) implemented at existing utility-path depth three, with shared authority, cues and fifteen-locale help. Rendered/human balance/device/native-language acceptance remains open. |
| Optional large branching skill-tree view | 1 / 1 | 0 | Optional all-54-skill map implemented for all seven classes with settings toggle, bounded zoom, scrolling and keyboard navigation. Classic remains the default; rendered/human/device/native-language review remains open. |
| Secondary-map topology revamps | 5 / 5 | 0 | Five distinct secondary layouts installed. Four spacious maps now have compact real geometry; Ossuary/Crown routes retain their size. Difficulty cover/lava, movement and prediction remain shared. Human 5185 feedback motivated the compact pass; its rendered/human/device comparison remains open. |
| Map ground-art deliveries | 6 / 6 | 0 | Six ground deliveries installed. Limited Normal/Constable readability feedback is positive. |
| Early Watch motion and encounter integration | 3 / 3 | 0 | Three encounters, 36 selected poses, individual themes and fifteen-locale help implemented. Limited 5179 phase/pacing feedback informed the new two-phase/difficulty pass; its human comparison, rendered and listening review remain open. |
| Small Wakes motion and encounter integration | 3 / 3 | 0 | Three original two-phase encounters, 36 selected poses, individual scores and fifteen-locale help implemented. Rendered/human balance/device/native-language/listening acceptance remains open. Limited 5185 human comparison confirms clearer phases and harder Brutal, with arena retreat feedback still requiring review. |
| Crazed form integration | 66 / 66 | 0 | All 66 identities inherit their full Brutal signatures plus purple C treatment, 7.5x projectile budgets, warned pursuit/crosscut/weave pressure, forced Hellish and persisted Endless progression. This common variant pass adds no roster or original-quality credit; human balance/rendered/device acceptance remains open. |

## Latest human feedback

- Human testing at frozen 5192 is blocked by the large boss hint box obscuring the field. The guide is now closed by default and opens/closes manually during combat; in Solo it freezes the worker and presentation, then resumes without catchup or held input. Closing it preserves a separate manual pause. Online combat continues with an explicit notice. Text remains available on demand in every current testing difficulty. The final Baby-only policy is implemented behind an explicit testing switch; that switch must be disabled for a coordinated final release. Human comparison of the new guide remains open.
- Human comparison at frozen 5191 finds Clerk graded fields pretty good, while Crazed green shelter closes too soon. The requested follow-up extends advanced shelter through the final possible marked echo, adds once-per-seal 15% current-health loss plus poison and slow to purple, randomizes the safe seal number in Brutal phase two and all Crazed fields, and keeps Standard behavior. New timing/status/random-choice human comparison remains open; this is limited positive feedback, not whole-boss final acceptance.
- Human comparison on frozen 5190 liked the Clerk shelter purpose and rim effect. This is positive limited feedback, not final whole-boss acceptance. The requested follow-up uses 3/5/10 Standard/Brutal/Crazed seals, doubled-damage purple triangles and Crazed black skulls removing 75% of current health once per activation with a 1HP floor. Later 5191 feedback is recorded above; current follow-up acceptance remains open.
- Human review of frozen 5189 found the Clerk seal order and later safe III clear enough, but the protective purpose was unclear. The old auxiliary fan waited until shelter expired. The follow-up now pairs each reopening with a fully warned fan from the two other seals and real rim interception cues; human comparison remains open.
- The earlier request retained boss instruction text during development. Latest frozen 5192 feedback supersedes automatic display: retain the text in a closed-by-default manual guide and pause Solo while reading. Finished-product availability remains optional Baby-only; current all-difficulty testing stays enabled until the coordinated release switch changes.
- Human comparison on frozen 5185: phase differences and Standard/Brutal difficulty are clearer, though these entry bosses remain easy. Large retreat corners let players disengage and reduce dash value. Requested smaller maps, a more atmospheric boss header, forced Insane Brutal, forced Hellish Crazed with purple/C treatment, higher projectile budgets and Standard-to-Brutal-to-Crazed Endless progression; phase sound and later bespoke animation were also requested.
- Latest requested refinement: Normal combat revival is now 25%; Baby/Easy shield events have six/three circles and two/three-second channels; Baby gains two additional cover props per map. Shared authority/prediction/UI and software checks implement the request; human comparison remains open.
- Manual feedback on frozen 5179: Early Watch bosses defeated quickly; phase changes were only partly visible. Two longer entry phases, health-bar dividers and a separate transition banner are now implemented and await human comparison.
- Requested phase shield-break only on Baby/Easy Standard, no shield event in Brutal, full-health Baby revival, half-health Easy and quarter-health Normal revival, and no combat revives at Hard or above. One authority policy and fifteen-locale difficulty cards now implement these rules.
- Requested stronger Brutal projectile sequences and harder arena rules: warned repeat volleys, half cover on Hard, no interior cover on Insane/Hellish, Hellish lava and all Insane bosses Brutal and all Hellish bosses Crazed are implemented. Rendered/human balance acceptance remains open.
- Constable became slightly harder; being one of the easiest bosses is appropriate. Do not turn its Normal form into a high-threat encounter.
- Phase transitions still felt subtle, and Brutal looked and played too similarly. The latest phase-cue, red treatment and extra-sequence implementation awaits another human check.
- Music was acceptable but could be a little more intense. A quiet tempo-aligned percussion layer now responds to phase and Brutal; human listening review remains open.
- Earlier map bullets and warnings were readable on Normal with Hollow Constable. This is limited evidence, not full map/device acceptance.

## Remaining release work

- Validate the new manual guide on rendered/human/device/language surfaces. It starts closed and pauses Solo; current testing exposes it on all difficulties. Disable the explicit testing availability switch for final release so only Baby offers the optional guide. No automatic boss paragraphs cover active combat.
- Create and verify 85 additional ordinary boss identities, with distinct mechanics, art and individual original music; the target is at least 150 ordinary plus secrets.
- Assess or redesign the remaining 53 existing boss encounters for distinct phases, meaningful pressure and separate Brutal behavior.
- Review and tune the 21 implemented ability-changing upgrades and optional skill map on actual rendered/human/device/native-language surfaces.
- Complete remaining boss special/action art, class special-ability art and rendered animation transitions.
- Complete final human balance, music/listening, native-language and physical-device acceptance.
- Verify active 8/16/50-player mixed progression, WAN and full progression endurance; current headless and scoped local evidence is separate.
- Complete deployed rankings and durable recovery, including participant credentials, entropy histories/paging and hosted acceptance.
- Prepare and verify a new coordinated Windows/browser release; existing immutable Windows and older public builds remain separate.

## Count definitions

Boss quality counts a completed implementation of the requested phase/mobility/Brutal pass, followed by separate human review. The other 53 existing encounters await assessment or redesign; they are already playable. Class revamps count the newly requested ability-changing upgrade pass, separate from the seven existing class kits and 378 skills. Map layout counts the five requested secondary-map topology revisions; their implementation is complete, while detailed new-layout human acceptance remains pending.

Ashen Usher, Brass Toad, Ragpicker's Kite, Candle Snail, Cobble Crab and Mourning Kettle have shared-authority encounters, complete selected motion, original themes and fifteen-locale help. Their original art-only issue records remain unchanged. The structured ledger, derived counts, in-game journal summary and this page update together. Progress does not equal final balance, rendered, device, language or release acceptance.

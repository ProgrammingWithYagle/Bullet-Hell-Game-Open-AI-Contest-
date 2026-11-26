# One Place Left: first chapter implementation

The user's final correction is authoritative: **Story Campaign starts only the new chapter/learning system. Free Play keeps the original story-free SP runs.** There is no fresh SP-based Story mode in the Campaign tab. Earlier fifteen-boss Story saves, earned endings and reading archives are preserved as legacy data; their SP is never translated into a learned technique or proof.

## Playable sequence

The existing gate opening leads to Constable (fixed1+) at Gatehouse. The first return is followed by an untimed party route choice. The selected road runs the shared three-wave Ward Approach objective at Triage Yard, Gatehouse or Ossuary Works. Preparation and a ward conversation lead to Matron (fixed2++) at Triage Yard. After her defeat, the closing scene records what remains unresolved. The three objectives form one introductory chapter, not the completed long campaign.

Only the selected approach is cleared. The registry and wire-yard branches contain conversations; this implementation does not claim completed investigation, repair-defense or escort objectives. Those remain in the larger FIRST_CHAPTER_GRAPH blueprint. Ward Approach remains independently replayable in Free Play with ordinary humanoid actors and its existing180-second deadline.

## Learning, proof and preparation

Each current class can study one existing D- support foundation. Knowledge, completed demonstration and prepared effect are separate records, bound to the named lead and current player ownership. Studying spends no balance. Successful authoritative effects are observed during the ordinary encounter; a proof is awarded only if that encounter is cleared by an eligible participant. A failed attempt keeps the learned lesson but grants no proof. Preparing a demonstrated foundation applies its actual shared catalog effects. Advanced grades and SP purchases are unavailable in this chapter.

| Class | Demonstration |
| --- | --- |
| Soldier | Land a real hit while benefiting from the player's own Rally Field |
| Heavy | Land a slowing Suppressing Cone pellet |
| Tank | Connect a real Rescue Charge sweep; damage taken is unnecessary |
| Medic | Provide at least16actual healing to an assigned ward patient using real class healing |
| Mage | Damage a valid enemy with the slowing Binding Sigil |
| Engineer | Have an owned turret/siege construct land a damaging shot |
| Assassin | Land a damaging shot/sweep while using actual concealment |
| Bard | Land an owned Phrase powered by cadence earned from a real primary hit |
| Swordsman | Damage an ordinary enemy with an owned committed Measured Cut |
| Summoner | Mark an ordinary enemy with a real primary hit, then have the same owner's retinue damage it during that mark |
| Ranger | Damage an ordinary enemy with the owner's released Drawn Line arrow |
| Alchemist | Damage an ordinary enemy with the owner's useful initial Flare or Binding splash; later pulses and healing do not count |

The care marker is a protected treatment location, not an enemy, player clone or source of repeatable injuries. Each eligible Medic receives a separate finite patient need, so another Medic cannot consume all of their demonstration. Invalid, empty, wrong-owner and wrong-instance actions do not count. The green marker and HUD identify the assigned patient. No client action-count/proof payload is accepted.

Reading, route choice and preparation wait for the connected party. Purchases/study/preparation clear that player's Ready. Street practice requires a studied focus. A missed demonstration does not strand the party before Matron; basic kits remain usable. Waiting arrivals become active at the next boundary and cannot inherit previous node participation, proof or full-chapter completion.

## Economy and timing

Before difficulty multipliers, starting cash is80and cumulative income rises by20per objective:100,120,140. There is no SP grant. These are the first sample's tuning values, not a completed five-million-word economy. Free Play retains its existing budgets and mutation choices.

Chapter boss deadlines are explicitly2×their base/form time. Their health, attacks, phase rules and fixed threat grades remain shared. This avoids withholding SP while retaining a timer designed around rapid purchased builds. Free Play offers the same extended clock as a marked custom option, excluded from normal records. The ordinary scenario keeps its separate180-second objective deadline.

The144-row early-build model uses actual shared boss health, shop transactions and weapon stats with65%attack uptime,70%shotgun pellet hits, no critical bonuses or class-ability damage. Its current worst case is the Insane Ranger/Matron estimate at about78.1%of the available clock. It excludes survival, actual movement/cover, nest-clearing work and human accuracy. This is feasibility evidence, not final balance acceptance.

## Records and compatibility

Chapter/node participation is separate from boss clears. The ordinary objective advances the chapter without manufacturing a Constable kill. Only the two actual boss victories increment boss clears. This chapter grants no legacy campaign completion, ending, global XP receipt or team ranking.

Local and authoritative safe-boundary snapshots preserve chapter choice, owned participation, learned/proven/prepared state, money and equipment. Combat observations are ephemeral and are not resumable as completed proofs. The local `ga-story-chapters-v1` journal retains bounded per-attempt history, with export/import and earned reading archives. Imported journals are display/history data and cannot grant an online proof. The Campaign tab now separately exports/imports a fully validated active local chapter checkpoint across devices or preview origins. It does not turn local files into online account authority or lasting cross-room character advancement; reading bookmarks remain separate. Existing offline safe-boundary resume remains available on the same origin. Durable hosted character accounts remain unfinished.

Fresh `Game`/room/practice Story starts default to `one-place-left`. The old constructor path is explicitly in-process compatibility for issued prototype saves and migration tests; it is not exposed as a fresh transport setting or Campaign start button. No legacy data is deleted or converted to narrative mastery.

## Writing and remaining scope

The current fresh Campaign contains5,741 English words across10 unique passages:3,392 opening/first-return words plus2,349 continuation/choice words. Legacy-only2,031words across102passages remain separately available; combined authored text is7,772words. Counts include all three current main-route alternatives rather than a single playthrough. Optional letters, personal chapters, translations and UI are excluded from the five-million-English-word base-story ambition.

All twelve leads are recent entrants to shared disciplines. Miri, Kesa Morn, Drin Hal, Mera Silt, Nell Dace, Els Pell and Heda Linn have roles independent of the playable class identities. The English ward scenes add ordinary relationships and practical work without manufacturing techniques, equipment transfers or completed personal arcs. Opening editions and later English-only prose retain their explicit language boundaries. Voice/expression production, distinct mob archetypes, later chapters, durable characters and broader mastery remain open.

Automated evidence covers simulation, native controller/graphics calls, persistence, negative cases and real WebSocket peers. No rendered/browser, physical-device, native-language, listening or human literary/balance acceptance is inferred. Browser automation remains disabled under the user's standing direction.

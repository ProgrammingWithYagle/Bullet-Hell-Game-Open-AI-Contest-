# Story mastery: implementation contract

This specification develops the user's accepted direction. It is not the progression system currently running: the existing fifteen-boss Story prototype still spends SP. Free Play can retain its SP system; Story needs learning, practice, proof and preparation with lasting character records.

## Distinct records

A character's training record identifies learned techniques, completed proofs and the expedition preparation. It must distinguish:

- What the character has encountered or been taught.
- What meaningful practice has been demonstrated.
- What proof is complete, with its authored conditions and source mission.
- Which known techniques are prepared for the current expedition.

These are facts and choices, not balances to spend. There is no interchangeable mastery coin. Money remains available for equipment, supplies and practical arrangements. A player cannot buy a proof by adding money or by importing a numeric total.

Use stable character IDs and technique IDs. The seven existing leads are distinct people in shared classes; twelve eventual classes do not imply exactly twelve people. Do not store a discipline's entire world's progress in one class-wide biography. Existing class-based cosmetic/profile records remain separate until a migration is designed.

## Proof ownership and authority

A proof binds the technique, chapter/node, encounter instance, eligible participant and rule version. It must come from the shared objective/ability simulation, not a UI button, reader page, client-supplied action count or inferred animation. Replaying one instance cannot award the same proof repeatedly. Loading or viewing an old report does not recreate eligibility.

An offline record is local practice data, clearly distinguished from a server-issued claim. Online rooms use the authority's eligible roster and observations; a late arrival cannot inherit completed work. Export/import preserves versioned local records but cannot convert them to online authority. Durable deployed storage remains a separate unfinished release requirement; do not treat an ephemeral hosted SQLite database as a permanent campaign account service.

## Learning and practice

An authored lesson gives a reason for the technique to become available: a teacher, a manual, observation, research or a discovery. It also explains the actual capability and its limits. The player chooses an available focus within the current story band. Changing focus preserves relevant knowledge; it does not farm another grant or erase a person's past.

Count successful relevant situations, not raw button presses. Invalid targets, empty attacks, avoidable self-inflicted injury, repeated healing of an arranged wound, and time spent idle do not provide unlimited mastery. Each proof needs a small bounded set of meaningful criteria. Progress within an encounter can be bounded and cleared when an attempt is abandoned; the authored lesson remains known.

Every main-story class needs a solo route and a cooperative route. A Medic cannot depend on another player deliberately taking damage, and a Tank cannot be rewarded only for losing health. Support/control work should be visible and useful, with appropriate alternate criteria for the same learning objective. Optional character chapters can supply alternate demonstrations and deeper context, not a mandatory gate that strands another class or an entire party.

## First role demonstrations

These candidate anchors use actual shared D- nodes. Final criteria must be implemented and tested with the new chapter/objective system before they award anything.

| Class | Technique | Learning question | Candidate relevant demonstration |
| --- | --- | --- | --- |
| Soldier | soldier-command-1 | Can a clear signal produce a useful coordinated action? | Use the actual rally effect during a threatened crossing and contribute to its objective; solo alternative uses the same ability's real self benefit |
| Heavy | heavy-suppression-1 | Can sustained pressure create space without wasting the whole supply? | Control an advancing group with the actual kit while preserving a route; distinguish pressure from firing indefinitely into cover |
| Tank | tank-protection-1 | Can protection enable another action while respecting a shield's limit? | Block or safely redirect a warned threat while an objective is completed; solo alternative demonstrates the same limit without manufactured injury |
| Medic | medic-triage-1 | Can care respond to the patient's need and choice? | Use actual healing/recovery rules where care is required, with an authored solo situation rather than damage farming |
| Mage | mage-control-1 | Can a prediction be tested and revised? | Apply the actual control effect to a valid moving threat and exploit the resulting space; narration distinguishes evidence from Sable's hypothesis |
| Engineer | engineer-constructs-1 | Can a placed construct do useful work under the real terrain limits? | Place, maintain and use a construct during an objective; no proof from placing and cancelling it in safety |
| Assassin | assassin-ambush-1 | Can concealment serve a task without ignoring existing hazards? | Use the actual concealment/step rules in a threatened traversal, then complete a task; the lesson does not grant immunity to old hazards |

The five new classes need equally deliberate proofs once their actual kits exist. Do not invent their mastery criteria around effects that have not been implemented. Bard's performance can have a consequential use without requiring a compulsory twitch rhythm game; Summoner's proof must involve real owned units and commands, not an arbitrary summoned-count total.

## Grades and preparation

Technique grades describe the actual shared definitions. Long-term mastery needs authored milestone access: foundations first, then later bands after appropriate learning and proof. No automatic promotion after every fight or after a fixed number of repeated actions. SS+ is a major late-story accomplishment. Exact volume milestones should follow a tested first-volume sample, not an arbitrary promise that chapter20is endgame.

The field build estimate remains separate. It measures currently equipped weapon/survival/support against a role baseline. New equipment may change that estimate without teaching an advanced technique. The story must identify whether it is discussing training, a specific technique or the prepared field assessment.

Preparation selects from known techniques under explicit loadout rules. The limit should concern prepared disciplines, incompatible approaches, concentration or equipment, rather than silently reintroducing SP under another name. Existing parent effects/prerequisites need a clear translation: remembering an earlier lesson does not require forgetting another one, but prepared effects must remain bounded and readable. A respec should change preparation, not erase the character's history.

## Encounter and economy coupling

The current fifteen-fight route reaches threat10 and its27SPbudget quickly. Withholding SP alone would make that route underprepared. The expanded chapter graph must provide ordinary encounters, investigation, training, consequences and selected bosses in the early bands. Its objectives, resources and mastery opportunities must be balanced together.

Ward Approach is now a shared standalone ordinary encounter, not yet a mastery proof or a chapter node. Its practice result deliberately grants no advancement. Next add chapter/node state and eligibility, then one complete all-role learning/proof/preparation path. Give that path actual save/export/import and co-op checks before replacing the Story skill UI. Keep old issued saves recognizable and preserve completed endings/history; do not silently relabel old purchased SP as earned narrative mastery.

# Campaign progression and encounter redesign

The user’s new direction supersedes the short-run campaign model. These are accepted constraints and a proposed implementation plan. The full mastery system and ordinary-enemy campaign are not yet implemented.

## Accepted constraints

Story and Free Play remain separate. Story does not offer random mutation votes. Skill points should be replaced in Story by a different form of character development; money can still buy equipment. Advancement and resources should be considerably slower and more meaningful than the current fifteen-fight prototype. SS+ is a major late-story accomplishment, not something to reach by roughly twenty chapters.

The seven playable leads only recently entered their respective classes. A class is a shared discipline with many practitioners, not the name of one unique character. Their prior jobs, relationships, civilian expertise and service remain valid backstory. Do not turn an experienced worker into an established master of a newly entered class. Supporting characters, rivals, mentors and human antagonists exist independently of the playable roster.

Bosses belong at consequential story points. Ordinary enemies, investigation, travel, conversation, rescue and defense should also carry the campaign. Zombies, skeletons and wraiths are requested directions for distinct regular enemies. Living antagonists can create conflicts that do not end in a boss fight. New playable maps, enemies, techniques and scenarios must also have an appropriate shared Free Play implementation.

## Proposed mastery model

Use the character’s training record rather than a spendable pool. A technique can be unknown, learned, practiced and proven; the expedition loadout records what is prepared. These are different facts. Learning a technique does not equip it automatically, and changing a prepared loadout does not erase a character’s knowledge.

Learning needs a cause: instruction, observation, a recovered manual, research or a story event. Practice requires relevant use under meaningful conditions. Proof is a deliberate challenge or consequential demonstration, with alternatives appropriate to each role. Healing, guarding, controlling space and engineering must count alongside offense. Repeatedly firing into empty space or arranging avoidable injuries must not become the efficient route to mastery.

Major story milestones open the next band of training. The player chooses what to study within that band. Higher grades need broader understanding and a proper demonstration, rather than a growing price in a renamed currency. Optional personal chapters can offer alternate proofs and deepen a technique’s meaning; they cannot be the only way a class can finish the main campaign. The shared campaign remains playable with any class and in co-op.

Persist learned and proven techniques per character separately from a particular expedition. Preserve existing local progress through an explicit migration, with online authority checking its own records. Do not trust a client-edited mastery claim. Replaying a completed proof cannot award unlimited advancement. Free Play can retain its existing SP economy while using the same actual technique effects and prerequisites appropriate to that mode.

The first playable volume should develop foundations, relationships and competence. It must not copy the current curve that grants27SP before fight15. The present prototype also reaches threat10 within those fifteen fights. Simply withholding upgrades while keeping that escalation would create a different problem; encounter pacing and progression must be revised together. No replacement long-form balance curve has been accepted as finished.

## Grades and resources

Keep fixed boss threat1–10/subtiers and form pressure grounded in the shared profiles. Technique grades remain D- through SS+ in the shared skill definitions. A character’s lasting mastery and the current computed equipment/build estimate must be identified separately. An expensive weapon cannot silently certify mastery of an advanced discipline. The existing build rating remains a useful role-normalized field estimate; it is not a person’s permanent narrative rank.

Money funds equipment, repairs, consumables and practical arrangements. Scarcity should produce decisions with visible consequences and alternatives. Avoid both unlimited shopping and long stretches in which the player cannot make any useful preparation. Vendor stock, mission funding, found materials and supply needs should arise from the location and people involved. The current coin curve remains prototype behavior until this economy is implemented and tested.

## Encounter structure

Author a chapter as a sequence of scene and objective nodes, rather than making every narrative beat a defeated boss. A regular encounter needs its own clear condition and objective display, wave limits, spawn warnings, navigation and cleanup. It must not be implemented by hiding a boss sprite while still awarding a fake boss kill.

The current Minions controller has shared-authority rat and ordinary actors. It is useful infrastructure, not a complete zombie/skeleton/wraith roster or standalone skirmish mode. New archetypes need distinct silhouettes and behaviors, fair attack warnings, solo/support-role viability, co-op scaling, resources and record handling. Defending a cart or clearing a street must not award an unrelated boss stamp.

Free Play should expose the same regular-enemy scenarios through suitable presets or customization. Story choices and earned narrative progression stay separate. Concealed future bosses and secret content retain their spoiler rules. The current15-encounter Story still consists of boss fights; the new encounter graph is open work.

## Next implementation sequence

1. Complete foundation: the full-viewport reader and Story-only removal of mutation votes pass the1,096-test source gate and exact-source CI, including known issued-save conversion. Human/rendered acceptance remains open.
2. Write a complete first-chapter scene/objective graph with the new pace, class teaching opportunities and recurring cast.
3. Implement one ordinary-enemy objective in shared authority and a Free Play replay, with correct clears and records.
4. Implement one complete learn/practice/prove technique path for all seven roles, including persistence, preparation and co-op behavior.
5. Use that playable chapter to revise resource availability and mastery pacing before extending the entire roster and later volumes.

These steps are not a reduction of the full development goal. Later arcs, five million English base-story words, all seven personal arcs, broad antagonist development, voice/sprite production and final polish remain active unfinished scope.

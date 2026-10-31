# Medic revival and difficulty recovery

Build 2026.10.29-medic-recovery / protocol 40. Revival is determined by the rescuer's class, including when the rescuer and recipient are the same player.

| Difficulty | Revival by other classes | Revival by Medic | Passive HP regeneration, every class |
| --- | --- | --- | --- |
| Baby | 100% maximum health | 100% health and a shield worth 20% of the revived player's maximum health | Unchanged |
| Easy | 50% | 75% | Unchanged |
| Normal | 25% | 45% | Unchanged |
| Hard | Unavailable | 30% | 25% less |
| Insane | Unavailable | Exactly 1 HP | 50% less |
| Hellish | Unavailable | Unavailable, including abilities and items | Disabled |

The player's explicit 75%/45%/Baby-shield clarification supersedes the initial relative-20% wording. These are starting balance values; final class balance needs human combat review.

Medic can self-revive in a team as well as Solo. Other classes can self-revive only in Solo, subject to the table. The base allowance is one charge per encounter, plus purchased extra-charge effects. The two-second self channel resets when released and consumes a charge only on completion. It does not bypass the existing downed timeout or grant extra post-revival invulnerability. An all-downed squad continues only while a connected member has an eligible self-revival left. Starting the next encounter resets the allowance.

Teammate channels, Medic's ultimate and revive kits all use this same authority policy. Only the ultimate can restore an eliminated player; ordinary channels and kits still require a nearby downed teammate. Hard and Insane kits can only be bought or used by Medics. Hellish rejects purchases and leaves injected legacy kits unconsumed. A rescue credits the reviver once; self-revival does not count as a teammate rescue. Baby's shield is a floor, not an additive stack on repeated revivals.

Regeneration penalties affect the passive `regeneration` HP/s stat for every class. Deliberate healing abilities, healing items and life gained through active attacks remain separate and retain existing healing modifiers. Full recovery between encounters remains. An Insane revival returns at exactly 1 HP; subsequent healing or permitted passive regeneration can then restore health.

Difficulty cards display both revival columns and the regeneration penalty. Downed-player hints distinguish self-recovery from waiting for a teammate/Medic and show remaining synchronized charges. Item help uses the actual class value and literal 1 HP on Insane. The public and testing builds share these changes.

Exact known protocol 39 local Practice saves preserve selected map, progress and economy under protocol 40; server checkpoints and unknown revisions remain strict. Content catalog revision is unchanged because the revised simulation policy is versioned by the protocol. Map/lobby checkpoint 0feaf34 passed 795 software checks and is included. Current recovery tests cover the real authority and two-client transport. This does not establish browser rendering, listening, native-language, device, WAN or final balance acceptance.


Personal shields now share one combined capacity across starting shields, ability shields and armor plates: Baby/Easy/Normal 100% of maximum health, Hard 75%, Insane 50%, Hellish 0, rounded down. Excess shield cannot absorb damage. Hellish cannot buy or consume shield items; deployed walls remain physical cover. The HUD shows current shield/capacity. Future Tank/Heavy cap upgrades and selective attack blocking are recorded separately and are not implemented.


Base starting shield is recalculated each fight from the difficulty-adjusted capacity: Heavy 50%, Tank 100%, Soldier 15%, all other classes 0. Hellish gives everyone0. Existing starting-shield mutation bonuses can fill remaining capacity, and all sources respect the same cap. This adds no new branch or maximum-shield upgrade.


Deferred class and blocking ideas: [Future design ideas](FUTURE_DESIGN_IDEAS.md).

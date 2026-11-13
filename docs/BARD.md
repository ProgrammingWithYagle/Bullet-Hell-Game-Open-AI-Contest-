# Bard: Iven Cair

The eighth playable discipline uses its own concertina notes, cadence, performances and selective projectile control. It is available for solo/co-op, existing Free Play routes and the new chapter Campaign. Swordsman, Summoner, Ranger and Alchemist remain required for the accepted twelve-class roster. This first implementation does not complete Iven's arc, later Story mastery, all action art or final class balance.

## Shared combat rules

Primary notes earn one cadence only on actual positive enemy damage, at most once every ten simulation ticks. The meter holds three. Misses, button presses, ally damage, idle time, Q, E, Encore and lures never refill it. A pierced or spread shot cannot fill it several times in one tick. Leaving combat, becoming inactive or disconnecting clears pending performances and cadence. They cannot carry into a saved preparation boundary.

- **Resolving Phrase / Q, 12 s:** consume the current cadence for three pulses, 0.75 seconds apart. Each follows the Bard and deals 20 + 5 per spent cadence damage within 145 units. Ordinary enemies hit are slowed25% for1.25 seconds. Nearby connected active allies receive6 + 3 per cadence shield for2 seconds. The strongest shield value refreshes; it does not add with itself or another Bard.
- **Cut In / E, 15 s:** strike a narrow210-unit line for65 damage and erase at most eight actual hostile projectiles along it. Cover stops the line. This does not move an existing warning, erase fields or beams, grant invulnerability, or interrupt an announced boss attack.
- **Encore / Ultimate, 90 s:** consume cadence to place six pulses, one per second, at the original performance position. Radius205; each pulse deals36 + 4 per cadence damage and refreshes18 + 2 per cadence shield for2 seconds. Shared potency/radius/ultimate upgrades apply. The total pulse count is bounded at12. It cannot heal or revive.

All shields immediately respect the same personal capacity and difficulty rules as other sources, including zero on Hellish. Damage, slow and shield changes occur only in the authoritative30 Hz simulation. Clients draw the replicated meter, pulse beats, note shots, cut line and original reed-like synthesized cues; audio is not needed to time an input. Existing effects-volume, mute, hidden-tab and voice-budget gates apply. No voice acting or listening acceptance is claimed.

## Free Play and Story

Free Play retains its original rapid SP/coin budgets and mutations. Bard has four concertina tiers priced0/240/460/720,54 nodes, all18 technique grades and three depth-three transformations:

| Upgrade | Actual change |
| --- | --- |
| Held Note | Last Q pulse has40% more radius, twice its shield and2.5 seconds of slow. |
| Travelling Chorus | Encore follows the performer instead of remaining at the casting position. |
| Borrowed Cue | E leaves one destructible30-health sound lure for4 seconds. Newly aimed attacks may choose it; committed warning positions stay as announced. |

Story grants no SP. Iven can study **Leave a Breath / bard-performance-1**, an existing D- support root, after Constable. During the selected ordinary encounter, he must earn cadence with an actual primary hit and spend it on Q so a pulse damages an ordinary street enemy. Successful completion records the owned proof. Empty or uncharged phrases, Encore, another Bard's effects and failed encounters grant none. Preparing the proved root applies its actual catalog cooldown/potency effects. No advanced grade, permanent cross-room account or optional personal chapter is implied.

Iven is a recent entrant to a shared discipline, formerly a backstage worker. The EN/ES/AR gate manuscript introduces his mistaken attempt at reassurance and his decision to ask before playing. The English ward conversation gives him an ordinary repair problem and room to listen. His optional Free Play letter is a separate cosmetic reading; it grants no power and is excluded from the base-story word target. Other practitioners, teachers, rivals and his full arc remain to be written. His craft is original to this setting and does not copy Lord of Mysteries pathways, powers or plot.

## Assets and verification limits

Built-in image generation produced an original selection portrait, a four-view idle strip, a sixteen-frame running-sheet candidate, four complete directional sheets for attacks/recoil/dodge/downed states and thirteen separate weapon/specialization icons. The initial repeated-stride run candidate is retained; a second whole-sheet edit improves leg alternation. Four short run cycles and twenty idle/action clips select 84 poses in total. Directional attacks compress the concertina bellows; hurt/dodge/downed changes follow actual replicated state. Stride/action/transition refinement remains open. No mirrored or reused class identity stands in for Bard. Generated originals and exact prompts remain in `assets/production/generated/bard-2026-11-01`; geometric whole-frame crop/uniform resampling scripts preserve their alpha and record hashes. Existing roster/art entries are unchanged.

`tools/verify-bard-content.mjs` independently checks the prior source's authored mechanics and art entries, and rebuilds the added content from its source. Automated rules cover actual-hit cadence, pulse timing, strongest-shield behavior, Hellish limits, line/cover/projectile bounds, transformations, cleanup, issued local save compatibility, real ordinary proof completion and two-peer transport. Current phase and recovery tests remain separate from rendered/device/native-language/listening/literary/final balance acceptance. Browser automation remains disabled. The long main story and whole game remain unfinished; the user decides completion.

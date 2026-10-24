# Black Bell Pilgrimage runtime checkpoint

The feature-branch source adds twenty distinct encounters, all Normal/Brutal phases, the sixteen-fight Pilgrimage, twenty original themes, 168 native motion poses and sixteen props. Current totals: 43 executable bosses, seven classes, six distinct maps, four modes, protocol 10. Seventeen boss identities, Raid, the full Endless-exclusive schedule and the secret extension remain in development.

The long route selects fifteen different regulars from seventeen and reserves one of three finales. Normalized SP and nominal base income reach 27 and 2400 before the finale. Local protocol-9 boundaries migrate within their old 23-boss/three-mode limits. Online and signed state remain strict.

## Signatures

| Boss | Actual counterplay |
| --- | --- |
| Pallbearer | Break the 180-HP moving coffin or flank its protected front. The warned charge respects masonry. |
| Cinder Foreman | The last occupied work zone stays cool. A neutral cooling lever can suppress the other vents. |
| Canal Diver | Identify the bubbling true puddle, leave its emergence area and punish the recovery. The submerged body is protected. |
| Clockmender | Real projectiles pause after 1.4 seconds, remain stopped for two seconds, then restart along their original vectors. |
| Seamstress of Wires | Use the fixed 170-pixel gates or break an 80-HP anchor to remove its adjacent wire sections. |
| Gravedigger | A destructible moving ridge blocks shots. Its final position warns before collapsing into a three-second pit. |
| Ink Notary | The ground spiral draws progressively and leaves a 65-degree opening; cross through the missing sector. |
| Spore Beekeeper | Three 55-HP hive drones control a 24-direction projectile wave. Breaking a drone removes its third; a fallback gap remains. |
| Ice Custodian | Three warned strips build at most 45 pixels/second of extra drift. Dry ground and dodging clear that drift immediately. |
| Bridge Ferryman | Cross the alternating open bridge or use the outer bypass. Water remains traversable but slows and hurts. |
| Porcelain Mourner | Four moving cover fragments can be destroyed before their warned one-time six-shard split. |
| Boiler Tender | Hold any neutral valve for 1.2 seconds to add a 70-degree escape wedge; the original fallback remains. |
| Mirror Undertaker | The hollow delayed ghost at an old survivor position is harmless. Follow the black foot marker on the true body. |
| Chalk Magistrate | The warned rectangle leaves one erased edge. Its other three walls strike without creating an invisible movement trap. |
| Wire Harpist | Three visible strings strike in the fixed 0/1/2 order, 0.8 seconds apart. |
| Crow Shepherd | Three flocks of five actual swept bird bodies follow warned paths and stop on cover. |
| Ledger Leech | Up to two seals slow movement for four seconds. Walk through a cleansing circle; no currency is stolen. |
| Mortuary Engine | Four seconds of body armor reduce incoming body damage by 60%; the exposed core then transfers one 1.6× hit to shared health. |
| Drowned Regent | The true body warps with a black foot marker; two hollow decoys are harmless. Water lanes shift on an independent twelve-second clock. |
| Salt Patriarch | Three inward salt perimeters retain two 200-pixel gates. A neutral two-second pad hold delays future steps. |

## Evidence and limits

- `tests/districts.test.ts` covers signature counterplay, phase execution, route uniqueness, budgets, exact weak geometry, damage credit, clock updates, terrain prediction and bounded old saves.
- `tests/district-network.test.ts` launches each of twenty identities in real WebSocket rooms and verifies finite numerical cues and cleanup.
- `docs/pilgrimage-art-2026-10-24.json` preserves 36 requests/natives: twenty first returns, thirteen whole-sheet framing corrections, two prop sheets and crow flight. Twenty boss sheets, crow flight and both prop sheets are selected. All superseded originals remain.
- `reviews/pilgrimage-2026-10-24/independent-art-audit.json` reconstructs all 168 motion poses and sixteen props from native pixels, checks hashes and at least twelve pixels of visible atlas padding. Only technical crop/resize/padding is used.
- `reviews/boss-themes-review.json` audits all 43 music masters; earlier 23 PCM masters remain byte-identical. Scores have separate melodies, harmony and phrasing.
- `reviews/runtime-verification.json` records the latest completed exact-source full pipeline. Browser and native inspections are separate evidence.

Automated and static proof checks do not establish final full-action/facing art, human listening, native-language, physical-device, WAN, endurance or balance acceptance. Durable recovery, profiles/mastery/cosmetics, verified rankings and Windows/offline/LAN packaging remain unfinished. The public Site still serves its older protocol-4 build; source and Wiki updates do not redeploy it.

Integration fixes also keep newly selected health tradeoffs consistent in authoritative boundary snapshots. Moving cover uses swept masonry constraints; hive projectiles can be removed by their associated drone and ordinary projectile erasure.

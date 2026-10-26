# Bosses

Sixty-three bosses are executable in the current source. Each has its own signature, phases, normal/Brutal variant, presentation and music. A signature table describes practical counterplay; supplemental attacks still require ordinary bullet-hell movement.

**Each boss has a fixed intrinsic threat grade.** Routes select suitable identities; they do not rerate a boss to match the encounter number. Subtiers use **--, -, no sign, +, ++** for bottom through top tier. Hollow Constable is **1+** and Bell Triplets are **3--**. Brutal uses a separate **B** marker, such as **1+ B**. Secrets display **>10**. Global difficulty and party scaling remain separate.

Brutal uses twice the health and damage, a 1.5× deadline and 1.75× bounty. Threat levels 1–2 use two half-health phases in both forms, retaining the final authored signature; higher threats keep three Standard/four Brutal phases. A segmented health bar, phase count and independent transition banner mark changes. Brutal repeats locked projectile volleys in two waves, or three from threat 5, with replicated warnings and bounded queues. Controlled projectiles retain their authored sequence. All Hellish encounters are Brutal. The 4,000-hostile cap remains. [Difficulty rules and scope](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/DIFFICULTY_AND_PHASES.md).

## Quarantine Run

![Quarantine Run boss identities with names](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/bosses-short.jpg)

*Quarantine Run — representative first poses from the current runtime atlases.*


| Boss | Fixed grade | Signature and response |
| --- | --- | --- |
| Ashen Usher | 1-- | Break a ticket stand to cancel its delayed aisle volleys; cross after the shots pass. |
| Brass Toad | 1- | Leave warned landing circles, cross ripple gaps and break the drain plug to stop its tongue. |
| Ragpicker's Kite | 1 | Use the quiet center or break a pin to remove a wind corridor; dodge briefly suppresses wind. |
| Hollow Constable | 1+ | Watch the fan tells and leave marked arrest zones; gaps and open lanes remain. |
| Lantern Warden | 2-- | Follow the rotating safe gap behind the lantern sweep; leave warned zones. |
| Carrion Courier | 1-- | Leave the locked charge line and its damaging trail; punish the recovery. |
| Ratcatcher | 1- | Shoot the breakable sack to stop replenishment; ordinary rat packs are bounded. |
| Quarantine Clerk | 1 | Read the ordered stamps, then use the reopened safe interior. |
| The Tollkeeper | 1++ | Avoid the locked two-segment wheel route; it reflects once and uses swept contact. |
| Chain Marshal | 2- | Destroy either 90-HP chain anchor to remove its sweep; Brutal doubles anchor health. |
| Gate Widow | 2 | Use the one open shutter lane; the other two physically close and block shots. |
| Black Ambulance | 2+ | Sidestep the locked charge; the driver is exposed for three seconds afterward and takes bonus damage. |

## Midnight Circuit

![Midnight Circuit boss identities with names](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/bosses-standard.jpg)

*Midnight Circuit — representative first poses from the current runtime atlases.*


| Boss | Fixed grade | Signature and response |
| --- | --- | --- |
| Cradle Matron | 2++ | Destroy 100-HP nests to stop patient production. At most three nests and eighteen patients remain active. |
| Mold Alchemist | 3-- | Landing circles lock before the 1.3-second tell ends. Leave the five-second damaging, slowing mold. |
| Bellringer | 3- | Track the 35-degree opening in expanding rings; it rotates 30 degrees between casts. |
| Stitchwright | 3 | Shoot the 45-HP tether, rescue its target for one second, or leave its 350-pixel reach. Dodging still works. |
| Glass Surgeon | 3+ | Use the missing polygon edge. Breaking a 35-HP needle removes only its adjacent sides. |
| Ash Baker | 3++ | Loaves move slowly, stop on cover and split once after 1.5 seconds along announced directions. |
| Sluice Keeper | 4-- | Move through dry strips to avoid the warned side currents. Currents move players without direct damage. |
| Last Stationmaster | 4- | Cross by the open-arrow track; the closed-cross track receives a real swept carriage. |
| The Lamplighter | 4 | Stand inside one of three outlined candle-shadow pockets during the outside pulse. |
| The Anatomist | 4+ | Marks follow for 0.7 seconds, then freeze. Leave the fixed marks before the caliper snap. |
| Plague Gardener | 4++ | Shoot roots to open their own vine strip early. Each cut strip heals a survivor once for 10 HP. |
| Grave Choir | 5-- | Three independently drawn singers share boss health. Defeating a singer cancels its own staggered beams. |
| Red Abbess | 5- | Follow the moving sanctuary pockets or hold any neutral Accord pad for 1.2 seconds to cancel the inward wave. |
| Vesper Judge | 5 | Move into the other arena half before the alternating 1.7-second verdict tell resolves. |

## Black Bell Pilgrimage

![Black Bell Pilgrimage boss identities with names](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/bosses-long.jpg)

*Black Bell Pilgrimage — representative first poses from the current runtime atlases.*


| Boss | Fixed grade | Signature and response |
| --- | --- | --- |
| Pallbearer | 5+ | Break the 180-HP moving coffin or flank its protected front. The warned charge respects masonry. |
| Cinder Foreman | 5++ | The last occupied work zone stays cool. A neutral cooling lever can suppress the other vents. |
| Canal Diver | 6-- | Identify the bubbling true puddle, leave its emergence area and punish the recovery. The submerged body is protected. |
| Clockmender | 6- | Real projectiles pause after 1.4 seconds, remain stopped for two seconds, then restart along their original vectors. |
| Seamstress of Wires | 6 | Use the fixed 170-pixel gates or break an 80-HP anchor to remove its adjacent wire sections. |
| Gravedigger | 6+ | A destructible moving ridge blocks shots. Its final position warns before collapsing into a three-second pit. |
| Ink Notary | 6++ | The ground spiral draws progressively and leaves a 65-degree opening; cross through the missing sector. |
| Spore Beekeeper | 7-- | Three 55-HP hive drones control a 24-direction projectile wave. Breaking a drone removes its third; a fallback gap remains. |
| Ice Custodian | 7- | Three warned strips build at most 45 pixels/second of extra drift. Dry ground and dodging clear that drift immediately. |
| Bridge Ferryman | 7 | Cross the alternating open bridge or use the outer bypass. Water remains traversable but slows and hurts. |
| Porcelain Mourner | 7+ | Four moving cover fragments can be destroyed before their warned one-time six-shard split. |
| Boiler Tender | 7++ | Hold any neutral valve for 1.2 seconds to add a 70-degree escape wedge; the original fallback remains. |
| Mirror Undertaker | 8-- | The hollow delayed ghost at an old survivor position is harmless. Follow the black foot marker on the true body. |
| Chalk Magistrate | 8- | The warned rectangle leaves one erased edge. Its other three walls strike without creating an invisible movement trap. |
| Wire Harpist | 8 | Three visible strings strike in the fixed 0/1/2 order, 0.8 seconds apart. |
| Crow Shepherd | 8+ | Three flocks of five actual swept bird bodies follow warned paths and stop on cover. |
| Ledger Leech | 8++ | Up to two seals slow movement for four seconds. Walk through a cleansing circle; no currency is stolen. |
| Mortuary Engine | 9-- | Four seconds of body armor reduce incoming body damage by 60%; the exposed core then transfers one 1.6× hit to shared health. |
| Drowned Regent | 9- | The true body warps with a black foot marker; two hollow decoys are harmless. Water lanes shift on an independent twelve-second clock. |
| Salt Patriarch | 9 | Three inward salt perimeters retain two 200-pixel gates. A neutral two-second pad hold delays future steps. |

## Accord breaks

At marked transitions, survivors have eight seconds to coordinate a two-second hold on distinct Accord pads. Required participation scales 1, 2, 3 or 5 with party size. Success staggers the boss for four seconds, increases incoming boss damage by 25% and restores 15% party health. These are neutral team interactions, not purchases or class-exclusive actions.

## Grand Raid

![Grand Raid boss identities with names](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/bosses-raid.jpg)

*Grand Raid — representative first poses from the current runtime atlases.*


| Boss | Counterplay |
| --- | --- |
| Chain Colossus | 4-- |
| Ossuary Leviathan | 6++ |
| Bell Triplets | 3-- |
| Quarantine Heart | 7++ |
| Crown Procession | 8++ |
| City Eater | 10+ |
| Saint of the Last Breath | 10++ |

Pylon, keeper interrupt and attendant durability scales with party size and Brutal rules. Neutral valve holds remain usable by every class.

All sixty authored identities now execute. Native art and automated combat checks do not establish final human balance, complete directional/action animation or full device acceptance. [Full numerical roster](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/content/bosses.json) · [Current boss implementation and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/MIDNIGHT_CIRCUIT_RUNTIME.md)

## Endless exclusives and The Uncounted

![The nine Endless-exclusive bosses and The Uncounted](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/bosses-endless.jpg)

*Nine Endless identities plus the optional campaign secret. Sprite contact sheet; full action/facing acceptance continues.*


| Boss | Counterplay |
| --- | --- |
| The Uncounted | >10 |
| Hourglass Widow | 3++ |
| Unlit Astronomer | 8++ |
| Folded Man | 4++ |
| Red Comet | 5++ |
| Memory Taxer | 6++ |
| Choir of Moths | 7+ |
| Zero-Hour Conductor | 9+ |
| Walking District | 10 |
| The Last Knocker | 10++ |

Numbered history, beat pips, safe lane markers and knock counts remain visible. Sound, color distinction and unaided memorization are not required.

## Hollow Constable motion

![All twenty-seven Hollow Constable idle, attack, hurt, stagger and defeat poses at one world scale](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/constable-motion.jpg)

Four new whole sheets add nineteen poses alongside the eight retained attack frames. Cast anticipation now holds until the authoritative release, successful Accord uses a visible stagger loop, and the world clock completes a collapse after combat stops. This is a sprite reference; rendered/device/human acceptance remains open. [Production, timing and independent reconstruction](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CONSTABLE_MOTION.md).

## Opening-route defeats

![Four representative poses from each of seven new opening-route boss defeat sequences](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/opening-defeats.jpg)

Seven new eight-pose clips add 56 complete defeat poses. Constable and Warden already have dedicated defeats, so all nine opening identities now settle after victory. The renderer preserves original live action pixels, runs collapse once on authoritative world time, and holds the correct settled image during loading/retry. This is a sprite reference at one world scale; rendered/device/human transition review remains open. [Production, exact reconstruction and resource scope](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/OPENING_BOSS_DEFEATS.md).

## Courier living motion and survivor continuity

Courier gains four breathing, four hit-recoil and four Accord-stagger poses. Original charge and defeat pixels remain unchanged. Survivor running no longer switches to idle between movement updates; stable directional selection and one-shot facing remain separate from authoritative aim. All 64 boss identity crops preserve exact original world geometry. Rendered/device/human review of these changes remains open.

![Courier living reactions and retained action/defeat poses](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/courier-motion.jpg)

## Fixed classifications and roster coverage

Every implemented boss now keeps its authored grade across encounters. Five subtiers use --, -, no sign, + and ++; Brutal uses B, and >10 is reserved for secrets. Contracts derive actual health/pressure/reward from that grade. There are now 63 identities: 62 ordinary plus one secret, with 88 more ordinary identities needed. This earlier chart records the sixty-identity snapshot; the three Early Watch additions are listed separately below. The structured progress page contains current coverage. Final phase/mobility and human balance work continues.

![Fixed boss classification and coverage reference](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/fixed-threats.jpg)

| Boss | Fixed code |
| --- | --- |
| Hollow Constable | 1+ |
| Carrion Courier | 1-- |
| Pallbearer | 5+ |
| Cradle Matron | 2++ |
| Mold Alchemist | 3-- |
| Bellringer | 3- |
| Stitchwright | 3 |
| Grave Choir | 5-- |
| Mortuary Engine | 9-- |
| Drowned Regent | 9- |
| The Uncounted | >10 |
| The Tollkeeper | 1++ |
| Lantern Warden | 2-- |
| Ratcatcher | 1- |
| Quarantine Clerk | 1 |
| Chain Marshal | 2- |
| Gate Widow | 2 |
| Black Ambulance | 2+ |
| Glass Surgeon | 3+ |
| Ash Baker | 3++ |
| Sluice Keeper | 4-- |
| Last Stationmaster | 4- |
| The Lamplighter | 4 |
| The Anatomist | 4+ |
| Plague Gardener | 4++ |
| Red Abbess | 5- |
| Vesper Judge | 5 |
| Cinder Foreman | 5++ |
| Canal Diver | 6-- |
| Clockmender | 6- |
| Seamstress of Wires | 6 |
| Gravedigger | 6+ |
| Ink Notary | 6++ |
| Spore Beekeeper | 7-- |
| Ice Custodian | 7- |
| Bridge Ferryman | 7 |
| Porcelain Mourner | 7+ |
| Boiler Tender | 7++ |
| Mirror Undertaker | 8-- |
| Chalk Magistrate | 8- |
| Wire Harpist | 8 |
| Crow Shepherd | 8+ |
| Ledger Leech | 8++ |
| Salt Patriarch | 9 |
| Chain Colossus | 4-- |
| Ossuary Leviathan | 6++ |
| Bell Triplets | 3-- |
| Quarantine Heart | 7++ |
| Crown Procession | 8++ |
| City Eater | 10+ |
| Saint of the Last Breath | 10++ |
| Hourglass Widow | 3++ |
| Unlit Astronomer | 8++ |
| Folded Man | 4++ |
| Red Comet | 5++ |
| Memory Taxer | 6++ |
| Choir of Moths | 7+ |
| Zero-Hour Conductor | 9+ |
| Walking District | 10 |
| The Last Knocker | 10++ |

## Hollow Constable phase redesign

Patrol fires two locked volleys while shuffling between casts. Cordon crosses fans from two flanks. Lockdown pursues between staggered rings with a common escape wedge; Brutal adds Curfew and a third ring. Spaced arrest stamps force movement, and phase transitions clear outgoing attacks. Each delayed volley is warned from cast start. Casting, Accords and stagger plant the feet. The grade remains **1+**, or **1+ B** for Brutal.

![Four complete Constable shuffle poses at a common world scale](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/constable-patrol.jpg)

[Exact behaviors, production and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CONSTABLE_PATROL.md). Native/contact review and automated geometry checks are complete; rendered/device/human balance review remains open.

[Current development progress](Development-Progress) tracks new bosses, existing-encounter quality passes, class ability revamps, skill-tree work and map revisions, with implementation separate from human review.

The latest Constable Brutal pass adds an opening Patrol pincer, a Cordon ring follow-up, triple Lockdown rings and a Curfew pincer. Short persistent phase instructions explain the response. Brutal bosses now have a muted red sprite treatment and broken red ground mark. Fixed grade remains unchanged. [Current behavior and evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/PHASE_AND_BRUTAL_FEEDBACK.md).

## Early Watch runtime motion

Ashen Usher 1--, Brass Toad 1- and Ragpicker's Kite 1 add three distinct shared-authority encounters, explicit Brutal follow-ups, 36 complete selected poses and individual original scores. All fifteen launch locales have names, signature help and phase labels. Native/request preservation, whole-pose RGBA reconstruction and real network/weapon counterplay tests remain separate from rendered/human acceptance.

![Thirty-six Early Watch selected poses, a static local composite rather than an engine capture](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/early-watch-motion.jpg)

[Implementation and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/EARLY_WATCH_RUNTIME.md).

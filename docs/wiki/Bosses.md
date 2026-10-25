# Bosses

Sixty bosses are executable in the current source. Each has its own signature, phases, normal/Brutal variant, presentation and music. A signature table describes practical counterplay; supplemental attacks still require ordinary bullet-hell movement.

**Threat is encounter danger, separate from selected difficulty.** The tables show the authored minimum threat for each identity. Actual contracts follow the route's threat progression. A Brutal contract appends **+** to that threat, retains the same boss identity and signature, and adds its stronger variant behavior.

Brutal uses twice the health and damage, a 1.5× deadline, 1.75× bounty and four phases instead of three. It does not lift the global projectile cap. Higher phase pressure still preserves the signature's counterplay.

## Quarantine Run

![Quarantine Run boss identities with names](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/bosses-short.jpg)

*Quarantine Run — representative first poses from the current runtime atlases.*


| Boss | Minimum threat | Signature and response |
| --- | --- | --- |
| Hollow Constable | 1 | Watch the fan tells and leave marked arrest zones; gaps and open lanes remain. |
| Lantern Warden | 1 | Follow the rotating safe gap behind the lantern sweep; leave warned zones. |
| Carrion Courier | 1 | Leave the locked charge line and its damaging trail; punish the recovery. |
| Ratcatcher | 1 | Shoot the breakable sack to stop replenishment; ordinary rat packs are bounded. |
| Quarantine Clerk | 1 | Read the ordered stamps, then use the reopened safe interior. |
| The Tollkeeper | 1 | Avoid the locked two-segment wheel route; it reflects once and uses swept contact. |
| Chain Marshal | 1 | Destroy either 90-HP chain anchor to remove its sweep; Brutal doubles anchor health. |
| Gate Widow | 1 | Use the one open shutter lane; the other two physically close and block shots. |
| Black Ambulance | 1 | Sidestep the locked charge; the driver is exposed for three seconds afterward and takes bonus damage. |

## Midnight Circuit

![Midnight Circuit boss identities with names](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/bosses-standard.jpg)

*Midnight Circuit — representative first poses from the current runtime atlases.*


| Boss | Minimum threat | Signature and response |
| --- | --- | --- |
| Cradle Matron | 1 | Destroy 100-HP nests to stop patient production. At most three nests and eighteen patients remain active. |
| Mold Alchemist | 1 | Landing circles lock before the 1.3-second tell ends. Leave the five-second damaging, slowing mold. |
| Bellringer | 1 | Track the 35-degree opening in expanding rings; it rotates 30 degrees between casts. |
| Stitchwright | 1 | Shoot the 45-HP tether, rescue its target for one second, or leave its 350-pixel reach. Dodging still works. |
| Glass Surgeon | 1 | Use the missing polygon edge. Breaking a 35-HP needle removes only its adjacent sides. |
| Ash Baker | 1 | Loaves move slowly, stop on cover and split once after 1.5 seconds along announced directions. |
| Sluice Keeper | 1 | Move through dry strips to avoid the warned side currents. Currents move players without direct damage. |
| Last Stationmaster | 1 | Cross by the open-arrow track; the closed-cross track receives a real swept carriage. |
| The Lamplighter | 1 | Stand inside one of three outlined candle-shadow pockets during the outside pulse. |
| The Anatomist | 1 | Marks follow for 0.7 seconds, then freeze. Leave the fixed marks before the caliper snap. |
| Plague Gardener | 1 | Shoot roots to open their own vine strip early. Each cut strip heals a survivor once for 10 HP. |
| Grave Choir | 1 | Three independently drawn singers share boss health. Defeating a singer cancels its own staggered beams. |
| Red Abbess | 1 | Follow the moving sanctuary pockets or hold any neutral Accord pad for 1.2 seconds to cancel the inward wave. |
| Vesper Judge | 1 | Move into the other arena half before the alternating 1.7-second verdict tell resolves. |

## Black Bell Pilgrimage

![Black Bell Pilgrimage boss identities with names](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/bosses-long.jpg)

*Black Bell Pilgrimage — representative first poses from the current runtime atlases.*


| Boss | Minimum threat | Signature and response |
| --- | --- | --- |
| Pallbearer | 1 | Break the 180-HP moving coffin or flank its protected front. The warned charge respects masonry. |
| Cinder Foreman | 1 | The last occupied work zone stays cool. A neutral cooling lever can suppress the other vents. |
| Canal Diver | 1 | Identify the bubbling true puddle, leave its emergence area and punish the recovery. The submerged body is protected. |
| Clockmender | 1 | Real projectiles pause after 1.4 seconds, remain stopped for two seconds, then restart along their original vectors. |
| Seamstress of Wires | 1 | Use the fixed 170-pixel gates or break an 80-HP anchor to remove its adjacent wire sections. |
| Gravedigger | 1 | A destructible moving ridge blocks shots. Its final position warns before collapsing into a three-second pit. |
| Ink Notary | 1 | The ground spiral draws progressively and leaves a 65-degree opening; cross through the missing sector. |
| Spore Beekeeper | 1 | Three 55-HP hive drones control a 24-direction projectile wave. Breaking a drone removes its third; a fallback gap remains. |
| Ice Custodian | 1 | Three warned strips build at most 45 pixels/second of extra drift. Dry ground and dodging clear that drift immediately. |
| Bridge Ferryman | 1 | Cross the alternating open bridge or use the outer bypass. Water remains traversable but slows and hurts. |
| Porcelain Mourner | 1 | Four moving cover fragments can be destroyed before their warned one-time six-shard split. |
| Boiler Tender | 1 | Hold any neutral valve for 1.2 seconds to add a 70-degree escape wedge; the original fallback remains. |
| Mirror Undertaker | 1 | The hollow delayed ghost at an old survivor position is harmless. Follow the black foot marker on the true body. |
| Chalk Magistrate | 1 | The warned rectangle leaves one erased edge. Its other three walls strike without creating an invisible movement trap. |
| Wire Harpist | 1 | Three visible strings strike in the fixed 0/1/2 order, 0.8 seconds apart. |
| Crow Shepherd | 1 | Three flocks of five actual swept bird bodies follow warned paths and stop on cover. |
| Ledger Leech | 1 | Up to two seals slow movement for four seconds. Walk through a cleansing circle; no currency is stolen. |
| Mortuary Engine | 1 | Four seconds of body armor reduce incoming body damage by 60%; the exposed core then transfers one 1.6× hit to shared health. |
| Drowned Regent | 1 | The true body warps with a black foot marker; two hollow decoys are harmless. Water lanes shift on an independent twelve-second clock. |
| Salt Patriarch | 1 | Three inward salt perimeters retain two 200-pixel gates. A neutral two-second pad hold delays future steps. |

## Accord breaks

At marked transitions, survivors have eight seconds to coordinate a two-second hold on distinct Accord pads. Required participation scales 1, 2, 3 or 5 with party size. Success staggers the boss for four seconds, increases incoming boss damage by 25% and restores 15% party health. These are neutral team interactions, not purchases or class-exclusive actions.

## Grand Raid

![Grand Raid boss identities with names](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/bosses-raid.jpg)

*Grand Raid — representative first poses from the current runtime atlases.*


| Boss | Counterplay |
| --- | --- |
| Chain Colossus | Break any 110-HP anchor pylon to stop the three-second pull and open four seconds of vulnerability. Outer lanes remain clear. |
| Ossuary Leviathan | Three ribs expose in sequence for three seconds each, transferring one 1.5x hit. The long body curves through the arena and respects cover. |
| Bell Triplets | Three separate keepers share boss health. Deal 95 base damage to the highlighted keeper to interrupt its beam; a 185-pixel gap remains. |
| Quarantine Heart | Hold F at a neutral valve for 1.5 seconds to disable its hose, reverse 120 damage and open a four-second vulnerability. |
| Crown Procession | Four visible attendants follow a moving throne. Defeat any attendant to stop it for five seconds, or use its scheduled four-second rest. |
| City Eater | Leave the two warned bite lanes through the 240-pixel corridor. Break either 120-HP core cover to expose a 1.5x weak point. |
| Saint of the Last Breath | Move into either shelter to cancel inhalation; avoid the three later slow rings of actual projectiles. |

Pylon, keeper interrupt and attendant durability scales with party size and Brutal rules. Neutral valve holds remain usable by every class.

All sixty authored identities now execute. Native art and automated combat checks do not establish final human balance, complete directional/action animation or full device acceptance. [Full numerical roster](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/content/bosses.json) · [Current boss implementation and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/MIDNIGHT_CIRCUIT_RUNTIME.md)

## Endless exclusives and The Uncounted

![The nine Endless-exclusive bosses and The Uncounted](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/bosses-endless.jpg)

*Nine Endless identities plus the optional campaign secret. Sprite contact sheet; full action/facing acceptance continues.*


| Boss | Counterplay |
| --- | --- |
| The Uncounted | Use the persistent echo warnings and wide final ring gap, clear nearby summons and treat the extension as a separate challenge. |
| Hourglass Widow | Remember the dashed replay paths or use the persistent safe flank. |
| Unlit Astronomer | Follow the clear hollow safe marker; visual paths remain readable without glow. |
| Folded Man | Use the permanently unreflected side; predicted paths show both entry and exit directions. |
| Red Comet | Follow the numbered path and cross the oldest faded trail. |
| Memory Taxer | Use the numbered visual history that stays on the HUD; memorization is optional and accessible. |
| Choir of Moths | Cross at the broken ribbon and ignore decorative wing dust, which is not generated. |
| Zero-Hour Conductor | Read the persistent beat pips and safe lane marker; audio rhythm is never required. |
| Walking District | Use the broad outer bypass or the cleared central path after the blocks settle. |
| The Last Knocker | Follow the three visible knocks and move behind the hinge; attack during the open-door recovery. |

Numbered history, beat pips, safe lane markers and knock counts remain visible. Sound, color distinction and unaided memorization are not required.

## Hollow Constable motion

![All twenty-seven Hollow Constable idle, attack, hurt, stagger and defeat poses at one world scale](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/constable-motion.jpg)

Four new whole sheets add nineteen poses alongside the eight retained attack frames. Cast anticipation now holds until the authoritative release, successful Accord uses a visible stagger loop, and the world clock completes a collapse after combat stops. This is a sprite reference; rendered/device/human acceptance remains open. [Production, timing and independent reconstruction](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CONSTABLE_MOTION.md).

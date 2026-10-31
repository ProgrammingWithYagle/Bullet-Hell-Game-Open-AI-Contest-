# Bosses

Clerk uses three/five/ten reachable seals in Standard/Brutal/Crazed. Standard reopens I then III; Brutal holds one randomly chosen green number I–V throughout phase one and rerolls each phase-two batch; Crazed rerolls every batch. The notch reveals it before strikes. Advanced shelter lasts at least 3.5/5 seconds and through the final marked echo. Purple adds once-per-seal 15% current-health loss, three-second nonstacking poison and 35% walking slow to its doubled impact. Green/invulnerability prevent application and poison damage; antidotes and Medic cleanses remove it. Black remains a once-per-seal 75%-current-health curse with a 1 HP floor. [Implementation](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CLERK_VENOM.md). New follow-up human balance/readability review remains open.

Ratcatcher changes from stationary Open Sack to a late Roving Muster. It marks a short patrol, stops, then warns new fixed scent lanes. Rats route around cover; advanced forms add one/two warned gapped whistle rings. The intrinsic sack cancels rat packs, not whistles. Health, damage, deadline, sixteen poses and the original score remain. [Implementation](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/RATCATCHER_MUSTER.md). Human review remains open.

Carrion Courier now changes from one to two Standard deliveries at half health. Each leg warns from its actual previous stop; Brutal/Crazed add one leg and a fully warned split fan. Trails fade from the oldest end, with explicit recovery between routes. Its fixed1-- grade, health, damage, 28 poses and Undelivered theme remain. [Courier implementation](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/COURIER_ROUTE.md). Current original quality progress: 12/60 implemented, 48 remaining; human acceptance open.

Sixty-six bosses are executable in the current source. Each has its own signature, phases, Standard/Brutal/Crazed forms, presentation and music. A signature table describes practical counterplay; supplemental attacks still require ordinary bullet-hell movement.

**Each boss has a fixed intrinsic threat grade.** Routes select suitable identities; they do not rerate a boss to match the encounter number. Subtiers use **--, -, no sign, +, ++** for bottom through top tier. Hollow Constable is **1+** and Bell Triplets are **3--**. Brutal uses a separate **B** marker, such as **1+ B**. Crazed uses a separate **C** marker and purple treatment. Secrets display **>10**, followed by the selected form marker. Global difficulty and party scaling remain separate.

Brutal uses twice the health/damage, 1.5x deadline and 1.75x bounty. Crazed retains those health/damage factors and inherits the complete Brutal signature. Threats 1–2 use two half-health phases in every form; higher threats retain three Standard/four advanced phases. The nameplate separates the name, grade/form, phase and timer. A segmented bar, distinct phase sound and reduced-motion-aware bar engraving mark transitions.

For projectile-bearing techniques, Brutal ordinary projectile budgets are 2.5x Standard; Crazed is 7.5x Standard, three times Brutal. Warned repeats retain aim/gaps; controlled clock/drone shots keep actual stop/resume and source cancellation. The current common pressure adds Brutal pursuit marks/crosscuts and Crazed crossing weave for64 identities. Alchemist and Bellringer replace that layer with owned chemistry and acoustic techniques. Move before the fixed tells finish. Queues and the 4,000-live-hostile cap remain; cancellation/safety can reduce actual releases. No instant-kill attacks are added. **Insane forces Brutal; Hellish forces Crazed**, including the secret. [Exact rules](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/DIFFICULTY_AND_PHASES.md).

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
| The Tollkeeper | 1++ | Leave each wheel arrow; read the fresh return after its wall stop and punish recovery. |
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
| Bellringer | 3- | Approach, overlapping peals and aimed clappers. Brutal layers four to six fronts; Crazed adds a concurrent responding bell and its own clapper. |
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

Only Baby/Easy Standard offer the global shield-circle event. Baby has six circles and a two-second hold; Easy has three circles and a three-second hold. Required occupants are one solo, two through eight players, and three for larger squads, within an eight-second event. Success grants the authored four-second stagger, vulnerability and party heal. Normal+, Brutal and Crazed disable the event. Individual encounter weak points and neutral signature interactions are separate counterplay.

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

All sixty-six identities now execute. Native art and automated combat checks do not establish final human balance, complete directional/action animation or full device acceptance. [Full numerical roster](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/content/bosses.json) · [Current boss implementation and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/MIDNIGHT_CIRCUIT_RUNTIME.md)

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

## Roving Warden quality pass

Lantern Warden retains fixed **2--** and Normal health/damage/deadline. **Still Watch** holds its lantern in place; the half-health **Roving Vigil** marks a route and patrols before the next locked-origin sweep. Movement resolves the actual 58-pixel boss against map cover. Its 1.2-second sweep warning stays complete and its marked trailing space remains clear.

Brutal alternates sweep direction and repeats recovery fans in two warned locked-origin waves. The final phase adds a fully warned reverse return sweep after a brief pause; active cones never overlap. Persistent phase-response help and static direction/route arrows cover all fifteen locales. The original Last Light theme and tempo-aligned percussion remain.

![Four original Warden patrol poses, a sprite reference rather than gameplay capture](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/warden-patrol.jpg)

Four new poses preserve the exact native/request, whole lantern ownership and all source RGBA. Technical packing adjusts world scale to retain the established body height; earlier Warden artwork stays unchanged. [Actual authority, art and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/WARDEN_PATROL.md). Rendered/human/device/native-language/listening acceptance remains open.


## Small Wakes: three new ordinary encounters

Candle Snail **1--**, Cobble Crab **1-** and Mourning Kettle **1** bring the roster to **66 (65 ordinary, one secret)**. Eighty-five further ordinary identities remain. Each has two half-health phases, divided health, an independent entry cue, persistent fifteen-locale response text, complete selected motion and an individual original score. All earlier boss health/damage/deadlines and fixed grades remain unchanged.

| Boss | Phase change and counterplay | Extra Brutal mechanic |
| --- | --- | --- |
| Candle Snail | Waxwake becomes two separated Twin Wick rails with a quiet center. Leave the marked wax before it burns; masonry stops it. The body glides faster after half health. | Delayed cross-cut, follow-up fan and real second projectile waves. |
| Cobble Crab | Grate Clamp becomes alternating double Cross Streets closures. Exit the marked jaws or break their linked finite anchor. The body scuttles sideways. | Independent second anchor/closure and additional doubled volley. |
| Mourning Kettle | Pressure Pour becomes two staggered Last Service lanes with a cold center. Sidestep steam, then crossing beads, or break a linked valve. The body waddles. | Delayed rear pour and real doubled bead waves. |

Finite anchors/valves are individual boss weak points, separate from the global phase-circle shield event. That event remains Baby/Easy Standard only, absent on Normal+ and all advanced forms. Already emitted projectiles and their warned repeat waves remain hazards when an object breaks. Hellish forces every new encounter Crazed and retains warned lava.

![Candle Snail: original static identity reference](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/small-wakes-candle-snail.png)

![Cobble Crab: original static identity reference](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/small-wakes-cobble-crab.png)

![Mourning Kettle: original static identity reference](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/small-wakes-mourning-kettle.png)

[Implementation, original art/audio and verification limits](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/SMALL_WAKES_RUNTIME.md). Rendered, human balance, native-language, listening and physical-device acceptance remain open.

## Visible Clerk shelter

In Standard, after a notched seal reopens, the other two red seals fire locked seven-shot fans after 1.2-second warnings. The green shield opens 0.5 seconds before release, absorbs actual hostile shots at its rim and lets survivors keep shooting. Dodging outside remains possible. Its outer ring counts down the 2.5-second protection window; static broken-bullet marks show real interceptions. Brutal/Crazed now warn three/four marked origins under the existing 2.5x/7.5x projectile budgets; see the graded follow-up below. Active shelter now grants the requested form/phase boss-damage bonuses; base boss health remains. [Implementation](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CLERK_SHELTER.md).

The human found the earlier order/notched safe III clear enough, but did not discover its purpose. The human liked the shelter purpose and rim effect at frozen 5190. This limited element feedback grants no additional identity, individual-quality or full whole-boss acceptance credit. Instructions now live in the closed manual guide. Testing offers it on every difficulty; the separate public build offers the optional guide only on Baby. The human confirmed the guide works at 5193.

## Banked returns and graded verdicts

Tollkeeper keeps a complete reflected opening wheel. Closing Booth marks a lateral move, then stops the wheel at a wall before a freshly aimed 1.2-second return tell. Advanced forms add warned side coin sprays and a third late leg. One live wheel respects actual bounds/cover and moving survivor sweeps. Base health, deadline, grade, art and Copper Debt remain. [Implementation](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/BANKED_VERDICTS.md).

Clerk uses three/five/ten reachable seals in Standard/Brutal/Crazed. Standard reopens I then III; Brutal holds one randomly chosen green number I–V throughout phase one and rerolls each phase-two batch; Crazed rerolls every batch. The notch reveals it before strikes. Advanced shelter lasts at least 3.5/5 seconds and through the final marked echo. Purple adds once-per-seal 15% current-health loss, three-second nonstacking poison and 35% walking slow to its doubled impact. Green/invulnerability prevent application and poison damage; antidotes and Medic cleanses remove it. Black remains a once-per-seal 75%-current-health curse with a 1 HP floor. [Implementation](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CLERK_VENOM.md). New follow-up human balance/readability review remains open.

## Shifting Writ and the manual guide

Boss instructions no longer cover live combat automatically. Open Boss guide to read the retained phase/signature text; in Solo, the worker and scene pause until it closes. Manual pause remains independent; online play continues with a notice. Current testing exposes all difficulties. The separate public build offers the optional guide only on Baby.

Chain Marshal’s Held Line warns opposite planted sweeps; at half health Shifting Writ marks a move, staggers its arms and freshly warns reversed returns. Clear connected placements replace buried fixed sockets. Real cover/bounds clip warning and damage. Cuts cancel only that arm and its unreleased barbs; flying shots remain. Advanced opening barbs actually emit 40/120 Brutal/Crazed shots, with later Crazed crossing repeats. Original health/damage/deadline/grade, art and Iron Jurisdiction theme remain. This is quality implementation seven of sixty, with human acceptance open.

## Crossed Threshold

Gate Widow now warns numbered gates with a reachable open lane. Its second phase marks real lateral movement, then alternates vertical/horizontal sets. Floor palls sweep the closed lanes, making the opening useful; a timed dash is an alternative. Only one gate closes at once, with explicit exit intervals. Brutal adds warned post needles; Crazed inherits them and adds a serial gate plus crossing repeats. Connected placement, safe ejection and damage share actual cover/lava geometry. Existing grade, health/damage/deadline, art and Third Latch theme remain. This is quality implementation eight of sixty, with human balance acceptance open. [Details](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CROSSED_THRESHOLD.md).

Clerk shelter now grants boss damage bonuses of +50%/+35% Standard, +40%/+20% Brutal and +25%/+5% Crazed by phase. Crazed phase two leaves two amber infinity-marked domains per batch; each warns two seconds and lasts through the fight. Contact removes 10% maximum health under one shared one-second budget across overlaps. Green shelter and invulnerability protect; active domains survive stagger and clear at encounter exit. This follows the user's explicit maximum-health choice. [Current behavior](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CROSSED_THRESHOLD.md#clerk-follow-up-requested-at-5193).

## Last Dispatch

Black Ambulance follows a connected body-clear route, then warns one road in Last Call or two fresh headings in Second Dispatch. Every road locks before movement. The last stop exposes its driver for three seconds, retaining +25% boss damage. Brutal has two/three dispatches and 40-shot gapped door stops; Crazed keeps them, adds a fourth late dispatch and 120-shot crossing stops. All repeats warn, and unreleased work cancels on interruption. Fixed grade 2+, base combat values, selected art and individual theme remain. This is original quality implementation nine of sixty; human acceptance is open. An earlier outside-arena probe claim was rejected after correcting nonzero map origins; actual border walls were already protective. [Implementation and evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/LAST_DISPATCH.md).

## Cradle Relay

Cradle Matron follows body-clear escort routes toward marked nests. Hushed Ward calls one gapped lullaby; at half health Cradle Relay calls from surviving nests in numbered order. Each gap locks before a full 1.6-second warning expires. Nests warn 1.2 seconds before two early or four late navigating minions, with the live cap eighteen. Destruction stops future brood and unreleased needles, while launched rings continue. Brutal adds 30 alternating-port needles per calling nest; Crazed retains them and adds 60 crossing needles. All directions and remaining waves are marked. Fixed grade 2++, base combat, selected poses and individual theme remain. This is quality implementation ten of sixty; final human acceptance remains open. [Implementation and evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/MATRON_WARD.md).

## Alchemist laboratory

The latest human feedback replaced Reagent Road’s weak fronts and needle sprays with owned chemistry. Aimed acid/alkali flasks mark survivor landings; opposites mix into pale coolant. Distillation adds a full-field vapor bank that opens around coolant; Thermal Runaway adds pressure vessels that coolant can defuse; advanced Fractionation sends two separately warned banks. Brutal matching reagents couple into cancelable timed eruptions. Crazed adds violet catalysts with deliberate quench/eruption choices and more vessels. Alchemist no longer runs generic bullet/laser pressure. Eight newly drawn walk poses accompany eight pixel-exact retained action frames. Grade3--, base combat and individual theme remain. This revises quality implementation eleven and adds no extra credit. [Mechanics/evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/MOLD_MIXING.md), [encounter design](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/BOSS_ENCOUNTER_DESIGN.md). New human/rendered/balance acceptance remains open.

## Resonant Tolls (historical protocol34)

Superseded by the Counterpoint revision below.

Bellringer now uses Single Toll, Procession, Counterstroke and advanced Carillon. Outward/inward fronts lock their source and 35-degree gap while travelling. A connected procession has eight new drawn gait poses. Brutal holds outward waves in harmless silence, retunes the gap by sixty degrees and warns before resuming. Crazed adds a marked responding bell while the primary stays harmless, followed by a fresh primary release warning. At most one front is dangerous at a time. Generic Bellringer bullets/lasers are replaced by these acoustic techniques. Grade 3-, base combat, individual theme and original action pixels remain. This is quality implementation twelve; human acceptance is open. [Mechanics and evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/BELL_CARILLON.md).

## Bell Counterpoint

Human5204 found Bellringer too weak for grade3-. It now approaches a survivor, then overlaps peals with separately warned clapper sectors. Standard has two/three/four fronts across its phases; Brutal has four/four/five/six and multiple clappers. Crazed adds three/four concurrent reply fronts and a second clapper source while the primary keeps attacking. Openings stay fixed and share clear floor. Actual toll/reply/clapper sounds differ. All base combat, fixed grade, music and art remain; quality stays12/60,roster66. New human review is open. Mold Alchemist Crazed tuning remains pending; protocol36 subsequently implemented global committed-attack phase continuity. [Mechanics](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/BELL_COUNTERPOINT.md).

## Committed attacks across phase changes

Development build **2026.10.28-unbroken-attacks / protocol36** keeps already warned or released attacks alive through phase entry on every difficulty. Custom owners retain the issuing phase for their children; weak points, terrain and summons stay authoritative. Fresh casts wait through the shared1.5-second grace or optional Baby/Easy assistance. Completing that channel still earns an interruption; natural expiry, genuine weak-point breaks and encounter cleanup remain. Software evidence and human/rendered balance acceptance are separate.

At the protocol-36 checkpoint, human5206 found Bellringer pressure sufficient and possibly too high for Standard. The requested calibration and distinct Brutal mechanic are implemented by protocol37 below. Stronger themed Alchemist Crazed and the requested shared General mobility branch (Double Dash/Sprint) are also pending. Roster66, ordinary deficit85 and quality12/60 with48remaining stay unchanged. The full game remains unfinished.

## Bellringer: Returning Clapper (protocol 37)

Development build **2026.10.28-returning-clapper** eases Standard with a 46-degree gap, 1.05-second beat spacing and 260-unit primary clapper reach. Brutal adds one physical chained-clapper throw per primary score: a full 1.3-second outbound warning, landing, then a fresh 1.2-second return warning. The thin tether is harmless; only the travelling head hurts, once per leg. During the return warning, shoot the white cracked head (45 health) to stop its return or leave the return lane. Crazed inherits a 65-health head and retains its simultaneous responding bell. Issued throws and returns persist through phase entry. Fixed grade3-, base combat, all art and music remain.

The complete-score probe covers408cases/128708ticks/336throws/10350return-and-peal overlap ticks, with no generic hostile projectiles. Actual projectile breaks, owner/observer replication, strict issued-36 local migration and current phase-continuity/full-suite checks are separate from rendered/human/final balance acceptance. Roster66/ordinary deficit85/quality12of60/48remaining stay unchanged. At protocol37, Alchemist Crazed and the General mobility branch were pending. Protocol38 below implements the Alchemist follow-up; the earned-SP General branch (Double Dash/Sprint) is still pending. [Exact mechanics and limits](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/RETURNING_CLAPPER.md).

## Crazed Alchemist: Volatile Distillation (protocol 38)

Build **2026.10.28-volatile-distillation** adds Crazed-only conical columns while the original recipes continue. PhaseI has one fixed two-cloud lane;II re-aims three clouds;III has two staggered columns with two each;IV has three each, ending in inward reflux. Each full route warns1.8seconds. Aerosols pass above masonry, hit once per cloud and slow movement to0.7while inside. Mix coolant beside a column to stop future and still-pending releases. Already emitted clouds continue until expiry or coolant contact, which condenses them and spends the coolant after0.9seconds of grace. Columns cannot be shot.

Normal/Brutal chemistry, base combat, fixed3--grade, selected art and individual music remain. A240-case issued/current owner comparison checks unaffected movement, cues, clocks and damage. Separate actual-Game map/phase, real recipe/health/prediction and owner/observer tests exercise the new chemistry. Current full-suite/CI and exact-runtime evidence are recorded with the checkpoint; software samples are not human clears or final balance. Roster66/ordinary deficit85/original quality12of60/48remaining stay unchanged. The shared earned-SP General mobility branch is deferred during public polish. [Mechanics and limits](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/VOLATILE_DISTILLATION.md).

## Current encounter presentation (protocol 41)

Boss defeated keeps the existing fall or final pose visible for five seconds and adds a preparation message and countdown before choices or results. Cobble Crab and the other two Small Wakes bosses now keep their full painted footprint within the selected map’s floor, using all animation-frame bounds. Their collision radius stays the same, and the final pose retains its last actual position. This addresses visible Crab artwork crossing Triage Yard’s edge. Native software/asset evidence is separate from rendered and human acceptance.

## First Watch visual polish (protocol 38)

In `2026.10.28-first-watch`, a violet catalytic reaction has an angular warning center, followed by a local shock ring and starburst inside its existing damage radius. Reduced motion retains a static burst and boundary. Pale mixed coolant keeps its separate water mark and purpose. This changes presentation only: reaction damage, warning/lifetime, chemical authority and all phase ownership remain. The prior software balance samples retain their own source identities; human combat readability and final balance review remain open.

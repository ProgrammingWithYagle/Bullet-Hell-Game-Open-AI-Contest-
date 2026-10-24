# Changelog

Development build **2026.10.24-raid**, protocol 11. These entries describe the feature-branch source; the public playtest remains an earlier protocol-4 deployment.

## 2026-10-24 — Seven more bosses and Grand Raid

### Playable content

- Grand Raid is a three-fight route for one to sixteen survivors: two different regular bosses, then a reserved finale. Threat rises through 4, 7 and 10; skill budgets are 12, 20 and 27; nominal income budgets are 600, 1,400 and 2,400. Ossuary Works, Bell Foundry and Crown Crypt provide the three layouts.
- Added Chain Colossus, Ossuary Leviathan, Bell Triplets, Quarantine Heart, Crown Procession, City Eater and Last Breath Saint. The executable roster reaches 50 bosses across five modes, with an individual original theme for each.
- Counterplay includes breakable anchor pylons, three sequential rib openings, three independently visible interruptible keepers, neutral F-operated pump valves, four separate throne attendants, a 240-pixel bite escape lane, destructible core covers and shelters against inhalation. These objectives work with a solo class as well as a party.

### Art, music and rules

- Connected 72 drawn boss/keeper/attendant poses and eight props. All twelve returned natives and exact requests remain preserved, including the two superseded sheets. Independent audits reconstruct all selected sprites and verify their transparent padding.
- Composed seven additional original themes. The prior 43 music masters remain unchanged. Final human listening, full rendered motion, device mix and balance acceptance remain open.
- Protocol 11 shares Raid pull movement with client prediction and migrates bounded local protocol-10 saves. Online and signed recovery require an exact current version. Rib and core hits transfer one boosted hit without also crediting the body.
- The Leviathan checks its whole broad body against cover; interrupting a highlighted keeper disables that keeper beam. Defeating a throne attendant opens a five-second stop, and a neutral valve reverses one hose only once.

## 2026-10-24 — Twenty more bosses and Black Bell Pilgrimage

### Playable content

- Black Bell Pilgrimage now runs sixteen different fights from its own twenty-boss pool: fifteen regular encounters and one of three reserved finales. The playable roster reaches 43 identities, each with an individual original music theme.
- Added Pallbearer, Cinder Foreman, Canal Diver, Clockmender, Seamstress of Wires, Gravedigger, Ink Notary, Spore Beekeeper, Ice Custodian, Bridge Ferryman, Porcelain Mourner, Boiler Tender, Mirror Undertaker, Chalk Magistrate, Wire Harpist, Crow Shepherd and Ledger Leech, plus Mortuary Engine, Drowned Regent and Salt Patriarch finales.
- New counterplay includes destructible moving cover, stopped and restarted projectiles, removable fence anchors and swarm wedges, bounded ice drift, alternate bridge crossings, porcelain cover that splits, neutral pressure valves, harmless ghost copies, erased chalk walls, timed strings, actual crow flocks, cleansing circles and open salt gates.

### Art, audio and fixes

- Connected 168 drawn boss/crow poses and sixteen signature props. Thirteen clipped first sheets were replaced by complete smaller-scale sheets; all 36 native returns and exact requests remain preserved. Independent audits reconstruct every shipped pixel and verify atlas padding.
- Composed twenty new original themes with separate melodies, harmonic routes and phrasing. All earlier 23 music masters remain unchanged. Objective checks cover all 43 themes; final listening and device mix approval are still open.
- Protocol 10 shares ice drift and seal cleansing with prediction, preserves bounded local protocol-9 saves, and replicates frozen/restarted projectile velocities using the same identities. Fixed a route-income rounding error that could lose one coin.
- A guarded core transfers one boosted boss hit rather than double-counting the body. Warps reset the collision origin, moving cover stops at masonry, neutral salt holds delay the real next cast, and network signature cues copy coordinates without overwriting their numeric IDs.
- Fixed health-reducing mutations at the voting boundary: current health and maximum health now agree immediately, so authoritative recovery accepts the same valid state the player sees. The local service health endpoint now reports actual playable-content counts automatically.

## 2026-10-24 — An in-game development journal

### Added

- Open Changelog from the main menu footer to read dated updates without leaving the game. The build identifier stays visible in the menu and the journal.
- The game, repository changelog and GitHub Wiki changelog now read one history file. Older production records remain available in the source archive.

### Documentation corrected

- Rewrote the fifteen Wiki reference pages around the playable source build, removing contradictory checkpoint counts. Each page distinguishes working systems from planned features.
- The public playtest still serves its older two-class build. Updating the source and Wiki does not update that deployment.

## 2026-10-24 — Fourteen new bosses and Midnight Circuit

### Playable content

- Added Cradle Matron, Mold Alchemist, Bellringer, Stitchwright, Glass Surgeon, Ash Baker, Sluice Keeper, Last Stationmaster, The Lamplighter, The Anatomist, Plague Gardener, Grave Choir, Red Abbess and Vesper Judge. The playable roster is now 23 bosses.
- Midnight Circuit is a ten-fight run: nine different regular bosses followed by one of three reserved finales. Skill points reach 27 and nominal base income reaches 2,400 before the finale.
- Each encounter has its own counterplay: break nests or needles, rescue tethered allies, use ring gaps and lit pockets, avoid signaled trains, cut healing vines, silence individual Choir singers, neutralize the Abbess wave, or move to the safe arena half.

### Art, music and fixes

- Added fourteen original boss themes, 128 drawn boss/part/minion poses and eight signature props. The earlier nine boss music masters remain unchanged.
- Choir singers now have separate visible bodies and shared boss health; defeated singers stop their own attacks. Infirmary patients have their own sprites. Bakery loaves stop at cover before splitting.
- Protocol 9 shares current, pool and tether movement between prediction and the server. All fourteen new identities have real WebSocket encounter coverage; the full verification passed 171 tests, content checks, TypeScript and a production build.

[Source checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/commit/9db2c6e81823451c165466a7da1c2f2133c17374).

## 2026-10-24 — All seven classes and six different maps

### Playable content

- Added Tank, Mage, Engineer and Assassin alongside Soldier, Medic and Heavy. All seven kits execute their two abilities and ultimate, with 378 skill nodes, 63 specialization paths and 28 class weapons.
- Added six distinct traversable layouts: Gatehouse 1,600 × 1,000; Triage Yard 1,600 × 900; Ossuary Works 1,300 × 1,000; Sunken Chapel 1,400 × 920; Bell Foundry 1,500 × 850; Crown Crypt 1,240 × 880. Cover and spawn positions change with each map.
- Connected 52 additional item illustrations, 124 approved class motion poses and sixteen environment/construct props. Weapons, supplies, all specialization paths and mutations now have individual item artwork.

### Rules and verification

- Protocol 8 carries authoritative class kit state. Turrets, barricades, rescue charges, wards, stealth and shadow movement work offline and online. Arena selection, route rotation and prediction use the same geometry.
- Verified reachability for fifty spawn positions and five Accord pads on every map. The full pipeline passed 150 tests at this checkpoint.

[Source checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/commit/d51e6072649b4566263f7adddea6f66e2c504581).

## 2026-10-23 — A complete Quarantine boss pool

### Added

- Added Tollkeeper, Chain Marshal, Gate Widow and Black Ambulance. Their signatures use a reflected wheel, breakable chain anchors, rotating open shutters and an exposed driver after a charge.
- Quarantine Run now draws four different regular bosses and one reserved finale from its nine-boss pool. Added four themes and 32 drawn boss poses.
- Connected map selection and rotation, Brutal finale contracts and protocol-7 save compatibility. The full pipeline passed 133 tests at this checkpoint.

[Source checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/commit/0cc5b1b77d8670e8d40595b77dcf28b4983e6387).

## 2026-10-23 — More bosses, illustrated items and individual themes

### Added and fixed

- Added Carrion Courier, Ratcatcher and Quarantine Clerk with charge trails, bounded rat packs and a breakable sack, and ordered stamps that reopen a safe interior.
- Added 71 item illustrations, 32 boss/minion poses and five distinct original boss themes. Boss music crossfades and warning ducking are connected to combat.
- Endless uses every implemented identity before Brutal repeats and avoids immediate repeats. Brutal threat labels append +. Fixed fractional weapon cadence and reused collision query buffers. Protocol 6; 124 tests passed.

[Source checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/commit/9a2ed8a).

## 2026-10-23 — Lantern Warden and Heavy

### Added

- Connected the Lantern Warden signature, rotating safe gap, phases, Accord breaks and Brutal variant to actual encounters. Added 27 Warden motion frames.
- Made Heavy playable with Suppressing Cone, Braced Firing and Foundry Overture, four weapons, 54 skills and 32 drawn run frames.
- Added compact projectile waves and compatible local boundary-save migration. Protocol 5; 108 tests passed.

[Source checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/commit/d107454).

## 2026-10-23 — First playable expedition

### Foundation

- Implemented the shared 30 Hz offline/online combat loop, Soldier and Medic, Hollow Constable, revives, Accord, concealed contracts, mutations, prerequisite-aware skills and authoritative purchases.
- Added public rooms, private codes, sixty-second reconnect reservations, offline boundary saves, keyboard/mouse, gamepad and touch controls, fifteen language catalogs and original synthesized audio.
- Published the earlier anonymous protocol-4 playtest. Its two-class content is an older deployment and does not represent the current local build.

## Still in development

- Ten authored boss identities, the full Endless-exclusive schedule and the secret extension still need implementation.
- Complete action/facing art, balance, final rendered playtests, physical-device and native-language review remain in progress.
- Persistent mastery/cosmetics, verified rankings, durable online recovery and the Windows/offline/LAN release are not complete.

[Earlier production history](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/history/CHANGELOG-2026-10-24.md). Historical counts describe their own checkpoints.

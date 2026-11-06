# Warden encounter and playable Heavy

> Dated subsystem record: counts, source hashes and test totals below describe this page's recorded stage. For the current game and remaining work, use [implementation state](IMPLEMENTATION_STATE.md), [development progress](DEVELOPMENT_PROGRESS.md) and the [continuation checkpoint](CHECKPOINT_2026_10_25.md). Current [fixed-grade rules](FIXED_BOSS_THREATS.md) supersede older encounter-scaled ratings and the old Brutal-plus label.

Current source continuation, October 23, 2026 local time. This supersedes the gameplay-pending status in WARDEN_SIGNATURE_REHEARSAL.md and ART_NORMALIZATION_AND_MOTION.md. Their dated provenance and browser observations remain preserved.

The source game now offers **Soldier, Medic and Heavy**, **Hollow Constable and Lantern Warden**, Gatehouse, five-fight Practice and prototype Endless. Warden can be chosen as the opening boss on the Review screen. The remaining four classes, other routes/maps and fifty-eight boss identities are unfinished. The public Site remains the earlier two-class/protocol-4 deployment; this source continuation does not redeploy it.

## Warden gameplay

The same Game runs Warden offline and in authoritative Colyseus rooms. Its signature has a harmless 36-tick tell, a 55-degree cone rotating at 24 degrees/second for 120 ticks, then 120 rest ticks. Target aim locks for the tell and sweep. Rendering and body-radius collision use the same sector samples. The fixed ground projection is 55 world pixels from the boss feet; measured animated lantern points are visual attachments, rather than a moving collision source. Range, contact damage/interval and trailing-space width remain explicit candidate tuning in src/shared/warden-signature.ts.

Fan volleys and fire zones run during signature rest. At beam release, earlier hostile projectiles, zones and warnings extinguish so the marked trailing interior remains clear. Consequently an auxiliary zone may end before its standalone authored duration. This happens in authority and is replicated, rather than hiding a still-dangerous hazard in the client. Authored zone radius/duration and phase attack parameters now drive the shared controller.

Health thresholds open Accord objectives. Completing one interrupts the signature, gives the existing four-second stagger/vulnerability window, then starts a complete new warning. Brutal applies the authored health/damage/deadline/bounty scaling and its fourth phase adds a delayed second sweep. Internal boss-completion history makes an Endless repeat Brutal only after that identity has actually been defeated. Constable and Warden alternate in this limited two-boss pool; this is not the complete concealed no-repeat gauntlet system. Future identity stays absent from public contract cards, while server and Practice boundaries retain it.

Idle, attack, channel, hurt and defeat are bound to real encounter state. New three-frame hurt and eight-frame collapse sheets bring Warden to **27 drawn motion frames**. Casts retain their full warning/channel poses when hurt. Defeat advances on world ticks after combat time stops and holds its final pose. The padded collapse cell preserves the standing-calibrated scale and fixed horizontal ground origin; collapsed poses are not independently resized or recentered.

## Heavy gameplay

Heavy is available in new-run setup, room joining and the server/offline admission validators. Authored starting values are 140 HP, 190 px/s, a 45-round LMG, four compatible weapon tiers and 54 purchasable skill nodes. All nine Heavy specialization paths are exercised alongside Soldier and Medic paths.

| Action | Implemented behavior |
| --- | --- |
| Suppressing Cone / Q | Fourteen rounds, 45 total base damage, 220-pixel range, 12-second cooldown. Ordinary enemies move at 60% speed for three seconds; purchased suppression duration changes the real deadline. Bosses are immune to this ordinary-enemy slow. The candidate cone spread is 70 degrees. |
| Braced Firing / E | Five seconds of 45% base damage resistance, 30% additional fire rate and 60% movement; 18-second cooldown. Ability potency scales the bonus, resistance combines with purchased armor, and total resistance remains capped at 65%. |
| Foundry Overture / X | Six seconds, 70% additional fire rate, two extra pierces and no magazine consumption; 90-second cooldown. Movement is 65%. Casting cancels a reload; manual reload is ignored during overdrive. Purchased duration/potency/cooldown affect the real window. The strongest active movement penalty applies when E and X overlap. |

Heavy uses its authored LMG and ultimate sounds. Fractional fire deadlines support the actual 35-shots/second upper rate at a 30 Hz simulation, without accumulating shots while the trigger is released or reloading. Single-projectile weapons now use their seeded spread instead of always firing down the exact aim line.

Four eight-frame directional runs add **32 drawn motion frames**, with the original four distinct facing references used for idle. No opposite-facing runtime mirroring or reference-pose animation is used. One scale per action, measured foot translations and 320-pixel transparent padding keep the same world pixel scale as the 256-pixel idle references. Six generated Heavy natives are preserved: four selected movement candidates and two rejected west attempts. One crossed crop boundaries; another reversed facing in the second row. West v3 uses measured empty gutters rather than an unsafe equal-grid crop.

The bounded ordinary-enemy foundation supports pursuit, cover collision, contact intervals, health, expiry, a sixty-actor cap, actual hit credit, timed slows and piercing through distinct targets before a boss. It is server-owned and replicated. **Neither current boss spawns ordinary adds.** Ratcatcher spawning, ordinary-enemy artwork/presentation and its full encounter remain future work; the suppression interactions are verified in real shared-game/network fixtures.

## Protocol, saves and transport

Source protocol is **5**, with the same sealed authored-content fingerprint. Boss identity, casts/defeat, Heavy buffs and ordinary actors replicate to clients. Compatible protocol-4 local Soldier/Medic Practice boundaries migrate without mutating the received save or granting Warden completion history. Signed online boundaries remain strict; this is not an online downgrade path or deployed player recovery.

Projectile messages use binary batches. Each projectile keeps five exact float64 motion/identity values (40 bytes); common radius, damage, expiry, pierce and owner are stored once per contiguous wave. No projectile value is quantized. Session decodes these into the same Event objects used offline. Current-client, reconnect/ready delivery, owner-only friendly fire/sounds, malformed/truncated/nonfinite packet rejection and original network behavior are covered by the tests. Version-4 clients must not be paired with this server.

## Validation and its limits

`node tools/verify.mjs` passes **108 tests**, strict TypeScript, authored content/fifteen-locale checks and the production build. The tests include real Warden and Heavy two-client rooms, exact warning/contact/Accord/Brutal behavior, all 27 playable specialization paths, boundary migration, piercing, suppression, high-rate weapons and the binary transport. reviews/runtime-verification.json records the exact source snapshot and build hashes.

The independent art checks are tools/verify-production-art.py, tools/verify-warden-rehearsal.py, tools/verify-warden-combat-art.py and tools/verify-heavy-art.py. Receipts reconstruct all native RGBA pixels, compare packed pixels to documented transforms, verify hashes/clearance/timing/common scale, and retain older inputs unchanged. Warden and Heavy together have **59 motion frames**. Native/contact-sheet inspection is assistant evidence; **final rendered Phaser transitions, physical devices, human play and native-language acceptance remain open**. Heavy firing/hurt/dodge/downed clips and the broader survivor/boss action libraries are unfinished.

The current local pilot uses 17 Soldier, 17 Medic and 16 Heavy SDK clients, including inputs, votes and purchases. Its five-second Warden stress phase reaches 4,000 hostile projectiles. Initial stress p99 was 42.301 ms; a first binary candidate was 38.126 ms; the final compact-wave run was **23.521 ms p99**, **38.623 ms maximum**, with zero rendered clients. The normal-combat p99 was 9.549 ms. Exact reports are preserved under reviews/performance/protocol5-three-classes-*.json, including the failed and diagnostic runs. The final stress run sent 33,162,251 encoded outbound bytes across all clients, versus 61,128,611 in the initial run; real-time samples and spawned counts differ, so this is workload evidence rather than controlled causal attribution or endurance proof. Warden extinguishes earlier hostiles at signature release, so 4,000 is a measured peak, not a continuous-every-frame guarantee. No foreground FPS, WAN/free-host capacity or 49-scripted-plus-one-rendered pass is claimed.

Browser troubleshooting was not repeated. The existing public Site belongs to another ChatGPT account; keep its ID and audience. Its recorded frontend/gameplay identities are 33b36bc/dfade88 on protocol 4. Publishing these source changes to the feature branch and Wiki does not update that deployment. The PR remains draft and main remains protected.

## Continue development

Use this same existing local folder and read actual Git status/HEAD before edits. Continue the unfinished action libraries, next kit/boss and broader route/arena content; do not mistake a standalone art room for a completed playable encounter. Ratcatcher already has identity studies and can build on the ordinary-actor foundation. Tank/Mage/Engineer/Assassin remain locked until their kits are implemented. Keep the first-loop rendered/device/recovery/ranking/Windows release gates open with exact evidence, while progressing the already-authorized development scope.

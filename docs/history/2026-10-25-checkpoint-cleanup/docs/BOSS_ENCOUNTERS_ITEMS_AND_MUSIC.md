# Boss encounters, item illustration and individual themes

## Current source

Version 0.3.0, protocol 6. Soldier, Medic and Heavy fight Hollow Constable, Lantern Warden, Carrion Courier, Ratcatcher and Quarantine Clerk in Gatehouse. Review can select any opening boss. Practice now completes five encounters without repeating an identity. Concealed contract choices use uncleared identities first and saved RNG; after the complete implemented pool, Endless repeats become Brutal and avoid the immediately previous boss. This is the five-boss Practice subset, not the full authored campaign/finale library.

All five currently implemented bosses have authored minimum threat **1 (Normal)**. Encounter threat scales independently: Practice uses 1/3/5/8/10, Endless rises from 1 through 10. HUD and sealed contracts append **+** for Brutal, for example “Threat 3+ · Brutal”. Brutal remains a stronger version of the same identity: double boss HP/damage, four health phases, extended deadline/bounty, bounded readable telegraphs. It is not counted as another boss.

| New boss | Real signature and counterplay | Animation |
| --- | --- | --- |
| Carrion Courier | A locked straight charge lane, wall-clipped swept movement/contact, then a 32-pixel trail with locally expiring three-second segments. Crossing fans use separate locked origins. Step sideways after the lane locks. | Eight drawn anticipation/stride/braking poses; current action has one view. |
| Ratcatcher | Three warned lanes release four actual rats each, twelve alive maximum, 12 HP and 125 base speed. Rats follow their initial lane then pursue; cover, swept contact, damage, piercing and Heavy suppression execute. Shooting the outlined 65-HP sack cancels a pending/next pack, with delayed sack recovery. Brutal doubles sack/rat HP and damage scaling. | Eight sack-action poses and an eight-frame directly overhead rat run, rotated as a complete body. |
| Quarantine Clerk | Three separated numbered circles stamp at 0.65-second spacing after the warning. When III activates, I reopens as a full-body safe interior that absorbs hostile projectiles at its boundary. Damage/collision order remains swept; final Brutal phase adds delayed stamps while preserving I. | Eight actual stamp poses; Roman order marks and safe check remain visible without audio. |

All three use actual phase changes, deadlines, rewards, Accord cancellation/stagger, intermissions, saves and real Colyseus replication. Protocol 6 carries authoritative cues and field-patched ordinary actors; physics retains full-precision server values. Local protocol-4/5 Practice boundaries migrate with existing class/contract/history limits. Signed online saves remain strict. No active combat restore is introduced.

## Item artwork

**71 new transparent illustrations:** 12 playable weapon tiers, eight supplies, 27 specialization paths and 24 mutations. Together with the five existing upgrade paintings, all currently playable shop categories have artwork. The 162 playable skill nodes share their path's illustration and retain their distinct grade/purchase indicators; this is not a claim of 162 unique new paintings. Shop inspector, buttons, supply HUD and mutation votes use these assets with existing translated accessible names.

The art direction favors single practical objects, calm brass/iron/leather/canvas planes and clear silhouettes. Background-haze attempts were superseded; originals were retained. Exact prompts and portable reference copies: docs/encounter-item-art-2026-10-23.json. Twenty-five requests produced 23 preserved natives; two tool failures returned no image. Technical packing uses crop, proportional resize and padding, with one scale per action and measured anchors; no creative pixel repainting, background-removal algorithm or mirrored character animation was performed.

Runtime libraries: assets/production/items/library.json (71 items) and assets/production/motion/encounter-library.json (four clips, 32 frames). Together with the earlier Warden/Heavy clips there are 91 drawn production motion frames. Earlier class/action libraries remain preserved and unfinished states are still open.

## Individual boss themes

| Boss | Original theme | Tempo / meter | Character |
| --- | --- | --- | --- |
| Hollow Constable | Hollow Muster | 108 BPM / 4/4 | Low brass march, squared bass and clipped snare. |
| Lantern Warden | Last Light | 72 BPM / 3/4 | Sparse dark bells and slow bowed fifths. |
| Carrion Courier | Undelivered | 144 BPM / 4/4 | Running pizzicato eighths and syncopated rim taps. |
| Ratcatcher | Crooked Procession | 126 BPM / 7/8 | Lopsided reed phrase, plucked bass and dry wood taps. |
| Quarantine Clerk | Final Entry | 100 BPM / 5/4 | Prepared-key motif, a 3+2 stamping pulse and open gaps. |

Each is a separately composed sixteen-bar loop, not a transposition or speed change of the previous combat track. Editable scores, deterministic synthesis source, original PCM masters and hashes are retained in tools/compose-boss-themes.py and assets/production/audio/boss-themes/library.json. No external samples or paid music service. Music selects the current boss, crossfades over 0.75 seconds, returns to City Wake between fights and briefly ducks for warnings/major cues. Existing independent music/SFX volume controls remain. Decoded theme cache is bounded.

The five current themes have objective PCM, clipping, DC, mono and circular-boundary checks. Human listening, device playback, final perceived mix, phase-adaptive stems and themes for the 55 unimplemented bosses remain open. The local listening worksheet is assets/production/audio/boss-themes/preview.html.

## Verification and performance

Full verification: **124 passing rules/WebSocket/HTTP/SQL tests**, strict TypeScript, authored content/fifteen-locale validation and production build. reviews/runtime-verification.json binds the exact source and build. Coverage includes all five opening identities across multiple seeds, restored concealed votes, all new signatures and Brutal phases, real clients receiving actors/cues, 71 asset bindings, five music identities and retained suppression/collision behavior.

Independent pixel/native audit: reviews/encounter-items-2026-10-23/independent-audit.json; all 71 packed items and 32 frames match documented source transforms, and source partitions reconstruct complete RGBA natives. Prior production/Warden/Heavy audits still pass. Audio signal evidence: reviews/boss-themes-review.json. Static proofs and those audits do not establish rendered engine or human acceptance.

The first shared-process 50-SDK-client stress test measured about 60 ms p99; after adding twelve persistent rat fixtures, another measured about 90 ms. These failures and the CPU profile summary are preserved. Projectile collision now reuses vectors/query output and shares exact scalar sweep arithmetic. Actor field patches reduce complete-JSON retransmission. The final benchmark isolates the authoritative server and SDK clients into separate OS processes/heaps on the same computer. This is a different, more representative process layout, not an identical-condition before/after comparison.

Five-second normal/stress samples, 50 scripted clients, peak 4,000 hostiles:

| Encounter | Normal server p99 ms | Stress server p99 ms | Stress maximum ms | Peak rats |
| --- | --- | --- | --- | --- |
| ratcatcher | 10.875 | 30.356 | 49.551 | 12 |
| courier | 13.699 | 35.689 | 56.807 | 0 |
| quarantine-clerk | 14.658 | 34.760 | 71.857 | 0 |

Exact reports are reviews/performance/protocol6-*-final-isolated-2026-10-23.json. Rat load uses twelve 1e6-HP fixtures to keep actors alive; natural 12-HP summons have separate rule/network tests. Invulnerable players, extended boss HP and replenished bullets are throughput fixtures. Zero rendered clients; occasional maxima, shared-process spikes, WAN/free-host capacity, endurance, foreground FPS and physical 49+1 review remain open. Do not treat this as final 50-player release acceptance.

## Next development

Continue the authorized full implementation. Four classes and 55 boss identities remain; finish action/directional/hurt/defeat libraries, the actual route/finale gauntlets and arenas, and more varied boss themes as each identity becomes playable. The latest user prefers more grounded, less noisy item artwork. Preserve the reviewed identity anchors and all originals/prompts. Do not stop at standalone art; wire each accepted batch into actual combat/UI and verify it.

Keep draft PR 14 and protected main. Source/Wiki publication does not update the older protocol-4 public Site, which belongs to another ChatGPT account. Do not deploy a new backend against that old frontend. Browser permission troubleshooting must not be repeated. Rendered/device/controller/human/native-language/listening, live durable recovery/rankings/profiles and portable Windows/offline/LAN release gates stay open.
